"""
Simple weather rule system for indoor vs. outdoor itinerary recommendations.

Data source for thresholds:
    data/weather_tokyo_data.csv (Tokyo daily weather, 2022-2023)
"""

from __future__ import annotations

import argparse
import csv
import json
from dataclasses import dataclass
from pathlib import Path


@dataclass(frozen=True)
class WeatherThresholds:
    temp_cold_c: float = 6.3
    temp_hot_c: float = 29.1
    temp_comfort_low_c: float = 10.4
    temp_comfort_high_c: float = 25.4
    humidity_high_pct: float = 88.0
    humidity_comfort_low_pct: float = 47.0
    humidity_comfort_high_pct: float = 79.0
    pressure_low_hpa: float = 1003.2
    pressure_comfort_low_hpa: float = 1006.9
    pressure_comfort_high_hpa: float = 1019.9


THRESHOLDS = WeatherThresholds()


def _is_missing(value: float | None) -> bool:
    return value is None


def classify_weather(
    temperature_c: float | None,
    humidity_pct: float | None,
    pressure_hpa: float | None,
    thresholds: WeatherThresholds = THRESHOLDS,
) -> dict:
    """
    Return recommendation for venue type.

    Inputs:
      - temperature_c: current temperature in Celsius
      - humidity_pct: current relative humidity in percent (0-100)
      - pressure_hpa: current atmospheric pressure in hPa

    Output:
      dict with:
        - recommendation: "outdoor_preferred" | "indoor_preferred" | "mixed"
        - confidence: "high" | "medium"
        - reasons: list[str]
    """
    reasons: list[str] = []

    if _is_missing(temperature_c) or _is_missing(humidity_pct) or _is_missing(pressure_hpa):
        return {
            "recommendation": "mixed",
            "confidence": "medium",
            "reasons": ["Missing one or more weather inputs."],
        }

    severe = False
    comfortable = True

    if temperature_c < thresholds.temp_cold_c:
        severe = True
        comfortable = False
        reasons.append(
            f"Very cold ({temperature_c:.1f}C < {thresholds.temp_cold_c:.1f}C)."
        )
    elif temperature_c > thresholds.temp_hot_c:
        severe = True
        comfortable = False
        reasons.append(
            f"Very hot ({temperature_c:.1f}C > {thresholds.temp_hot_c:.1f}C)."
        )
    elif not (thresholds.temp_comfort_low_c <= temperature_c <= thresholds.temp_comfort_high_c):
        comfortable = False
        reasons.append(
            "Temperature is outside the comfort band "
            f"({thresholds.temp_comfort_low_c:.1f}-{thresholds.temp_comfort_high_c:.1f}C)."
        )

    if humidity_pct >= thresholds.humidity_high_pct:
        severe = True
        comfortable = False
        reasons.append(
            f"Very humid ({humidity_pct:.0f}% >= {thresholds.humidity_high_pct:.0f}%)."
        )
    elif not (
        thresholds.humidity_comfort_low_pct
        <= humidity_pct
        <= thresholds.humidity_comfort_high_pct
    ):
        comfortable = False
        reasons.append(
            "Humidity is outside the comfort band "
            f"({thresholds.humidity_comfort_low_pct:.0f}-{thresholds.humidity_comfort_high_pct:.0f}%)."
        )

    if pressure_hpa <= thresholds.pressure_low_hpa:
        severe = True
        comfortable = False
        reasons.append(
            f"Low pressure ({pressure_hpa:.1f}hPa <= {thresholds.pressure_low_hpa:.1f}hPa)."
        )
    elif not (
        thresholds.pressure_comfort_low_hpa
        <= pressure_hpa
        <= thresholds.pressure_comfort_high_hpa
    ):
        comfortable = False
        reasons.append(
            "Pressure is outside the comfort band "
            f"({thresholds.pressure_comfort_low_hpa:.1f}-{thresholds.pressure_comfort_high_hpa:.1f}hPa)."
        )

    if severe:
        recommendation = "indoor_preferred"
        confidence = "high"
    elif comfortable:
        recommendation = "outdoor_preferred"
        confidence = "high"
        reasons.append("All metrics are in comfort bands.")
    else:
        recommendation = "mixed"
        confidence = "medium"

    return {
        "recommendation": recommendation,
        "confidence": confidence,
        "reasons": reasons,
    }


def derive_threshold_summary(
    csv_path: str = "data/weather_tokyo_data.csv",
) -> dict[str, float]:
    """
    Re-compute threshold anchors from the CSV for transparency.
    """
    path = Path(csv_path)
    if not path.exists():
        raise FileNotFoundError(f"CSV not found: {csv_path}")

    temps: list[float] = []
    hums: list[float] = []
    presses: list[float] = []

    with path.open("r", encoding="utf-8", newline="") as f:
        reader = csv.DictReader(f)
        for row in reader:
            t = _parse_float(row.get("temperature"))
            h = _parse_float(row.get("humidity ") or row.get("humidity"))
            p = _parse_float(
                row.get("atmospheric pressure") or row.get("atmospheric_pressure")
            )
            if t is not None:
                temps.append(t)
            if h is not None:
                hums.append(h)
            if p is not None:
                presses.append(p)

    def q(values: list[float], quantile: float) -> float:
        if not values:
            raise ValueError("No values available for quantile calculation.")
        values_sorted = sorted(values)
        idx = (len(values_sorted) - 1) * quantile
        lower = int(idx)
        upper = min(lower + 1, len(values_sorted) - 1)
        frac = idx - lower
        return values_sorted[lower] * (1.0 - frac) + values_sorted[upper] * frac

    return {
        "temp_p10": round(q(temps, 0.10), 2),
        "temp_p25": round(q(temps, 0.25), 2),
        "temp_p75": round(q(temps, 0.75), 2),
        "temp_p90": round(q(temps, 0.90), 2),
        "humidity_p10": round(q(hums, 0.10), 2),
        "humidity_p25": round(q(hums, 0.25), 2),
        "humidity_p75": round(q(hums, 0.75), 2),
        "humidity_p90": round(q(hums, 0.90), 2),
        "pressure_p10": round(q(presses, 0.10), 2),
        "pressure_p25": round(q(presses, 0.25), 2),
        "pressure_p75": round(q(presses, 0.75), 2),
        "pressure_p90": round(q(presses, 0.90), 2),
    }


def _parse_float(value: str | None) -> float | None:
    if value is None:
        return None
    text = str(value).strip()
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Weather rule engine for indoor/outdoor recommendation."
    )
    parser.add_argument("--temp", type=float, required=False, help="Temperature in C")
    parser.add_argument("--humidity", type=float, required=False, help="Humidity in %")
    parser.add_argument("--pressure", type=float, required=False, help="Pressure in hPa")
    parser.add_argument(
        "--show-thresholds",
        action="store_true",
        help="Print percentile anchors derived from data/weather_tokyo_data.csv",
    )
    args = parser.parse_args()

    if args.show_thresholds:
        print(json.dumps(derive_threshold_summary(), indent=2))
        return

    result = classify_weather(args.temp, args.humidity, args.pressure)
    payload = {
        "input": {
            "temperature_c": args.temp,
            "humidity_pct": args.humidity,
            "pressure_hpa": args.pressure,
        },
        "thresholds": THRESHOLDS.__dict__,
        "result": result,
    }
    print(json.dumps(payload, indent=2))


if __name__ == "__main__":
    main()
