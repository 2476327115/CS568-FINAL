"""
AI-style itinerary recommendation agent.

This module recommends visit order and time slots using:
- Crowd estimates from crowd_rules.py
- Weather recommendation from weather_rules.py
- Distance-aware ordering to reduce zig-zag travel
"""

from __future__ import annotations

import math
from dataclasses import dataclass
from datetime import datetime

from crowd_rules import build_indices, load_rows, predict_crowd
from weather_rules import classify_weather


SCHEDULE_START = 9
SCHEDULE_END = 21  # last start time = 20:00

_CROWD_ROWS = None
_CROWD_INDICES = None


@dataclass(frozen=True)
class AgentStop:
    poi: str
    hour: int
    time_label: str
    category: str
    is_indoor: int
    utility: float
    crowd_score: float
    crowd_rule_used: str
    travel_km_from_prev: float
    explanation: str


def _get_crowd_indices():
    global _CROWD_ROWS, _CROWD_INDICES
    if _CROWD_INDICES is None:
        _CROWD_ROWS = load_rows("data/tokyo_crowd_dataset.csv")
        _CROWD_INDICES = build_indices(_CROWD_ROWS)
    return _CROWD_INDICES


def _haversine_km(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    r = 6371.0
    p1 = math.radians(lat1)
    p2 = math.radians(lat2)
    dp = math.radians(lat2 - lat1)
    dl = math.radians(lon2 - lon1)
    a = math.sin(dp / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dl / 2) ** 2
    return 2 * r * math.asin(math.sqrt(a))


def _time_bonus(category: str, hour: int) -> float:
    if category == "viewpoint" and 17 <= hour <= 19:
        return 0.30
    if category == "museum" and 9 <= hour <= 11:
        return 0.20
    if category == "shrine" and 8 <= hour <= 10:
        return 0.15
    if category == "park" and 11 <= hour <= 14:
        return -0.20
    if category == "shopping_area" and 11 <= hour <= 14:
        return 0.10
    if category == "amusement_park" and 10 <= hour <= 12:
        return 0.10
    return 0.0


def _weather_adjustment(weather_rec: str, is_indoor: int) -> float:
    if weather_rec == "indoor_preferred" and not is_indoor:
        return -0.30
    if weather_rec == "outdoor_preferred" and is_indoor:
        return -0.05
    return 0.0


def _forecast_adjustment(
    poi: dict, hour: int, forecast: dict | None
) -> tuple[float, list[str]]:
    if not forecast:
        return 0.0, []
    daily = forecast.get("daily", {})
    adj = 0.0
    reasons: list[str] = []

    is_indoor = int(poi["is_indoor"])
    cat = poi["category"]
    wind = daily.get("wind_max_kmh")
    precip = daily.get("precipitation_probability_max")
    temp_max = daily.get("temperature_max_c")
    sunset = daily.get("sunset")

    if wind is not None and wind >= 30 and not is_indoor:
        adj -= 0.18
        reasons.append("high wind penalty")
    if precip is not None and precip >= 60 and not is_indoor:
        adj -= 0.22
        reasons.append("rain risk penalty")
    if temp_max is not None and temp_max >= 31 and not is_indoor:
        adj -= 0.15
        reasons.append("hot-day outdoor penalty")

    if sunset and cat == "viewpoint":
        try:
            sunset_hour = datetime.fromisoformat(sunset).hour
            if abs(hour - sunset_hour) <= 1:
                adj += 0.25
                reasons.append("sunset view bonus")
        except ValueError:
            pass

    return adj, reasons


def recommend_itinerary(
    selected_pois: list[str],
    poi_catalog: dict[str, dict],
    weekday_num: int,
    temperature_c: float | None,
    humidity_pct: float | None,
    pressure_hpa: float | None,
    forecast: dict | None = None,
) -> dict:
    weather_result = classify_weather(temperature_c, humidity_pct, pressure_hpa)
    weather_rec = weather_result["recommendation"]
    crowd_indices = _get_crowd_indices()

    remaining = [name for name in selected_pois if name in poi_catalog]
    if not remaining:
        return {
            "agent": "itinerary_agent_v1",
            "weather": weather_result,
            "schedule": [],
            "summary": "No valid POIs found in selection.",
        }

    free_hours = list(range(SCHEDULE_START, min(SCHEDULE_END, SCHEDULE_START + len(remaining))))
    schedule: list[AgentStop] = []
    prev_poi = None

    for hour in free_hours:
        best_choice = None
        best_score = -10**9
        best_parts = None

        for poi_name in remaining:
            poi = poi_catalog[poi_name]
            crowd_pred = predict_crowd(
                indices=crowd_indices,
                poi_name=poi_name,
                poi_category=poi["category"],
                is_indoor=int(poi["is_indoor"]),
                weekday_num=weekday_num,
                hour=hour,
            )
            crowd_utility = 1.0 - crowd_pred.crowd_score
            weather_utility = _weather_adjustment(weather_rec, int(poi["is_indoor"]))
            forecast_utility, forecast_reasons = _forecast_adjustment(poi, hour, forecast)
            slot_bonus = _time_bonus(poi["category"], hour)

            travel_km = 0.0
            if prev_poi is not None:
                p0 = poi_catalog[prev_poi]
                travel_km = _haversine_km(p0["lat"], p0["lng"], poi["lat"], poi["lng"])
            travel_penalty = -0.02 * travel_km

            utility = (
                crowd_utility
                + weather_utility
                + forecast_utility
                + slot_bonus
                + travel_penalty
            )
            if utility > best_score:
                best_score = utility
                best_choice = (poi_name, poi, crowd_pred, travel_km)
                best_parts = (
                    crowd_utility,
                    weather_utility,
                    forecast_utility,
                    slot_bonus,
                    travel_penalty,
                    forecast_reasons,
                )

        if best_choice is None or best_parts is None:
            continue

        poi_name, poi, crowd_pred, travel_km = best_choice
        crowd_u, weather_u, forecast_u, slot_u, travel_u, forecast_reasons = best_parts

        reasons = [f"crowd={crowd_pred.crowd_score:.2f} ({crowd_pred.crowd_level})"]
        if weather_u < 0:
            reasons.append("weather mismatch penalty")
        if forecast_u != 0:
            reasons.extend(forecast_reasons)
        if slot_u > 0:
            reasons.append("good time-category match")
        if slot_u < 0:
            reasons.append("time-category penalty")
        if prev_poi is not None:
            reasons.append(f"travel {travel_km:.1f} km from previous")

        schedule.append(
            AgentStop(
                poi=poi_name,
                hour=hour,
                time_label=f"{hour}:00-{hour + 1}:00",
                category=poi["category"],
                is_indoor=int(poi["is_indoor"]),
                utility=round(best_score, 3),
                crowd_score=round(crowd_pred.crowd_score, 3),
                crowd_rule_used=crowd_pred.rule_used,
                travel_km_from_prev=round(travel_km, 2),
                explanation="; ".join(reasons),
            )
        )
        remaining.remove(poi_name)
        prev_poi = poi_name

    return {
        "agent": "itinerary_agent_v1",
        "weather": weather_result,
        "forecast": forecast,
        "schedule": [s.__dict__ for s in schedule],
        "summary": (
            "Order optimized by crowd, weather fit, category-time preferences, "
            "and travel distance."
        ),
    }
