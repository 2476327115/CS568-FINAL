# Context-Aware Travel Itinerary Planner — Tokyo

> **CS 568 / User-Centered Machine Learning · Sp26**  
> Team: Kelsey Ren · Gezhi Zou · Ryan Muldoon · XiaoCheng Ma · Varad Rasalkar

## Overview

This repository contains a Tokyo travel-planning project with two layers:

- A polished **frontend prototype** in `frontend/` built with **Vite + React + TypeScript + Tailwind CSS + Mapbox GL JS**
- A retained **Python research/backend pipeline** for crowd rules, weather rules, and itinerary generation

The current frontend focuses on a **transparent, controllable AI trip planner** experience for a CS/HCI final project demo. Users select Tokyo attractions, set trip dates and pace, generate a multi-day itinerary, inspect AI reasoning, and regenerate routes with different goals.

## Current Status

### Frontend prototype

The main demo lives in `frontend/` and currently supports:

- Place search with autocomplete
- Selected-place chips and persistent map markers
- Start date / end date trip setup
- Multi-day itinerary splitting
- Pace modes:
  - `Relaxed`
  - `Normal`
  - `Compact`
- AI planning modal with staged reasoning steps
- Final itinerary timeline grouped by day
- Day-colored markers, cards, and route lines
- Real route geometry from **Mapbox Directions API**
- Route invalidation when places / dates / pace change
- Regenerate route goals:
  - `Less crowd`
  - `Better weather`
  - `Shorter travel time`

### Backend / research code

The Python code is still included and runnable, but it is **not the primary path for the current frontend prototype**. The frontend currently uses mock itinerary data plus Mapbox routing for the UI demo.

Retained backend components include:

- `app.py` — Flask app
- `crowd_rules.py` — rule-based crowd prediction
- `weather_rules.py` — weather preference rules
- `itinerary_agent.py` — itinerary recommendation logic
- `forecast_weather.py` — forecast helper

## Repository Structure

```text
.
├── app.py
├── crowd_rules.py
├── weather_rules.py
├── itinerary_agent.py
├── forecast_weather.py
├── data/
│   ├── tokyo_poi_raw.json
│   ├── tokyo_crowd_dataset.csv
│   ├── weather_tokyo_data.csv
│   └── json_to_csv.py
├── frontend/
│   ├── package.json
│   ├── public/
│   │   └── places/
│   └── src/
│       ├── App.tsx
│       ├── components/
│       ├── constants/mockData.ts
│       ├── lib/
│       └── types.ts
└── templates/
```

## Frontend Architecture

### Core state flow

The prototype uses a step-based UI flow:

1. `start` — select places
2. `tripDetails` — set dates, duration, pace
3. `review` — confirm trip summary
4. `planning` — AI reasoning modal
5. `result` — final itinerary and regenerate controls

### Important frontend files

- `frontend/src/App.tsx`
  - top-level state machine
  - route generation flow
  - multi-day itinerary assembly
  - stale route handling
- `frontend/src/components/MapView.tsx`
  - Mapbox / mock map rendering
  - colored markers and per-day route lines
- `frontend/src/components/AIPlanningPanel.tsx`
  - staged planning modal
- `frontend/src/components/ItineraryTimeline.tsx`
  - final result UI
- `frontend/src/lib/fetchMapboxRoute.ts`
  - Mapbox Directions request helper
- `frontend/src/lib/multiDayItinerary.ts`
  - date-range and day-splitting logic
- `frontend/src/lib/itinerarySchedule.ts`
  - time parsing, sorting, overlap repair
- `frontend/src/lib/regenerateItineraryWithGoals.ts`
  - regenerate-goal reordering logic
- `frontend/src/lib/dayThemes.ts`
  - day color theme mapping

## Data

### Files currently used

- `data/tokyo_poi_raw.json`
  - raw POI metadata and image references
- `data/tokyo_crowd_dataset.csv`
  - flattened crowd dataset
