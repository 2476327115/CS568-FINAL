"""
Flask web app for the Tokyo itinerary planner.

Routes:
  GET  /             -> index.html
  GET  /api/pois     -> list of all POIs with coordinates
  POST /api/generate -> AI-agent itinerary recommendation
"""

from __future__ import annotations

import csv
import json
from datetime import date, timedelta
from pathlib import Path

from flask import Flask, jsonify, render_template, request

from forecast_weather import get_tokyo_forecast
from itinerary_agent import recommend_itinerary

app = Flask(__name__)

# category, is_indoor, lat, lng for every POI in the crowd dataset
POIS: dict[str, dict] = {
    "teamLab Planets TOKYO DMM": {"category": "museum", "is_indoor": 1, "lat": 35.6464, "lng": 139.7855},
    "National Museum of Nature and Science": {"category": "museum", "is_indoor": 1, "lat": 35.7165, "lng": 139.7745},
    "Zojo-ji Temple": {"category": "shrine", "is_indoor": 0, "lat": 35.6583, "lng": 139.7456},
    "Yasukuni Shrine": {"category": "shrine", "is_indoor": 0, "lat": 35.6938, "lng": 139.7434},
    "Nezu Shrine": {"category": "shrine", "is_indoor": 0, "lat": 35.7202, "lng": 139.7624},
    "Tokyo Skytree": {"category": "viewpoint", "is_indoor": 1, "lat": 35.7101, "lng": 139.8107},
    "Tokyo Tower": {"category": "viewpoint", "is_indoor": 1, "lat": 35.6586, "lng": 139.7454},
    "Shibuya Sky": {"category": "viewpoint", "is_indoor": 1, "lat": 35.6584, "lng": 139.7022},
    "Shinjuku Gyoen National Garden": {"category": "park", "is_indoor": 0, "lat": 35.6852, "lng": 139.7100},
    "Ueno Park": {"category": "park", "is_indoor": 0, "lat": 35.7155, "lng": 139.7734},
    "Yoyogi Park": {"category": "park", "is_indoor": 0, "lat": 35.6717, "lng": 139.6942},
    "Hibiya Park": {"category": "park", "is_indoor": 0, "lat": 35.6737, "lng": 139.7576},
    "Inokashira Park": {"category": "park", "is_indoor": 0, "lat": 35.6997, "lng": 139.5838},
    "GINZA SIX": {"category": "shopping_area", "is_indoor": 1, "lat": 35.6709, "lng": 139.7653},
    "DECKS Tokyo Beach": {"category": "shopping_area", "is_indoor": 1, "lat": 35.6271, "lng": 139.7747},
    "Sunshine 60": {"category": "amusement_park", "is_indoor": 1, "lat": 35.7293, "lng": 139.7186},
}


def _enrich_pois() -> None:
    raw_path = Path("data/tokyo_poi_raw.json")
    crowd_path = Path("data/tokyo_crowd_dataset.csv")

    if raw_path.exists():
        try:
            raw = json.loads(raw_path.read_text(encoding="utf-8"))
            by_name = {r.get("name"): r for r in raw if r.get("name")}
            for name, poi in POIS.items():
                rec = by_name.get(name)
                if not rec:
                    continue
                poi["photo"] = rec.get("photo")
                poi["address"] = rec.get("address")
        except Exception:
            pass

    if crowd_path.exists():
        try:
            sums: dict[str, dict[int, float]] = {}
            counts: dict[str, dict[int, int]] = {}
            with crowd_path.open("r", encoding="utf-8", newline="") as f:
                reader = csv.DictReader(f)
                for row in reader:
                    name = row.get("poi_name")
                    if name not in POIS:
                        continue
                    hour = int(row.get("hour", 0))
                    score = float(row.get("crowd_score", 0))
                    sums.setdefault(name, {}).setdefault(hour, 0.0)
                    counts.setdefault(name, {}).setdefault(hour, 0)
                    sums[name][hour] += score
                    counts[name][hour] += 1
            for name in POIS:
                if name not in sums:
                    continue
                best_h = None
                best_avg = -1.0
                for h, total in sums[name].items():
                    avg = total / counts[name][h]
                    if avg > best_avg:
                        best_avg = avg
                        best_h = h
                if best_h is not None:
                    POIS[name]["peak_hour"] = int(best_h)
        except Exception:
            pass


_enrich_pois()


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
    weekday_num: int = int(data.get("weekday_num", 1))
    weather: dict = data.get("weather", {})
    visit_date: str | None = data.get("visit_date")

    if not selected:
        return jsonify({"error": "No POIs selected."}), 400

    temp = weather.get("temp")
    humidity = weather.get("humidity")
    pressure = weather.get("pressure")
    forecast = None
    if visit_date:
        try:
            forecast = get_tokyo_forecast(visit_date)
        except Exception:
            forecast = None

    result = recommend_itinerary(
        selected_pois=selected,
        poi_catalog=POIS,
        weekday_num=weekday_num,
        temperature_c=float(temp) if temp not in (None, "") else None,
        humidity_pct=float(humidity) if humidity not in (None, "") else None,
        pressure_hpa=float(pressure) if pressure not in (None, "") else None,
        forecast=forecast,
    )
    return jsonify(result)


@app.route("/api/forecast")
def forecast():
    date_str = request.args.get("date")
    if not date_str:
        return jsonify({"error": "Missing required query param: date (YYYY-MM-DD)"}), 400
    try:
        return jsonify(get_tokyo_forecast(date_str))
    except Exception as e:
        return jsonify({"error": f"Forecast fetch failed: {e}"}), 502


@app.route("/api/forecast-window")
def forecast_window():
    start = date.today()
    end = start + timedelta(days=15)
    return jsonify(
        {
            "supported_start": start.isoformat(),
            "supported_end": end.isoformat(),
            "notes": "Dates inside this range have forecast support.",
        }
    )


if __name__ == "__main__":
    app.run(debug=True, port=5001)
