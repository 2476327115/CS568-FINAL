"""
XGBoost crowd prediction model for Tokyo POIs.

Features : hour, weekday_num, poi_category (ordinal), is_indoor, is_weekend, is_holiday
Target   : crowd_score (0.0–1.0)

Usage
-----
Train and save:
    python crowd_model.py --train

Predict:
    python crowd_model.py --poi-category park --is-indoor 0 --weekday saturday --hour 14

Ablation (weight comparison):
    python crowd_model.py --train --ablation
"""

from __future__ import annotations

import argparse
import json
import math
import pickle
import csv
from dataclasses import dataclass
from pathlib import Path

import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.metrics import mean_squared_error, mean_absolute_error, r2_score
from sklearn.preprocessing import OrdinalEncoder
import xgboost as xgb


# ── Constants ─────────────────────────────────────────────────────────────────

MODEL_PATH = "crowd_model.pkl"
DATA_PATH  = "data/tokyo_crowd_dataset.csv"

CATEGORIES = [
    "museum", "shrine", "viewpoint", "park",
    "shopping_area", "market", "amusement_park",
]

WEEKDAY_TO_NUM = {
    "monday": 0, "tuesday": 1, "wednesday": 2, "thursday": 3,
    "friday": 4, "saturday": 5, "sunday": 6,
}

# Japan national holidays 2025–2026 (YYYY-MM-DD)
JAPAN_HOLIDAYS = {
    "2025-01-01", "2025-01-13", "2025-02-11", "2025-02-23", "2025-02-24",
    "2025-03-20", "2025-04-29", "2025-05-03", "2025-05-04", "2025-05-05",
    "2025-05-06", "2025-07-21", "2025-08-11", "2025-09-15", "2025-09-23",
    "2025-10-13", "2025-11-03", "2025-11-23", "2025-11-24",
    "2026-01-01", "2026-01-12", "2026-02-11", "2026-02-23",
    "2026-03-20", "2026-04-29", "2026-05-03", "2026-05-04", "2026-05-05",
    "2026-05-06", "2026-07-20", "2026-08-11", "2026-09-21", "2026-09-22",
    "2026-09-23", "2026-10-12", "2026-11-03", "2026-11-23",
}


def is_holiday(date_str: str) -> int:
    """Return 1 if date_str ('YYYY-MM-DD') is a Japanese national holiday."""
    return int(date_str in JAPAN_HOLIDAYS)


# ── Feature engineering ───────────────────────────────────────────────────────

def _cyclic(value: float, period: float) -> tuple[float, float]:
    rad = 2 * math.pi * value / period
    return math.sin(rad), math.cos(rad)


def build_features(
    poi_category: str,
    is_indoor: int,
    weekday_num: int,
    hour: int,
    is_holiday_flag: int,
    category_encoder: OrdinalEncoder,
) -> np.ndarray:
    """
    Construct a 1-D feature vector for a single (category, indoor, weekday, hour, holiday) input.

    Features (10 total):
      cat_enc          ordinal-encoded category
      is_indoor        0/1
      is_weekend       0/1
      is_holiday       0/1
      hour             raw 0–23
      hour_sin/cos     cyclic hour encoding
      weekday_num      raw 0–6
      weekday_sin/cos  cyclic weekday encoding
    """
    cat = category_encoder.transform([[poi_category]])[0][0]
    is_weekend = int(weekday_num >= 5)
    h_sin, h_cos = _cyclic(hour, 24)
    wd_sin, wd_cos = _cyclic(weekday_num, 7)

    return np.array([
        cat,
        is_indoor,
        is_weekend,
        is_holiday_flag,
        hour,
        h_sin, h_cos,
        weekday_num,
        wd_sin, wd_cos,
    ], dtype=np.float32)


def build_feature_matrix(rows: list[dict], encoder: OrdinalEncoder) -> np.ndarray:
    return np.vstack([
        build_features(
            poi_category    = r["poi_category"],
            is_indoor       = int(r["is_indoor"]),
            weekday_num     = int(r["weekday_num"]),
            hour            = int(r["hour"]),
            is_holiday_flag = 0,   # training data has no date — treated as non-holiday
            category_encoder= encoder,
        )
        for r in rows
    ])


# ── Training ──────────────────────────────────────────────────────────────────

