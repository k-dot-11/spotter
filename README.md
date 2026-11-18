# Spotter Dispatch — Weather-Aware Heavy Vehicle Routing

> An intelligent dispatch and route optimization platform that protects heavy commercial vehicles from severe weather conditions (high winds, heavy rain, and blizzards) by combining multi-alternative corridor routing with spatio-temporal weather forecasting and weight-sensitive risk evaluation.

---

## Architecture Overview

```
                   +---------------------------------------------+
                   |          React + Vite + TypeScript          |
                   |       (MUI, Leaflet, Leaflet.heat)          |
                   +----------------------+----------------------+
                                          |
                              REST API    |  /api/trips/plan/
                                          v
                   +---------------------------------------------+
                   |          Django REST Framework              |
                   |               (Python 3.12)                 |
                   +-------+--------------+--------------+-------+
                           |              |              |
                           v              v              v
                     +-----------+  +------------+  +-----------+
                     | OpenStreetMap| | Open-Meteo |  |    OSRM   |
                     | Nominatim |  | Hourly API |  |  Routing  |
                     +-----------+  +------------+  +-----------+
```

- **Frontend**: React 18, TypeScript, Vite, Material UI (MUI v5), Leaflet, `react-leaflet`, `leaflet.heat`.
- **Backend**: Python 3.12, Django 5.x, Django REST Framework, Gunicorn.
- **Routing & Geocoding**: OSRM (Open Source Routing Machine) with alternative paths, OpenStreetMap Nominatim with caching.
- **Weather Engine**: Open-Meteo Hourly Historical/Forecast API with dynamic corridor interpolation.
- **Zero API Keys Required**: 100% free, keyless external services with built-in retry and fallback mechanisms.

---

## Core Features

### 1. Two-Stage User Workflow
- **Centralized Landing Page**: A clean, distraction-free hero screen featuring the trip planning form initialized to the user's current local date and time.
- **Dispatch Cockpit**: Automatically loads after route analysis, featuring an interactive split-view layout with the route comparison sidebar and full-screen map.

### 2. Multi-Alternative Corridor Sampling
- Generates up to 3 distinct route alternatives between any origin and destination across North America.
- Samples checkpoints adaptively at **10, 25, or 50-mile intervals**.
- Calculates the exact **truck arrival timestamp (ETA)** at every checkpoint based on road speeds.

### 3. Spatio-Temporal Weather Risk Evaluation
- Evaluates real-time weather at the exact hour the truck is expected to arrive at each checkpoint.
- **Conditions Analyzed**:
  - **Wind Speed** (mph): Crosswind blowover hazard.
  - **Rain Rate** (in/hr): Hydroplaning and low visibility hazard.
  - **Snowfall Rate** (in/hr): Road icing and traction loss hazard.
- **Cargo Weight Load Escalation**:
  - Vehicles **> 30,000 lbs** experience earlier risk escalation during severe wind/snow conditions.
  - Vehicles **> 40,000 lbs** enforce strict safety thresholds to prevent rollover and braking distance failures.

### 4. 4-Tier Recommendation Priority Engine
The recommendation algorithm strictly prioritizes driver safety:
1. **Fewest Severe risk miles** (primary safety metric).
2. **Fewest High risk miles** (secondary safety metric).
3. **Lowest Average Risk Score** across all sampled checkpoints.
4. **Shortest Travel Duration** as a tiebreaker.

### 5. 0–48 Hour Forecast Timeline & Interactive Weather Heatmap
- **4 Weather Metric Overlays**:
  - **Risk**: 5-tier composite score (Emerald Teal to Deep Burgundy).
  - **Wind**: Wind velocity field (<25 to ≥55 mph).
  - **Rain**: Rainfall precipitation intensity (<0.10 to ≥1.00 in/hr).
  - **Snow**: Snow accumulation rate (<0.5 to ≥3.00 in/hr).
- Real-time **play/pause playback controls**, scrubbable slider, and opacity adjustment.
- Instant 60 FPS slider updates via pre-computed in-memory timelines.

### 6. Visual Design & Basemap
- Styled using a customized dark palette (`#0F0F0F` canvas, `#232D3F` surface, `#005B41` forest jade, `#008170` emerald teal).
- **Esri World Dark Gray Canvas** basemap tiles with dedicated Leaflet rendering panes (`routesPane` at `z-index: 450` and `checkpointsPane` at `z-index: 620`), ensuring checkpoint rings permanently stay above polyline routes.

---

## Local Development Quickstart

### Prerequisites
- Python 3.11+ (or 3.12)
- Node.js 18+ and npm

### 1. Backend Setup
```bash
cd backend

# Create virtual environment
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Run migrations
python manage.py migrate

# Start the Django development server (runs on http://127.0.0.1:8000)
python manage.py runserver 8000
```

### 2. Frontend Setup
```bash
cd frontend

# Install npm dependencies
npm install

# Start Vite dev server (runs on http://localhost:3000)
npm run dev
```

Visit **`http://localhost:3000`** in your browser.

---

## Testing & Quality Assurance

### Run Backend Unit & Integration Tests
```bash
cd backend
source venv/bin/activate

# Run full test suite (48 tests covering risk evaluation, OSRM sampling, Open-Meteo, and API views)
python manage.py test api services

# Run Ruff linter
ruff check .
```

### Run Frontend Typecheck & Production Build
```bash
cd frontend
npm run build
```

---

## Deployment to Render (1-Click Blueprint)

This repository includes a [`render.yaml`](./render.yaml) blueprint that automates full-stack deployment on [Render](https://render.com).

1. Push this repository to your GitHub account.
2. Open the [Render Dashboard](https://dashboard.render.com).
3. Click **New +** &rarr; **Blueprint**.
4. Connect this repository and click **Apply**.
5. Render will automatically:
   - Deploy `spotter-backend` as a Python Web Service with `gunicorn`.
   - Deploy `spotter-frontend` as a Static Site with client-side SPA rewrites.
   - Automatically wire the backend URL to the frontend's `VITE_API_URL` environment variable.
