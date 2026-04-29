"""
Tokyo POI Popular Times Scraper — Outscraper Version
======================================================
Setup:
    pip install outscraper

Steps:
    1. Register free account at https://outscraper.com
    2. Get API key from https://app.outscraper.com/profile
    3. Set API_KEY below
    4. Run: python tokyo_scraper_outscraper.py

Free tier: 500 places/month — enough for this project at no cost.

IMPORTANT: popular_times only returns with individual searches (one POI at a time).
           This script handles that automatically.

Output:
    data/tokyo_poi_raw.json        — raw API responses
    data/tokyo_crowd_dataset.csv   — flattened training dataset
    data/scraper.log               — run log
"""

import json
import csv
import os
import time
import logging
import sys
from datetime import datetime

# ── Config ────────────────────────────────────────────────────────────────────
API_KEY = "YOUR_OUTSCRAPER_API_KEY"   # ← paste your key here

# ── Logging ───────────────────────────────────────────────────────────────────
os.makedirs("data", exist_ok=True)
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
    handlers=[
        logging.FileHandler("data/scraper.log", encoding="utf-8"),
        logging.StreamHandler(sys.stdout),
    ],
)
log = logging.getLogger(__name__)

# ── POI list ──────────────────────────────────────────────────────────────────
# Format: (search_query, category, is_indoor)
# Query format: "Place Name, Area, Tokyo, Japan"
# Keep each query specific enough to return exactly one result
TOKYO_POIS = [
    # Museums (5)
    ("Tokyo National Museum, Ueno, Tokyo, Japan",                   "museum",        True),
    ("Mori Art Museum, Roppongi, Tokyo, Japan",                     "museum",        True),
    ("teamLab Planets TOKYO, Toyosu, Tokyo, Japan",                 "museum",        True),
    ("Edo-Tokyo Museum, Yokoami, Sumida, Tokyo, Japan",             "museum",        True),
    ("National Museum of Nature and Science, Ueno, Tokyo, Japan",   "museum",        True),

    # Temples & Shrines (5)
    ("Senso-ji Temple, Asakusa, Tokyo, Japan",                      "shrine",        False),
    ("Meiji Shrine, Harajuku, Tokyo, Japan",                        "shrine",        False),
    ("Zojo-ji Temple, Shiba, Tokyo, Japan",                         "shrine",        False),
    ("Yasukuni Shrine, Kudankita, Tokyo, Japan",                    "shrine",        False),
    ("Nezu Shrine, Bunkyo, Tokyo, Japan",                           "shrine",        False),

    # Viewpoints (5)
    ("Tokyo Skytree, Oshiage, Tokyo, Japan",                        "viewpoint",     True),
    ("Tokyo Tower, Shiba Koen, Tokyo, Japan",                       "viewpoint",     True),
    ("Shibuya Sky, Shibuya, Tokyo, Japan",                          "viewpoint",     True),
    ("Tokyo Metropolitan Government Building, Shinjuku, Japan",     "viewpoint",     True),
    ("Roppongi Hills Mori Tower, Minato, Tokyo, Japan",             "viewpoint",     True),

    # Parks (5)
    ("Shinjuku Gyoen National Garden, Tokyo, Japan",                "park",          False),
    ("Ueno Park, Taito, Tokyo, Japan",                              "park",          False),
    ("Yoyogi Park, Shibuya, Tokyo, Japan",                          "park",          False),
    ("Hibiya Park, Chiyoda, Tokyo, Japan",                          "park",          False),
    ("Inokashira Park, Musashino, Tokyo, Japan",                    "park",          False),

    # Shopping areas (6)
    ("Shibuya Scramble Crossing, Tokyo, Japan",                     "shopping_area", False),
    ("Akihabara Electric Town, Chiyoda, Tokyo, Japan",              "shopping_area", False),
    ("Takeshita Street, Harajuku, Tokyo, Japan",                    "shopping_area", False),
    ("GINZA SIX, Ginza, Tokyo, Japan",                              "shopping_area", True),
    ("Odaiba Decks Tokyo Beach, Minato, Tokyo, Japan",              "shopping_area", True),
    ("Nakameguro, Meguro, Tokyo, Japan",                            "shopping_area", False),

    # Markets (3)
    ("Tsukiji Outer Market, Chuo, Tokyo, Japan",                    "market",        False),
    ("Ameyoko Market, Ueno, Tokyo, Japan",                          "market",        False),
    ("Yanaka Ginza, Taito, Tokyo, Japan",                           "market",        False),

    # Amusement (3)
    ("Tokyo DisneySea, Urayasu, Chiba, Japan",                      "amusement_park",False),
    ("Joypolis Sega, Odaiba, Tokyo, Japan",                         "amusement_park",True),
    ("Sunshine City, Ikebukuro, Tokyo, Japan",                      "amusement_park",True),
]

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


# ── Scraper ───────────────────────────────────────────────────────────────────

