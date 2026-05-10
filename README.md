# Crime Predictive Model / Tool for Hotspot Mapping

## 📌 Project Overview

This project is a **Final Year College Project** developed by a **team of 3 members**. The goal is to build a **web-based crime analysis and hotspot mapping system** that helps visualize, analyze, and predict crime-prone areas using FIR (First Information Report) data.

The system processes crime data, applies spatial clustering algorithms to detect hotspots, and presents insights through an interactive dashboard designed for police officers and analysts.

---

## 🎯 Objectives

* Identify and predict crime-prone areas (hotspots)
* Visualize crime data using heatmaps and zonal maps
* Classify crimes based on IPC / NDPS categories
* Enable filtering by crime type, date range, and zone
* Support patrol planning and analytical decision-making
* Maintain clean, scalable, and well-structured code

---

## 🧠 Key Features

* FIR data ingestion (manual upload + mock CCTNS data)
* Crime classification (IPC / NDPS → categories)
* Geo-mapping using latitude & longitude
* Hotspot detection using clustering algorithms (DBSCAN / KDE)
* Interactive map-based dashboard
* Role-based authentication (Admin, Officer, Analyst)
* Crime reports and data export (CSV / PDF)
* Women safety hotspot detection (weighted KDE)
* IRAD accident hotspot mapping
* Patrol route optimization + simulation
* Seasonal trends + forecasting
* Risk score analytics

---

## 🏗️ High-Level Architecture

* **Frontend**: Interactive dashboard with maps, charts, and tables
* **Backend**: REST APIs for data processing, authentication, and analytics
* **Database**: PostgreSQL with PostGIS for geospatial queries
* **ML Service**: FastAPI microservice for clustering, KDE, forecasting, and routing
* **Analytics Layer**: Hotspot detection and aggregation logic

All communication between frontend and backend is handled via **REST APIs**.
The backend integrates with the ML service via `ML_SERVICE_URL` (default `http://localhost:8001`).

---

## 🛠️ Tech Stack

### Frontend

* React.js
* Tailwind CSS
* Leaflet.js / Mapbox (Maps & Heatmaps)
* Recharts / Chart.js (Data visualization)

### Backend

* Node.js
* Express.js
* JWT-based Authentication
* Role-Based Access Control (RBAC)

### ML Service

* Python FastAPI
* scikit-learn, pandas, geopandas, shapely
* Prophet (time-series forecasting)
* OR-Tools (route optimization)

### Database

* PostgreSQL + PostGIS
* Optional: MongoDB (NoSQL)
* Optional: Redis (Caching)

---

## 📂 Project Structure

```
/frontend
  /components
  /pages
  /services
  /hooks
  /utils

/backend
  /controllers
  /routes
  /services
  /middlewares
  /models
  /utils

/database
  /schemas
  /migrations

/docs
```

---

## Environment Variables

