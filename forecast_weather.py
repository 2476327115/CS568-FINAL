"""
Future weather fetcher (Tokyo) using Open-Meteo API.
"""

from __future__ import annotations

import json
import urllib.parse
import urllib.request

TOKYO_LAT = 35.6762
TOKYO_LON = 139.6503


def get_tokyo_forecast(date_str: str) -> dict:
    """
    Fetch forecast for a date (YYYY-MM-DD) including temp/wind/sunset.
    """
    params = {
        "latitude": TOKYO_LAT,
        "longitude": TOKYO_LON,
        "timezone": "Asia/Tokyo",
        "start_date": date_str,
        "end_date": date_str,
        "hourly": "temperature_2m,relative_humidity_2m,surface_pressure,windspeed_10m,precipitation_probability",
        "daily": "temperature_2m_max,temperature_2m_min,sunrise,sunset,windspeed_10m_max,precipitation_probability_max",
    }
    url = "https://api.open-meteo.com/v1/forecast?" + urllib.parse.urlencode(params)

    with urllib.request.urlopen(url, timeout=15) as resp:
        payload = json.loads(resp.read().decode("utf-8"))

    daily = payload.get("daily", {})
    hourly = payload.get("hourly", {})
    times = hourly.get("time", [])

    midday_idx = 0
    for i, t in enumerate(times):
        if t.endswith("12:00"):
            midday_idx = i
            break

    return {
        "source": "open-meteo",
        "date": date_str,
        "daily": {
            "temperature_max_c": _idx(daily.get("temperature_2m_max"), 0),
            "temperature_min_c": _idx(daily.get("temperature_2m_min"), 0),
            "sunrise": _idx(daily.get("sunrise"), 0),
            "sunset": _idx(daily.get("sunset"), 0),
            "wind_max_kmh": _idx(daily.get("windspeed_10m_max"), 0),
            "precipitation_probability_max": _idx(
                daily.get("precipitation_probability_max"), 0
            ),
        },
        "hourly_midday": {
            "temperature_c": _idx(hourly.get("temperature_2m"), midday_idx),
            "humidity_pct": _idx(hourly.get("relative_humidity_2m"), midday_idx),
            "pressure_hpa": _idx(hourly.get("surface_pressure"), midday_idx),
            "wind_kmh": _idx(hourly.get("windspeed_10m"), midday_idx),
            "precipitation_probability": _idx(
                hourly.get("precipitation_probability"), midday_idx
            ),
        },
    }


def _idx(values, i):
    if not values or i >= len(values):
        return None
    return values[i]