- `data/weather_tokyo_data.csv`
  - historical Tokyo weather reference

### Frontend mock POIs

The frontend prototype currently uses a curated subset of Tokyo POIs from `frontend/src/constants/mockData.ts`, including:

- Shibuya Sky
- Senso-ji Temple
- Tokyo Tower
- Ueno Park
- Meiji Shrine
- Shibuya Scramble Crossing
- Shibuya Station
- Shibuya PARCO

The UI uses local images from `frontend/public/places/` where available.

## Multi-Day Planning Logic

The current frontend supports date-range-based trip planning.

- Users choose a `startDate` and `endDate`
- `tripDays` is calculated as an **inclusive** date range
- Stops are split across days according to pace mode

Pace modes:

- `Relaxed` — 1–2 places/day
- `Normal` — 3–4 places/day
- `Compact` — 5–6 places/day

Hard constraints:

- Maximum 6 places per day
- Extra stops are marked as unscheduled if needed

## Routing

The frontend uses **Mapbox Directions API** for route geometry.

- Profile: `walking`
- Geometry: `geojson`
- Overview: `full`

Important behavior:

- Route validity is tied to the exact generated stop order
- If the user changes places, dates, or pace after generation, the route becomes stale
- Multi-day routes are rendered **per day**, with separate route layers and matching day colors
- Days with only one stop show a marker but no route line

## Regenerate Route Goals

The final screen allows users to regenerate the itinerary with goals:

- `Less crowd`
- `Better weather`
- `Shorter travel time`

Current implementation:

- Reorders stops **within each day**
- Uses existing mock score fields:
  - `crowd`
  - `weather`
  - `travel`
  - `preference`
- Uses coordinate distance as a lightweight travel-time approximation when `Shorter travel time` is selected

This is still a prototype heuristic, not a production optimizer.

## Running the Frontend

### Requirements

- Node.js 18+
- npm

### Install

```bash
cd frontend
npm install
```

### Optional: Mapbox token

Create:

`frontend/.env.local`

```env
VITE_MAPBOX_TOKEN=your_mapbox_token_here
```

If no token is set, the app falls back to a mock map surface for demo purposes.

### Start the dev server

```bash
cd frontend
npm run dev
```

### Build

```bash
cd frontend
npm run build
```

## Running the Flask Backend

### Requirements

At minimum, the Python app uses Flask and the local project modules. Depending on which scripts you run, you may also need the libraries used by forecast / scraping utilities.

### Start the API server

```bash
python app.py
```

Default local server:

- [http://localhost:5001](http://localhost:5001)

### Current backend routes

- `GET /`
- `GET /api/pois`
- `POST /api/generate`
- `GET /api/forecast`
- `GET /api/forecast-window`

## Data Utilities

Convert raw POI JSON into the flattened crowd dataset:

```bash
python data/json_to_csv.py
```

Useful research/debug scripts:

```bash
python crowd_rules.py --summary
python weather_rules.py --show-thresholds
```

## Notes and Limitations

- The **frontend prototype is currently the main deliverable**
- The frontend does **not** fully depend on the Flask backend right now
- Crowd/weather reasoning in the UI is still partly mock/demo logic
- Route geometry is real Mapbox routing, but itinerary ranking remains heuristic
- Some POI search behavior and ranking are based on a small curated POI set, not the full 32-POI dataset

## Recommended Demo Flow

1. Start the frontend with `npm run dev`
2. Add a Mapbox token for the full map experience
3. Select a few Tokyo places
4. Choose a multi-day range and pace mode
5. Generate the route
6. Inspect reasoning modal, colored day routes, and final itinerary
7. Try `Regenerate route` with different goals

## Future Work

- Connect real weather, crowd, and routing context more deeply into ranking
- Expand the frontend to use the full POI dataset
- Improve autocomplete and POI search quality
- Add day filtering and route comparison views
- Unify the prototype frontend and Python backend into one end-to-end system