Backend (`backend`):
* `PORT`
* `DB_HOST`, `DB_PORT`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`
* `JWT_SECRET`, `JWT_EXPIRES_IN`
* `ML_SERVICE_URL`
* `INIT_DB_ON_START` (optional; set to `true` to run legacy init on startup)

Frontend (`frontend`):
* `NEXT_PUBLIC_API_BASE`

ML Service (`ml-service`):
* None required by default

---

## Database Migrations

Run migrations in `backend`:

```bash
npm run migrate:up
```

Create a new migration:

```bash
npm run migrate:create -- --name add_new_table
```

Rollback:

```bash
npm run migrate:down
```

---

## 🔐 Security

* Passwords stored using secure hashing (bcrypt / argon2)
* JWT-based authentication for protected routes
* Middleware-based role checks
* No sensitive data exposed in API responses

---

## 🧪 Hotspot Detection Logic

* Uses **DBSCAN** for spatial clustering of crime locations
* Supports time-based filtering (daily / weekly / monthly)
* Each hotspot includes:

  * Cluster centroid
  * Boundary (GeoJSON)
  * Crime count
  * Crime type distribution

---

## ML Microservice

Run the ML service:

```bash
cd ml-service
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
uvicorn app.main:app --host 0.0.0.0 --port 8001
```

ML API endpoints (proxied by backend):
* `POST /api/ml/cluster` — DBSCAN clustering
* `POST /api/ml/hotspots/kde` — KDE heatmap generation
* `POST /api/ml/forecast` — Time-series forecasting
* `POST /api/ml/routes/optimize` — Patrol route optimization
* `POST /api/ml/risk-score` — Zone or area risk scoring

---

## Frontend Config (Dev)

Set `NEXT_PUBLIC_API_BASE` to your backend base URL. For authenticated calls in the current UI, store the JWT in `localStorage` under `authToken` after login.

---

## Dummy FIR Dataset Generator

Generate a synthetic FIR dataset for testing (default bbox is Bihar):

```bash
node backend/scripts/generate_dummy_fir.js --count 500 --out backend/scripts/dummy_firs.json --bbox "24.3,83.2,27.5,88.5"
```

---

## Zone Boundary Import (PostGIS)

Import Bihar district boundaries into PostGIS:

```bash
set DATABASE_URL=postgres://postgres:your_password@localhost:5432/crime_hotspot_db
node backend/scripts/import_zones_geojson.js --file frontend/public/geo/bihar_districts.geojson --type DISTRICT --nameKey district
```

Then fetch zones:
* `GET /api/zones?type=DISTRICT`

---

## Police Station Boundary Import (PostGIS)

Import Bihar police station boundaries into PostGIS:

```bash
set DATABASE_URL=postgres://postgres:your_password@localhost:5432/crime_hotspot_db
node backend/scripts/import_zones_geojson.js --file frontend/public/geo/bihar_police_stations.geojson --type STATION --nameKey name
```

Then fetch stations:
* `GET /api/zones?type=STATION`

---

## Classification Seed

```bash
cd backend
npm run migrate:up
npm run seed:classifications
```

---

## New Analytics APIs

* `GET /api/analytics/zones` — zone totals + dominant crime
* `GET /api/analytics/seasonal` — monthly / weekday / hourly trends
* `GET /api/analytics/forecast` — time-series forecast
* `POST /api/analytics/behavioral` — behavioral clustering + tags
* `GET /api/analytics/women-safety` — women safety KDE layer
* `GET /api/analytics/risk` — zone risk scores

## IRAD APIs

* `POST /api/irad/ingest`
* `GET /api/irad`
* `GET /api/irad/hotspots`

## Patrol APIs

* `POST /api/patrol/routes` — generate optimized routes
* `GET /api/patrol/routes`
* `GET /api/patrol/schedule`

---

## District Totals Export (CSV)

Use the **Export CSV** button on `/dashboard/hotspots` to download district totals.

---

## 📊 Dashboard Capabilities

* Interactive map with heatmaps and clusters
* FIR table with search and filters
* Crime trends over time
* Zone-wise crime distribution
* Role-based views for Admin, Officer, and Analyst

---

## 🔄 Team Workflow (AI-Assisted)

The team follows a **shared AI Sync Prompt** workflow:

* A master prompt acts as a single source of truth
* All team members use the same prompt before generating code
* New ideas go through approval before implementation
* Completed features are tracked and updated

This ensures consistency in:

* Code structure
* Naming conventions
* Architecture decisions

---

## 🚧 Current Project Status

**Phase:** Development (Backend + Frontend)

### Completed

* Initial project planning
* System architecture design
* Database schema design

### In Progress

* FIR APIs
* Hotspot detection service
* Frontend map integration

### Pending

* Reports & export module
* Authentication UI
* Final testing & deployment

---

## 🚀 Future Enhancements

* Real-time FIR updates
* Predictive ML models for crime forecasting
* Mobile app / PWA for field officers
* Automated alerts for emerging hotspots
* Integration with external datasets (weather, events)

---

## 📘 Academic Note

This project is developed **strictly for academic purposes** as part of a final-year curriculum. Live police systems are **not directly integrated**; mock or sample data is used during development.

---

## 👥 Team

* Team Size: 3 Members
* Roles: Frontend, Backend, Data/Analytics (collaborative)

---

## 📄 License

This project is intended for **educational use only**.