@dataclass
class TrainResult:
    rmse: float
    mae: float
    r2: float
    feature_importance: dict[str, float]


FEATURE_NAMES = [
    "cat_enc", "is_indoor", "is_weekend", "is_holiday",
    "hour", "hour_sin", "hour_cos",
    "weekday_num", "weekday_sin", "weekday_cos",
]


def train(
    csv_path: str = DATA_PATH,
    model_path: str = MODEL_PATH,
    test_size: float = 0.2,
    random_state: int = 42,
) -> TrainResult:
    rows = _load_csv(csv_path)
    y = np.array([float(r["crowd_score"]) for r in rows], dtype=np.float32)

    encoder = OrdinalEncoder(
        categories=[CATEGORIES],
        handle_unknown="use_encoded_value",
        unknown_value=len(CATEGORIES),
    )
    encoder.fit([[c] for c in CATEGORIES])
    X = build_feature_matrix(rows, encoder)

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=test_size, random_state=random_state
    )

    model = xgb.XGBRegressor(
        n_estimators=300,
        max_depth=6,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=5,
        reg_alpha=0.1,
        reg_lambda=1.0,
        objective="reg:squarederror",
        random_state=random_state,
        n_jobs=-1,
    )
    model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

    y_pred = np.clip(model.predict(X_test), 0.0, 1.0)
    rmse = math.sqrt(mean_squared_error(y_test, y_pred))
    mae  = mean_absolute_error(y_test, y_pred)
    r2   = r2_score(y_test, y_pred)

    importances = dict(zip(FEATURE_NAMES, model.feature_importances_.tolist()))

    # Save model + encoder together
    with open(model_path, "wb") as f:
        pickle.dump({"model": model, "encoder": encoder}, f)

    return TrainResult(
        rmse=round(rmse, 4),
        mae=round(mae, 4),
        r2=round(r2, 4),
        feature_importance={k: round(v, 4) for k, v in
                            sorted(importances.items(), key=lambda x: -x[1])},
    )


# ── Inference ─────────────────────────────────────────────────────────────────

@dataclass
class CrowdPrediction:
    crowd_score: float
    raw_score: int
    crowd_level: str


def _crowd_level(score: float) -> str:
    if score < 0.35:
        return "low"
    if score < 0.65:
        return "medium"
    return "high"


def load_model(model_path: str = MODEL_PATH) -> dict:
    with open(model_path, "rb") as f:
        return pickle.load(f)


def predict(
    artifact: dict,
    poi_category: str,
    is_indoor: int,
    weekday_num: int,
    hour: int,
    is_holiday_flag: int = 0,
) -> CrowdPrediction:
    model: xgb.XGBRegressor = artifact["model"]
    encoder: OrdinalEncoder  = artifact["encoder"]

    x = build_features(poi_category, is_indoor, weekday_num, hour, is_holiday_flag, encoder)
    score = float(np.clip(model.predict(x.reshape(1, -1))[0], 0.0, 1.0))

    return CrowdPrediction(
        crowd_score=round(score, 4),
        raw_score=int(round(score * 100)),
        crowd_level=_crowd_level(score),
    )


# ── Ablation study ────────────────────────────────────────────────────────────

def ablation_study(csv_path: str = DATA_PATH) -> list[dict]:
    """
    Train models with different feature subsets and compare RMSE / R².
    Returns a list of result dicts sorted by RMSE ascending.
    """
    rows = _load_csv(csv_path)
    y    = np.array([float(r["crowd_score"]) for r in rows], dtype=np.float32)

    encoder = OrdinalEncoder(
        categories=[CATEGORIES],
        handle_unknown="use_encoded_value",
        unknown_value=len(CATEGORIES),
    )
    encoder.fit([[c] for c in CATEGORIES])
    X_full = build_feature_matrix(rows, encoder)

    X_train, X_test, y_train, y_test = train_test_split(
        X_full, y, test_size=0.2, random_state=42
    )

    # Column indices per feature name
    idx = {name: i for i, name in enumerate(FEATURE_NAMES)}

    subsets = {
        "hour_only":           [idx["hour"]],
        "hour+weekday":        [idx["hour"], idx["weekday_num"]],
        "hour+category":       [idx["hour"], idx["cat_enc"]],
        "hour+weekday+cat":    [idx["hour"], idx["weekday_num"], idx["cat_enc"]],
        "all_raw":             [idx["hour"], idx["weekday_num"], idx["cat_enc"],
                                idx["is_indoor"], idx["is_weekend"]],
        "all_features":        list(range(len(FEATURE_NAMES))),
    }

    results = []
    for name, cols in subsets.items():
        Xtr = X_train[:, cols]
        Xte = X_test[:, cols]
        m = xgb.XGBRegressor(
            n_estimators=300, max_depth=6, learning_rate=0.05,
            subsample=0.8, random_state=42, n_jobs=-1,
        )
        m.fit(Xtr, y_train, verbose=False)
        yp = np.clip(m.predict(Xte), 0.0, 1.0)
        results.append({
            "feature_set": name,
            "features":    [FEATURE_NAMES[c] for c in cols],
            "rmse":        round(math.sqrt(mean_squared_error(y_test, yp)), 4),
            "mae":         round(mean_absolute_error(y_test, yp), 4),
            "r2":          round(r2_score(y_test, yp), 4),
        })

    return sorted(results, key=lambda r: r["rmse"])