def scrape_all(pois: list) -> list[dict]:
    try:
        from outscraper import ApiClient
    except ImportError:
        log.error("outscraper not installed. Run: pip install outscraper")
        sys.exit(1)

    if API_KEY == "YOUR_OUTSCRAPER_API_KEY":
        log.error("Please set your API_KEY in the script first.")
        sys.exit(1)

    client  = ApiClient(api_key=API_KEY)
    results = []

    for i, (query, category, is_indoor) in enumerate(pois, 1):
        log.info(f"[{i:02d}/{len(pois)}] {query}")

        try:
            # IMPORTANT: query one POI at a time — popular_times only returns
            # in individual (non-batch) searches per Outscraper docs
            response = client.google_maps_search(
                query,
                limit=1,            # only need top result
                language="en",
                region="JP",
            )

            # response is [[{place_data}, ...], ...]
            if not response or not response[0]:
                log.warning(f"  ✗ No results returned")
                continue

            place = response[0][0]

            # Attach our metadata
            place["_poi_category"] = category
            place["_is_indoor"]    = is_indoor
            place["_query"]        = query
            place["_scraped_at"]   = datetime.now().isoformat()

            pop_times = place.get("popular_times")
            rating    = place.get("rating", "N/A")
            reviews   = place.get("reviews", "N/A")

            if pop_times:
                log.info(f"  ✓ popular_times: OK | rating={rating} | reviews={reviews}")
            else:
                log.warning(f"  ~ No popular_times | rating={rating} | reviews={reviews}")

            results.append(place)

        except Exception as e:
            log.error(f"  ✗ Exception: {e}")

        # Polite delay between requests
        time.sleep(1.5)

    return results


# ── Dataset builder ───────────────────────────────────────────────────────────

def flatten_to_rows(raw_results: list[dict]) -> list[dict]:
    """
    Convert raw Outscraper responses into a flat training dataset.
    One row = one (POI, weekday, hour) combination.

    popular_times from Outscraper format:
    [
      {"name": "Monday", "data": [{"time": "6 AM", "busyness_score": 22}, ...]},
      ...
    ]
    OR sometimes:
    [
      {"name": "Monday", "data": [0, 0, 5, 22, ...]},   # simple int array
    ]
    This function handles both formats.
    """
    rows      = []
    day_index = {d: i for i, d in enumerate(DAYS)}

    for place in raw_results:
        pop_times = place.get("popular_times")
        if not pop_times:
            continue

        name      = place.get("name", place.get("_query", "Unknown"))
        category  = place.get("_poi_category", "unknown")
        is_indoor = int(place.get("_is_indoor", False))

        for day_data in pop_times:
            weekday     = day_data.get("name", "")
            weekday_num = day_index.get(weekday, -1)
            is_weekend  = int(weekday_num >= 5)
            raw_data    = day_data.get("data", [])

            # Normalize both response formats to a list of 24 ints
            hourly = []
            if raw_data and isinstance(raw_data[0], dict):
                # Format: [{"time": "6 AM", "busyness_score": 22}, ...]
                score_map = {}
                for entry in raw_data:
                    t = entry.get("time", "")
                    s = entry.get("busyness_score", 0)
                    # parse "6 AM" → hour int
                    try:
                        from datetime import datetime as dt
                        hour = dt.strptime(t.strip(), "%I %p").hour
                        score_map[hour] = s
                    except Exception:
                        pass
                hourly = [score_map.get(h, 0) for h in range(24)]
            else:
                # Format: simple list of 24 ints
                hourly = list(raw_data) + [0] * (24 - len(raw_data))
                hourly = hourly[:24]

            for hour, raw_score in enumerate(hourly):
                rows.append({
                    "poi_name":     name,
                    "poi_category": category,
                    "is_indoor":    is_indoor,
                    "weekday":      weekday,
                    "weekday_num":  weekday_num,
                    "is_weekend":   is_weekend,
                    "hour":         hour,
                    "crowd_score":  round(raw_score / 100.0, 4),  # ← model target
                    "raw_score":    raw_score,
                })

    return rows


def save_outputs(raw_results: list[dict], rows: list[dict]):
    # Raw JSON
    raw_path = "data/tokyo_poi_raw.json"
    with open(raw_path, "w", encoding="utf-8") as f:
        json.dump(raw_results, f, ensure_ascii=False, indent=2)
    log.info(f"Raw JSON  → {raw_path}")

    # Training CSV
    csv_path = "data/tokyo_crowd_dataset.csv"
    if rows:
        with open(csv_path, "w", newline="", encoding="utf-8") as f:
            writer = csv.DictWriter(f, fieldnames=rows[0].keys())
            writer.writeheader()
            writer.writerows(rows)
        log.info(f"Train CSV → {csv_path}  ({len(rows)} rows)")
    else:
        log.warning("No popular_times data found in any result — CSV not written.")
        log.warning("Check: are you using individual queries (not batch)?")

    # Print summary
    log.info("\n" + "═" * 50)
    log.info("  SUMMARY")
    log.info("═" * 50)
    log.info(f"  POIs queried:      {len(raw_results)}")
    with_pt = sum(1 for r in raw_results if r.get("popular_times"))
    log.info(f"  With popular_times:{with_pt}")
    log.info(f"  Without:           {len(raw_results) - with_pt}")
    log.info(f"  Dataset rows:      {len(rows)}")
    if rows:
        cats = {}
        for r in rows:
            cats[r["poi_category"]] = cats.get(r["poi_category"], 0) + 1
        log.info("  Rows by category:")
        for cat, cnt in sorted(cats.items()):
            log.info(f"    {cat:<22} {cnt:>5}")
    log.info("═" * 50)


# ── Entry point ───────────────────────────────────────────────────────────────

def main():
    log.info("=" * 50)
    log.info("  Tokyo POI Scraper — Outscraper")
    log.info(f"  POIs to scrape: {len(TOKYO_POIS)}")
    log.info("=" * 50)

    raw_results = scrape_all(TOKYO_POIS)
    rows        = flatten_to_rows(raw_results)
    save_outputs(raw_results, rows)


if __name__ == "__main__":
    main()