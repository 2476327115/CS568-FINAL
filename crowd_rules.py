"""
Rule-based crowd prediction system using:
    data/tokyo_crowd_dataset.csv
"""

from __future__ import annotations

import argparse
import csv
import json
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class CrowdPrediction:
    crowd_score: float
    raw_score: int
    crowd_level: str
    rule_used: str
    support_count: int


WEEKDAY_TO_NUM = {
    "monday": 0,
    "tuesday": 1,
    "wednesday": 2,
    "thursday": 3,
    "friday": 4,
    "saturday": 5,
    "sunday": 6,
}


def crowd_level_from_score(score: float) -> str:
    if score < 0.35:
        return "low"
    if score < 0.65:
        return "medium"
    return "high"


def _to_int(v: str | int | None, default: int = 0) -> int:
    try:
        return int(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def _to_float(v: str | float | None, default: float = 0.0) -> float:
    try:
        return float(v)  # type: ignore[arg-type]
    except (TypeError, ValueError):
        return default


def load_rows(csv_path: str = "data/tokyo_crowd_dataset.csv") -> list[dict]:
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"Dataset not found: {csv_path}")
    with path.open("r", encoding="utf-8", newline="") as f:
        return list(csv.DictReader(f))


def _mean(values: list[float]) -> float:
    return sum(values) / len(values) if values else 0.0


def build_indices(rows: list[dict]) -> dict[str, dict[tuple, tuple[float, int]]]:
    """
    Build aggregated lookup tables.

    value tuple: (mean_crowd_score, support_count)
    """
    bucket: dict[str, defaultdict[tuple, list[float]]] = {
        "poi_weekday_hour": defaultdict(list),
        "category_weekday_hour": defaultdict(list),
        "category_hour": defaultdict(list),
        "indoor_weekday_hour": defaultdict(list),
        "weekday_hour": defaultdict(list),
        "category_global": defaultdict(list),
        "global": defaultdict(list),
    }

    for r in rows:
        poi = (r.get("poi_name") or "").strip()
        cat = (r.get("poi_category") or "").strip()
        indoor = _to_int(r.get("is_indoor"), 0)
        wd = _to_int(r.get("weekday_num"), -1)
        hr = _to_int(r.get("hour"), 0)
        score = _to_float(r.get("crowd_score"), 0.0)

        bucket["poi_weekday_hour"][(poi, wd, hr)].append(score)
        bucket["category_weekday_hour"][(cat, wd, hr)].append(score)
        bucket["category_hour"][(cat, hr)].append(score)
        bucket["indoor_weekday_hour"][(indoor, wd, hr)].append(score)
        bucket["weekday_hour"][(wd, hr)].append(score)
        bucket["category_global"][(cat,)].append(score)
        bucket["global"][("all",)].append(score)

    result: dict[str, dict[tuple, tuple[float, int]]] = {}
    for name, d in bucket.items():
        agg: dict[tuple, tuple[float, int]] = {}
        for k, vals in d.items():
            agg[k] = (round(_mean(vals), 4), len(vals))
        result[name] = agg
    return result


def predict_crowd(
    indices: dict[str, dict[tuple, tuple[float, int]]],
    poi_name: str | None,
    poi_category: str,
    is_indoor: int,
    weekday_num: int,
    hour: int,
) -> CrowdPrediction:
    poi = (poi_name or "").strip()
    cat = poi_category.strip()

    lookup_chain = [
        ("poi_weekday_hour", (poi, weekday_num, hour), "exact_poi_weekday_hour"),
        (
            "category_weekday_hour",
            (cat, weekday_num, hour),
            "category_weekday_hour",
        ),
        ("category_hour", (cat, hour), "category_hour"),
        (
            "indoor_weekday_hour",
            (is_indoor, weekday_num, hour),
            "indoor_weekday_hour",
        ),
        ("weekday_hour", (weekday_num, hour), "weekday_hour"),
        ("category_global", (cat,), "category_global"),
        ("global", ("all",), "global_default"),
    ]

    for table_name, key, rule_used in lookup_chain:
        table = indices.get(table_name, {})
        if key in table:
            score, support = table[key]
            raw = int(round(score * 100))
            return CrowdPrediction(
                crowd_score=score,
                raw_score=raw,
                crowd_level=crowd_level_from_score(score),
                rule_used=rule_used,
                support_count=support,
            )

    return CrowdPrediction(
        crowd_score=0.5,
        raw_score=50,
        crowd_level="medium",
        rule_used="hardcoded_fallback",
        support_count=0,
    )


def parse_weekday_num(weekday: str | None, weekday_num: int | None) -> int:
    if weekday_num is not None:
        return weekday_num
    if weekday is None:
        raise ValueError("Provide either --weekday or --weekday-num.")
    key = weekday.strip().lower()
    if key not in WEEKDAY_TO_NUM:
        raise ValueError(f"Invalid weekday: {weekday}")
    return WEEKDAY_TO_NUM[key]


def dataset_summary(rows: list[dict]) -> dict:
    categories = sorted({(r.get("poi_category") or "").strip() for r in rows})
    pois = {(r.get("poi_name") or "").strip() for r in rows}
    return {
        "rows": len(rows),
        "num_categories": len(categories),
        "categories": categories,
        "num_pois": len(pois),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Rule-based crowd prediction from tokyo_crowd_dataset.csv"
    )
    parser.add_argument("--csv", default="data/tokyo_crowd_dataset.csv")
    parser.add_argument("--poi-name", default=None)
    parser.add_argument("--poi-category", required=False)
    parser.add_argument("--is-indoor", type=int, choices=[0, 1], default=0)
    parser.add_argument("--weekday", default=None)
    parser.add_argument("--weekday-num", type=int, choices=list(range(7)), default=None)
    parser.add_argument("--hour", type=int, choices=list(range(24)), default=None)
    parser.add_argument("--summary", action="store_true")
    args = parser.parse_args()

    rows = load_rows(args.csv)
    if args.summary:
        print(json.dumps(dataset_summary(rows), indent=2))
        return

    if args.poi_category is None or args.hour is None:
        raise SystemExit(
            "Prediction requires: --poi-category, --hour, and one of --weekday/--weekday-num."
        )

    wd_num = parse_weekday_num(args.weekday, args.weekday_num)
    indices = build_indices(rows)
    pred = predict_crowd(
        indices=indices,
        poi_name=args.poi_name,
        poi_category=args.poi_category,
        is_indoor=args.is_indoor,
        weekday_num=wd_num,
        hour=args.hour,
    )

    payload = {
        "input": {
            "poi_name": args.poi_name,
            "poi_category": args.poi_category,
            "is_indoor": args.is_indoor,
            "weekday_num": wd_num,
            "hour": args.hour,
        },
        "prediction": pred.__dict__,
    }
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
