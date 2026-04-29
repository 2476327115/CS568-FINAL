# Context-Aware Travel Itinerary Planner — Tokyo

> **CS 6471 / [Course Name] · [Semester]**  
> Team: Kelsey Ren · Gezhi Zou · Ryan Muldoon · XiaoCheng Ma · Varad Rasalkar

---

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [System Architecture](#2-system-architecture)
3. [Data Preparation](#3-data-preparation)
   - 3.1 [Data Sources](#31-data-sources)
   - 3.2 [POI List](#32-poi-list)
   - 3.3 [Scraping Process](#33-scraping-process)
   - 3.4 [Dataset Schema](#34-dataset-schema)
   - 3.5 [Data Statistics](#35-data-statistics)
4. [Crowd Prediction Model](#4-crowd-prediction-model)
5. [Weather Rule System](#5-weather-rule-system)
6. [Itinerary Optimization](#6-itinerary-optimization)
7. [Frontend](#7-frontend)
8. [Evaluation](#8-evaluation)
9. [Setup & Usage](#9-setup--usage)

---

## 1. Project Overview

> _[TODO: Brief project description — research question, motivation, focus on Tokyo as case study]_

---

## 2. System Architecture

> _[TODO: System diagram and pipeline description]_

---

## 3. Data Preparation

### 3.1 Data Sources

| Data | Source | Purpose |
|---|---|---|
| POI crowd patterns | [Outscraper Google Maps API](https://outscraper.com) | Training data for crowd prediction model |
| Real-time weather | [Open-Meteo API](https://open-meteo.com) (free, no key required) | Weather rule system |
| Sunrise / sunset times | [Sunrise-Sunset API](https://sunrise-sunset.org/api) | Time-match bonus rules |
| POI metadata | Outscraper Google Maps API | POI coordinates, categories, opening hours |

---

### 3.2 POI List

32 Tokyo POIs were selected across 7 categories, covering a range of indoor/outdoor and time-sensitive venue types. The **`popular_times`** column indicates whether Google Maps crowd data was successfully retrieved.

#### Museums (5 POIs)

| Name | Indoor | Place ID | Coordinates | popular_times |
|---|---|---|---|---|
| Tokyo National Museum | ✓ | `ChIJEX3XFIOOGGAR3XdJvRjWLyM` | 35.7188, 139.7765 | ✗ |
| Mori Art Museum | ✓ | `ChIJg5RCD3eLGGAR6dbIHRM98w8` | 35.6605, 139.7293 | ✗ |
| teamLab Planets TOKYO DMM | ✓ | `ChIJSeco5wiJGGARItbTS8lQ5G0` | 35.6491, 139.7898 | ✓ |
| Edo-Tokyo Museum | ✓ | `ChIJOWXu4TSJGGAR07vEEi8fZAw` | 35.6966, 139.7957 | ✗ |
| National Museum of Nature and Science | ✓ | `ChIJ8Vuh65yOGGARyj4L5IBFiIk` | 35.7164, 139.7763 | ✓ |

#### Shrines & Temples (5 POIs)

| Name | Indoor | Place ID | Coordinates | popular_times |
|---|---|---|---|---|
| Sensō-ji | ✗ | `ChIJ8T1GpMGOGGARDYGSgpooDWw` | 35.7148, 139.7967 | ✗ |
| Meiji Jingu | ✗ | `ChIJ5SZMmreMGGARcz8QSTiJyo8` | 35.6764, 139.6993 | ✗ |
| Zojo-ji Temple | ✗ | `ChIJC2xnkb6LGGARJL0d222opIg` | 35.6575, 139.7483 | ✓ |
| Yasukuni Shrine | ✗ | `ChIJ1UOuDWiMGGARkM6Iv-ZU57U` | 35.6941, 139.7438 | ✓ |
| Nezu Shrine | ✗ | `ChIJ-X4hzjKMGGARDSsGeHOACgw` | 35.7201, 139.7608 | ✓ |

#### Viewpoints & Towers (5 POIs)

| Name | Indoor | Place ID | Coordinates | popular_times |
|---|---|---|---|---|
| Tokyo Skytree | ✓ | `ChIJ35ov0dCOGGARKvdDH7NPHX0` | 35.7101, 139.8107 | ✓ |
| Tokyo Tower | ✓ | `ChIJCewJkL2LGGAR3Qmk0vCTGkg` | 35.6586, 139.7454 | ✓ |
| Shibuya Sky | ✓ | `ChIJ4Rr2JWiLGGARcyRSHuZ-9G8` | 35.6587, 139.7020 | ✓ |
| Tokyo Metropolitan Government Building No.1 | ✓ | `ChIJoTcat9SMGGAR6GGG8zdcZvE` | 35.6895, 139.6917 | ✗ |
| Roppongi Hills Mori Tower | ✓ | `ChIJ__9ThIKLGGAR2FCxue47YLg` | 35.6607, 139.7292 | ✗ |

#### Parks (5 POIs)

| Name | Indoor | Place ID | Coordinates | popular_times |
|---|---|---|---|---|
| Shinjuku Gyoen National Garden | ✗ | `ChIJPyOTG8KMGGARh_IXobWxHmo` | 35.6852, 139.7101 | ✓ |
| Ueno Park | ✗ | `ChIJw2qQRZuOGGARWmROEiM2y7E` | 35.7148, 139.7734 | ✓ |
| Yoyogi Park | ✗ | `ChIJMwpiebSMGGARPr_454zHvDQ` | 35.6701, 139.6950 | ✓ |
| Hibiya Park | ✗ | `ChIJx6xXOPKLGGARtPr6qZZ2nHA` | 35.6736, 139.7559 | ✓ |
| Inokashira Park | ✗ | `ChIJLWaVdDXuGGART_Pg1R3CZ4A` | 35.6997, 139.5737 | ✓ |

#### Shopping Areas (6 POIs)

| Name | Indoor | Place ID | Coordinates | popular_times |
|---|---|---|---|---|
| Shibuya Crossing | ✗ | `ChIJK9EM68qLGGARacmu4KJj5SA` | 35.6595, 139.7006 | ✗ |
| Akihabara Electric Town | ✗ | `ChIJlUKLVx2MGGAR20vIvxChNHk` | 35.6985, 139.7728 | ✗ |
| Takeshita St (Harajuku) | ✗ | `ChIJlVne8bqMGGARtX5O6ojMvsI` | 35.6710, 139.7052 | ✗ |
| GINZA SIX | ✓ | `ChIJAQAsR--LGGAR_AmB8WMDy88` | 35.6698, 139.7642 | ✓ |
| DECKS Tokyo Beach | ✓ | `ChIJIbdI7PaJGGARYrhCahk1Ky8` | 35.6291, 139.7759 | ✓ |
| Nakameguro | ✗ | `ChIJAas2LziLGGAROimsxcM_Rqo` | 35.6387, 139.7026 | ✗ |

#### Markets (3 POIs)

| Name | Indoor | Place ID | Coordinates | popular_times |
|---|---|---|---|---|
| Tsukiji Outer Market | ✗ | `ChIJW2cLzSGLGGARXAKXv6EkbqI` | 35.6648, 139.7703 | ✗ |
| Ameyoko Market | ✗ | `ChIJh7eDrwCPGGARCs9fpCkKS2U` | 35.7090, 139.7746 | ✗ |
| Yanaka Ginza | ✗ | `ChIJPYwFnNGNGGARYEeXwiYQPe8` | 35.7277, 139.7657 | ✗ |

#### Amusement Parks (3 POIs)

| Name | Indoor | Place ID | Coordinates | popular_times |
|---|---|---|---|---|
| Tokyo DisneySea | ✗ | `ChIJszdHEQN9GGARJS23SnAdR0E` | 35.6267, 139.8851 | ✗ |
| Tokyo Joypolis | ✓ | `ChIJuTdPXvaJGGARJhT_Ai6urFQ` | 35.6287, 139.7754 | ✗ |
| Sunshine 60 | ✓ | `ChIJU9ZPE2-NGGARwiJyx0Id61E` | 35.7290, 139.7195 | ✓ |

---

### 3.3 Scraping Process

**Tool:** [Outscraper Google Maps API](https://outscraper.com/google-maps-api/) via the official Python SDK (`pip install outscraper`)

**Why Outscraper:** Google's official Places API does not expose `popular_times` data. Outscraper provides this data by scraping Google Maps and returning it in a structured format. The free tier covers 500 records/month, sufficient for this project.

**Key constraint:** `popular_times` is only returned for **individual (single-POI) searches**, not category/area searches. Each POI was therefore queried separately with `limit=1`.

**Scraping script:** `data/tokyo_scraper_outscraper.py`

```
Input:  List of 32 POI search queries (name + district + city + country)
Output: data/tokyo_poi_raw.json   — raw API response per POI
        data/tokyo_crowd_dataset.csv — flattened training dataset
```

**Post-processing script:** `data/json_to_csv.py`

```bash
# Convert raw JSON → training CSV without re-scraping
python data/json_to_csv.py --input data/tokyo_poi_raw.json --output data/tokyo_crowd_dataset.csv
```

**Scraping date:** 2026-04-29

**Request rate:** 1 request per 1.5 seconds (Outscraper server-side, no local IP risk)

---

### 3.4 Dataset Schema

#### Raw file: `data/tokyo_poi_raw.json`

A JSON array of 32 objects. Each object is the full Outscraper API response for one POI, with the following project-specific fields appended:

| Field | Type | Description |
|---|---|---|
| `_poi_category` | string | Project category label: `museum`, `shrine`, `viewpoint`, `park`, `shopping_area`, `market`, `amusement_park` |
| `_is_indoor` | bool | Whether the POI is an indoor venue |
| `_query` | string | The search query used to retrieve this POI |
| `_scraped_at` | string (ISO 8601) | Timestamp of when the record was scraped |

The `popular_times` field (when present) has the following structure:

```json
[
  {
    "day": 1,
    "day_text": "Monday",
    "popular_times": [
      { "hour": 9,  "percentage": 48, "time": "9a", "title": "Usually not too busy" },
      { "hour": 10, "percentage": 67, "time": "9a", "title": "Usually a little busy" },
      ...
    ]
  },
  ...
]
```

- `day`: 1 = Monday, 2 = Tuesday, …, 7 = Sunday
- `hour`: 0–23 (only hours with non-zero activity are included)
- `percentage`: busyness score 0–100 (relative to the busiest hour of that POI)

#### Training file: `data/tokyo_crowd_dataset.csv`

Flattened from `tokyo_poi_raw.json`. One row per `(POI, weekday, hour)` combination. Only POIs with `popular_times` data are included.

| Column | Type | Description |
|---|---|---|
| `poi_name` | string | POI display name |
| `poi_category` | string | `museum` / `shrine` / `viewpoint` / `park` / `shopping_area` / `market` / `amusement_park` |
| `is_indoor` | int (0/1) | Whether the venue is indoors |
| `weekday` | string | `Monday` – `Sunday` |
| `weekday_num` | int | 0 = Monday … 6 = Sunday |
| `is_weekend` | int (0/1) | 1 if Saturday or Sunday |
| `hour` | int | Hour of day, 0–23 |
| `crowd_score` | float | **Model target.** Normalized busyness, 0.0–1.0 (= `raw_score / 100`) |
| `raw_score` | int | Original Google busyness value, 0–100 |

---

### 3.5 Data Statistics

| Category | Total POIs | POIs with popular_times | Training rows |
|---|---|---|---|
| museum | 5 | 2 | 336 |
| shrine | 5 | 3 | 504 |
| viewpoint | 5 | 3 | 504 |
| park | 5 | 5 | 840 |
| shopping_area | 6 | 2 | 336 |
| market | 3 | 0 | 0 |
| amusement_park | 3 | 1 | 168 |
| **Total** | **32** | **16** | **2,688** |

> **Note on missing data:** 16 POIs returned `popular_times: null` from the API. This commonly occurs for venues that Google Maps does not have sufficient visit history for, or for outdoor areas (e.g. street crossings, open markets) that are not tracked as distinct places. The market category is entirely missing and should be supplemented with additional POIs or mock data in future iterations.

---

## 4. Crowd Prediction Model

> _[TODO: Model architecture, features, training details, evaluation metrics]_

---

## 5. Weather Rule System

> _[TODO: Rule definitions, thresholds, API integration, output format]_

---

## 6. Itinerary Optimization

> _[TODO: Utility score formula, greedy scheduling algorithm, rule-based time-match bonuses]_

---

## 7. Frontend

> _[TODO: Tech stack, UI components, map integration, timeline view]_

---

## 8. Evaluation

> _[TODO: Quantitative metrics, user study design, baseline comparisons, ablation study]_

---

## 9. Setup & Usage

> _[TODO: Installation, environment setup, how to run each component]_

```bash
# Install dependencies
pip install outscraper

# Convert existing raw JSON to training CSV (no re-scraping needed)
python data/json_to_csv.py

# [TODO: commands for model training, weather system, frontend]
```
