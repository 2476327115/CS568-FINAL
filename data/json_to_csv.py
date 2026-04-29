"""
Convert tokyo_poi_raw.json → tokyo_crowd_dataset.csv
=====================================================
Usage:
    python json_to_csv.py
    python json_to_csv.py --input my_data.json --output my_output.csv

Output columns:
    poi_name, poi_category, is_indoor,
    weekday, weekday_num, is_weekend,
    hour, crowd_score, raw_score
"""

import json
import csv
import argparse
import os

# Day name → weekday number (0=Mon ~ 6=Sun)
DAY_INDEX = {
    "Monday": 0, "Tuesday": 1, "Wednesday": 2,
    "Thursday": 3, "Friday": 4, "Saturday": 5, "Sunday": 6,
}


def flatten(raw_results: list) -> list:
    rows = []

    for place in raw_results:
        pop_times = place.get("popular_times")
        if not pop_times:
            continue

        name      = place.get("name", "Unknown")
        category  = place.get("_poi_category", "unknown")
        is_indoor = int(place.get("_is_indoor", False))

        for day_data in pop_times:
            # Outscraper format: {"day": 1, "day_text": "Monday", "popular_times": [...]}
            weekday     = day_data.get("day_text", "")
            weekday_num = DAY_INDEX.get(weekday, -1)
            is_weekend  = int(weekday in ["Saturday", "Sunday"])

            # Build hour → percentage map from the nested list
            hour_map = {}
            for entry in day_data.get("popular_times", []):
                h = entry.get("hour")
                p = entry.get("percentage", 0)
                if h is not None:
                    hour_map[h] = p

            # Write all 24 hours (missing hours = 0, i.e. closed)
            for hour in range(24):
                raw_score = hour_map.get(hour, 0)
                rows.append({
                    "poi_name":     name,
                    "poi_category": category,
                    "is_indoor":    is_indoor,
                    "weekday":      weekday,
                    "weekday_num":  weekday_num,
                    "is_weekend":   is_weekend,
                    "hour":         hour,
                    "crowd_score":  round(raw_score / 100.0, 4),
                    "raw_score":    raw_score,
                })

    return rows


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input",  default="tokyo_poi_raw.json")
    parser.add_argument("--output", default="tokyo_crowd_dataset.csv")
    args = parser.parse_args()

    # Load JSON
    with open(args.input, "r", encoding="utf-8") as f:
        raw_results = json.load(f)

    total_pois   = len(raw_results)
    with_times   = sum(1 for r in raw_results if r.get("popular_times"))
    without_times = total_pois - with_times

    print(f"Loaded {total_pois} POIs")
    print(f"  With popular_times:    {with_times}")
    print(f"  Without popular_times: {without_times}")

    # Convert
    rows = flatten(raw_results)

    if not rows:
        print("\nNo rows generated — no POI has popular_times data.")
        return

    # Write CSV
    with open(args.output, "w", newline="", encoding="utf-8") as f:
        writer = csv.DictWriter(f, fieldnames=rows[0].keys())
        writer.writeheader()
        writer.writerows(rows)

    print(f"\nCSV saved → {args.output}  ({len(rows)} rows)")

    # Category breakdown
    cats = {}
    for r in rows:
        cats[r["poi_category"]] = cats.get(r["poi_category"], 0) + 1
    print("\nRows by category:")
    for cat, cnt in sorted(cats.items()):
        poi_count = cnt // (7 * 24)
        print(f"  {cat:<22} {poi_count} POIs  ({cnt} rows)")


if __name__ == "__main__":
    main()
