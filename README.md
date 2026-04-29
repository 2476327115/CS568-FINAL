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

| Data | Source | Coverage | Purpose |
|---|---|---|---|
| POI crowd patterns | [Outscraper Google Maps API](https://outscraper.com) | 32 Tokyo POIs, scraped 2026-04-29 | Training data for crowd prediction model |
| Historical weather | [Tokyo Weatherdata — Kaggle](https://www.kaggle.com/datasets/risakashiwabara/tokyo-weatherdata) | Tokyo, 2022–2023, daily | Reference for weather rule thresholds |
| Sunrise / sunset times | [Sunrise-Sunset API](https://sunrise-sunset.org/api) | Real-time | Time-match bonus rules in itinerary optimizer |
| POI metadata | Outscraper Google Maps API | 32 Tokyo POIs | Coordinates, categories, opening hours |

---

### 3.2 POI List

32 Tokyo POIs were selected across 7 categories, covering a range of indoor/outdoor and time-sensitive venue types. The **`popular_times`** column indicates whether Google Maps crowd data was successfully retrieved.

#### Museums (5 POIs)

| Name | Indoor | Coordinates | popular_times |
|---|---|---|---|
| Tokyo National Museum | ✓ | 35.7188, 139.7765 | ✗ |
| Mori Art Museum | ✓ | 35.6605, 139.7293 | ✗ |
| teamLab Planets TOKYO DMM | ✓ | 35.6491, 139.7898 | ✓ |
| Edo-Tokyo Museum | ✓ | 35.6966, 139.7957 | ✗ |
| National Museum of Nature and Science | ✓ | 35.7164, 139.7763 | ✓ |

#### Shrines & Temples (5 POIs)

| Name | Indoor | Coordinates | popular_times |
|---|---|---|---|
| Sensō-ji | ✗ | 35.7148, 139.7967 | ✗ |
| Meiji Jingu | ✗ | 35.6764, 139.6993 | ✗ |
| Zojo-ji Temple | ✗ | 35.6575, 139.7483 | ✓ |
| Yasukuni Shrine | ✗ | 35.6941, 139.7438 | ✓ |
| Nezu Shrine | ✗ | 35.7201, 139.7608 | ✓ |

#### Viewpoints & Towers (5 POIs)

| Name | Indoor | Coordinates | popular_times |
|---|---|---|---|
| Tokyo Skytree | ✓ | 35.7101, 139.8107 | ✓ |
| Tokyo Tower | ✓ | 35.6586, 139.7454 | ✓ |
| Shibuya Sky | ✓ | 35.6587, 139.7020 | ✓ |
| Tokyo Metropolitan Government Building No.1 | ✓ | 35.6895, 139.6917 | ✗ |
| Roppongi Hills Mori Tower | ✓ | 35.6607, 139.7292 | ✗ |

#### Parks (5 POIs)

| Name | Indoor | Coordinates | popular_times |
|---|---|---|---|
| Shinjuku Gyoen National Garden | ✗ | 35.6852, 139.7101 | ✓ |
| Ueno Park | ✗ | 35.7148, 139.7734 | ✓ |
| Yoyogi Park | ✗ | 35.6701, 139.6950 | ✓ |
| Hibiya Park | ✗ | 35.6736, 139.7559 | ✓ |
| Inokashira Park | ✗ | 35.6997, 139.5737 | ✓ |

#### Shopping Areas (6 POIs)

| Name | Indoor | Coordinates | popular_times |
|---|---|---|---|
| Shibuya Crossing | ✗ | 35.6595, 139.7006 | ✗ |
| Akihabara Electric Town | ✗ | 35.6985, 139.7728 | ✗ |
| Takeshita St (Harajuku) | ✗ | 35.6710, 139.7052 | ✗ |
| GINZA SIX | ✓ | 35.6698, 139.7642 | ✓ |
| DECKS Tokyo Beach | ✓ | 35.6291, 139.7759 | ✓ |
| Nakameguro | ✗ | 35.6387, 139.7026 | ✗ |

#### Markets (3 POIs)

| Name | Indoor | Coordinates | popular_times |
|---|---|---|---|
| Tsukiji Outer Market | ✗ | 35.6648, 139.7703 | ✗ |
| Ameyoko Market | ✗ | 35.7090, 139.7746 | ✗ |
| Yanaka Ginza | ✗ | 35.7277, 139.7657 | ✗ |

#### Amusement Parks (3 POIs)

| Name | Indoor | Coordinates | popular_times |
|---|---|---|---|
| Tokyo DisneySea | ✗ | 35.6267, 139.8851 | ✗ |
| Tokyo Joypolis | ✓ | 35.6287, 139.7754 | ✗ |
| Sunshine 60 | ✓ | 35.7290, 139.7195 | ✓ |

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

#### Weather file: `data/Tokyo_Weatherdata.csv`

Downloaded from [Kaggle](https://www.kaggle.com/datasets/risakashiwabara/tokyo-weatherdata). Source is Japanese government statistics. Used to calibrate thresholds in the weather rule system (e.g. defining what temperature range is considered "comfortable" for outdoor visits in Tokyo).

| Column | Type | Description |
|---|---|---|
| `year` | int | Year of observation (2022 or 2023) |
| `day` | string | Date in `MM/DD` format (e.g. `11/6`) |
| `temperature` | float | Daily temperature in °C |
| `humidity` | float | Daily relative humidity in % |
| `atmospheric_pressure` | float | Daily atmospheric pressure in hPa |

Example rows:

| year | day | temperature | humidity | atmospheric_pressure |
|---|---|---|---|---|
| 2022 | 11/6 | 13.5 | 61.0 | 1019.3 |
| 2022 | 11/7 | 13.7 | 70.0 | 1018.9 |
| 2022 | 11/8 | 15.9 | 55.0 | 1016.1 |

> **Note:** This dataset provides daily granularity and does not include precipitation or wind speed. It is used as a reference for setting rule thresholds rather than as direct model input. Real-time weather during itinerary generation is fetched from the [Open-Meteo API](https://open-meteo.com).

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
