"""
Flask web app for the Tokyo itinerary planner.

Routes:
  GET  /            → index.html
  GET  /api/pois    → list of all POIs with coordinates
  POST /api/generate → greedy itinerary from selected POIs
"""

from __future__ import annotations

import os
import sys
from flask import Flask, render_template, jsonify, request

sys.path.insert(0, os.path.dirname(__file__))

from weather_rules import classify_weather

app = Flask(__name__)

# ── POI catalog ───────────────────────────────────────────────────────────────
# category, is_indoor, lat, lng for every POI in the crowd dataset

POIS: dict[str, dict] = {
    "teamLab Planets TOKYO DMM":          {"category": "museum",        "is_indoor": 1, "lat": 35.6464, "lng": 139.7855},
    "National Museum of Nature and Science": {"category": "museum",     "is_indoor": 1, "lat": 35.7165, "lng": 139.7745},
    "Zojo-ji Temple":                     {"category": "shrine",        "is_indoor": 0, "lat": 35.6583, "lng": 139.7456},
    "Yasukuni Shrine":                    {"category": "shrine",        "is_indoor": 0, "lat": 35.6938, "lng": 139.7434},
    "Nezu Shrine":                        {"category": "shrine",        "is_indoor": 0, "lat": 35.7202, "lng": 139.7624},
    "Tokyo Skytree":                      {"category": "viewpoint",     "is_indoor": 1, "lat": 35.7101, "lng": 139.8107},
    "Tokyo Tower":                        {"category": "viewpoint",     "is_indoor": 1, "lat": 35.6586, "lng": 139.7454},
    "Shibuya Sky":                        {"category": "viewpoint",     "is_indoor": 1, "lat": 35.6584, "lng": 139.7022},
    "Shinjuku Gyoen National Garden":     {"category": "park",          "is_indoor": 0, "lat": 35.6852, "lng": 139.7100},
    "Ueno Park":                          {"category": "park",          "is_indoor": 0, "lat": 35.7155, "lng": 139.7734},
    "Yoyogi Park":                        {"category": "park",          "is_indoor": 0, "lat": 35.6717, "lng": 139.6942},
    "Hibiya Park":                        {"category": "park",          "is_indoor": 0, "lat": 35.6737, "lng": 139.7576},
    "Inokashira Park":                    {"category": "park",          "is_indoor": 0, "lat": 35.6997, "lng": 139.5838},
    "GINZA SIX":                          {"category": "shopping_area", "is_indoor": 1, "lat": 35.6709, "lng": 139.7653},
    "DECKS Tokyo Beach":                  {"category": "shopping_area", "is_indoor": 1, "lat": 35.6271, "lng": 139.7747},
    "Sunshine 60":                        {"category": "amusement_park","is_indoor": 1, "lat": 35.7293, "lng": 139.7186},
}

# ── Model loading (lazy, with auto-train fallback) ────────────────────────────

_model_artifact: dict | None = None

def _get_model() -> dict | None:
    global _model_artifact
    if _model_artifact is not None:
        return _model_artifact
    model_path = os.path.join(os.path.dirname(__file__), "crowd_model.pkl")
    if not os.path.exists(model_path):
        print("crowd_model.pkl not found — training now (one-time, ~10 s)...")
        from crowd_model import train
        train(model_path=model_path)
        print("Training complete.")
    from crowd_model import load_model
    _model_artifact = load_model(model_path)
    return _model_artifact


# ── Utility scoring ───────────────────────────────────────────────────────────

_TIME_MATCH_REASONS: dict[str, dict] = {
    "viewpoint":     {(17, 19): "ideal for golden-hour views"},
    "museum":        {(9, 11):  "quieter in the morning"},
    "shrine":        {(8, 10):  "peaceful in the early morning"},
    "park":          {(9, 11):  "cooler in the morning"},
    "shopping_area": {(11, 14): "good for a midday browse"},
    "amusement_park":{(10, 12): "shorter queues early in the day"},
}

_TIME_MATCH_BONUS: dict[str, tuple[tuple[int, int], float]] = {
    "viewpoint":     ((17, 19),  0.30),
    "museum":        ((9, 11),   0.20),
    "shrine":        ((8, 10),   0.15),
    "park":          ((11, 14), -0.20),  # penalty for midday heat
    "shopping_area": ((11, 14),  0.10),
    "amusement_park":((10, 12),  0.10),
}