# ── Helpers ───────────────────────────────────────────────────────────────────

def _load_csv(path: str) -> list[dict]:
    p = Path(path)
    if not p.exists():
        raise FileNotFoundError(f"Dataset not found: {path}")
    with p.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _parse_weekday(weekday: str | None, weekday_num: int | None) -> int:
    if weekday_num is not None:
        return weekday_num
    if weekday is None:
        raise ValueError("Provide --weekday or --weekday-num.")
    key = weekday.strip().lower()
    if key not in WEEKDAY_TO_NUM:
        raise ValueError(f"Unknown weekday: {weekday!r}")
    return WEEKDAY_TO_NUM[key]


# ── CLI ───────────────────────────────────────────────────────────────────────

def main() -> None:
    parser = argparse.ArgumentParser(description="XGBoost crowd prediction model")
    parser.add_argument("--train",       action="store_true", help="Train and save model")
    parser.add_argument("--ablation",    action="store_true", help="Run ablation study after training")
    parser.add_argument("--csv",         default=DATA_PATH)
    parser.add_argument("--model",       default=MODEL_PATH)
    parser.add_argument("--poi-category", default=None)
    parser.add_argument("--is-indoor",   type=int, choices=[0, 1], default=0)
    parser.add_argument("--weekday",     default=None)
    parser.add_argument("--weekday-num", type=int, choices=list(range(7)), default=None)
    parser.add_argument("--hour",        type=int, choices=list(range(24)), default=None)
    parser.add_argument("--is-holiday",  type=int, choices=[0, 1], default=0)
    args = parser.parse_args()

    if args.train:
        print("Training XGBoost crowd model...")
        result = train(csv_path=args.csv, model_path=args.model)
        print(json.dumps({
            "model_path":  args.model,
            "rmse":        result.rmse,
            "mae":         result.mae,
            "r2":          result.r2,
            "top_features": dict(list(result.feature_importance.items())[:5]),
        }, indent=2))

        if args.ablation:
            print("\nRunning ablation study...")
            ab = ablation_study(csv_path=args.csv)
            print(json.dumps(ab, indent=2))
        return

    if args.ablation and not args.train:
        print("Running ablation study...")
        ab = ablation_study(csv_path=args.csv)
        print(json.dumps(ab, indent=2))
        return

    # Predict mode
    if args.poi_category is None or args.hour is None:
        raise SystemExit("Prediction requires: --poi-category, --hour, and --weekday or --weekday-num.")

    wd_num = _parse_weekday(args.weekday, getattr(args, "weekday_num", None))
    artifact = load_model(args.model)
    pred = predict(
        artifact,
        poi_category    = args.poi_category,
        is_indoor       = args.is_indoor,
        weekday_num     = wd_num,
        hour            = args.hour,
        is_holiday_flag = args.is_holiday,
    )
    print(json.dumps({
        "input": {
            "poi_category": args.poi_category,
            "is_indoor":    args.is_indoor,
            "weekday_num":  wd_num,
            "hour":         args.hour,
            "is_holiday":   args.is_holiday,
        },
        "prediction": {
            "crowd_score": pred.crowd_score,
            "raw_score":   pred.raw_score,
            "crowd_level": pred.crowd_level,
        },
    }, indent=2))


if __name__ == "__main__":
    main()