def _crowd_score(poi_name: str, poi: dict, hour: int, weekday_num: int) -> float:
    try:
        artifact = _get_model()
        from crowd_model import predict as ml_predict
        pred = ml_predict(artifact, poi["category"], poi["is_indoor"], weekday_num, hour)
        return pred.crowd_score
    except Exception:
        # Fallback to rule-based system
        try:
            from crowd_rules import load_rows, build_indices, predict_crowd
            rows = load_rows()
            indices = build_indices(rows)
            pred = predict_crowd(indices, poi_name, poi["category"], poi["is_indoor"], weekday_num, hour)
            return pred.crowd_score
        except Exception:
            return 0.5


def _utility(poi_name: str, poi: dict, hour: int, weekday_num: int, weather_rec: str) -> tuple[float, str]:
    crowd = _crowd_score(poi_name, poi, hour, weekday_num)
    utility = 1.0 - crowd

    reasons: list[str] = []

    # Weather adjustment
    if weather_rec == "indoor_preferred" and not poi["is_indoor"]:
        utility -= 0.30
        reasons.append("moved earlier/later to avoid bad weather")
    elif weather_rec == "outdoor_preferred" and poi["is_indoor"]:
        utility -= 0.05

    # Time-match bonus/penalty
    cat = poi["category"]
    if cat in _TIME_MATCH_BONUS:
        (lo, hi), delta = _TIME_MATCH_BONUS[cat]
        if lo <= hour <= hi:
            utility += delta
            if delta > 0 and cat in _TIME_MATCH_REASONS:
                for (rlo, rhi), reason in _TIME_MATCH_REASONS[cat].items():
                    if rlo <= hour <= rhi:
                        reasons.append(reason)

    # Build explanation
    crowd_label = "low" if crowd < 0.35 else ("medium" if crowd < 0.65 else "high")
    if not reasons:
        reasons.append(f"{crowd_label} crowd expected")
    explanation = "; ".join(reasons).capitalize()

    return utility, explanation


# ── Greedy scheduler ──────────────────────────────────────────────────────────

SCHEDULE_START = 9   # 9 am
SCHEDULE_END   = 21  # last slot starts at 20 (20:00–21:00)


def _greedy_schedule(
    selected: list[str],
    weekday_num: int,
    weather_rec: str,
) -> list[dict]:
    candidates: list[tuple[float, str, int, str]] = []
    for poi_name in selected:
        poi = POIS.get(poi_name)
        if not poi:
            continue
        for hour in range(SCHEDULE_START, SCHEDULE_END):
            score, explanation = _utility(poi_name, poi, hour, weekday_num, weather_rec)
            candidates.append((score, poi_name, hour, explanation))

    candidates.sort(key=lambda x: -x[0])

    assigned: set[str] = set()
    occupied: set[int] = set()
    schedule: list[dict] = []

    for score, poi_name, hour, explanation in candidates:
        if poi_name not in assigned and hour not in occupied:
            poi = POIS[poi_name]
            schedule.append({
                "hour":        hour,
                "time_label":  f"{hour}:00–{hour + 1}:00",
                "poi":         poi_name,
                "category":    poi["category"],
                "is_indoor":   poi["is_indoor"],
                "utility":     round(score, 3),
                "explanation": explanation,
            })
            assigned.add(poi_name)
            occupied.add(hour)

    schedule.sort(key=lambda x: x["hour"])
    return schedule


# ── Routes ────────────────────────────────────────────────────────────────────

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/pois")
def get_pois():
    return jsonify(POIS)


@app.route("/api/generate", methods=["POST"])
def generate():
    data = request.get_json(force=True)
    selected: list[str] = data.get("pois", [])
    weekday_num: int    = int(data.get("weekday_num", 1))  # default Monday
    weather: dict       = data.get("weather", {})

    if not selected:
        return jsonify({"error": "No POIs selected."}), 400

    temp     = weather.get("temp")
    humidity = weather.get("humidity")
    pressure = weather.get("pressure")

    weather_result = classify_weather(
        float(temp)     if temp     not in (None, "") else None,
        float(humidity) if humidity not in (None, "") else None,
        float(pressure) if pressure not in (None, "") else None,
    )
    weather_rec = weather_result["recommendation"]

    schedule = _greedy_schedule(selected, weekday_num, weather_rec)

    return jsonify({
        "schedule": schedule,
        "weather":  weather_result,
    })


if __name__ == "__main__":
    app.run(debug=True, port=5001)
