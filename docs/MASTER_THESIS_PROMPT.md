# Master Thesis Generation Prompt

Use the following grounded project brief to generate a full project thesis later. The content below is extracted from the repository documentation and source code for the project named "Crime Predictive Model / Crime Predictive Hotspot Mapping System." Do not add assumptions that are not supported by these details.

## Source Material Reviewed

Project files reviewed:

- `README.md`
- `poster_content.md`
- `docs/ARCHITECTURE.md`
- `docs/API_REFERENCE.md`
- `docs/DATABASE_SCHEMA.md`
- `docs/schema.sql`
- `docs/ML_ALGORITHMS.md`
- `docs/DASHBOARD_DATA_AUDIT.md`
- `docs/security.md`
- `docs/Crime_Hotspot_Research_Paper_79.docx`
- `docker-compose.yml`
- Backend source under `backend/src`
- Backend migrations under `backend/migrations`
- Frontend source under `frontend/app`, `frontend/components`, `frontend/services`, and `frontend/lib`
- ML service source under `ml-service/app`

Important accuracy rule:

- Treat source code as the primary truth for implemented features.
- Treat architecture documents, poster content, and the research paper as design intent, academic narrative, or planned/claimed scope where the source code does not implement the feature.
- Clearly distinguish implemented features from documented future or planned features.

## Project Identity

Project title:

- Crime Predictive Hotspot Mapping System for Bihar Police
- Also described as: Crime Predictive Model / Tool for Hotspot Mapping

Project type:

- Final-year academic project.
- Web-based spatial intelligence platform for crime analysis, hotspot detection, forecasting, and patrol-support workflows.

Institutional context found in documentation:

- Government Engineering College West Champaran.
- Computer Science and Engineering department.
- Academic use only; live police systems are not directly integrated.

Team details found across files:

- `README.md` says the project is developed by a team of 3 members.
- The research paper `.docx` lists Shivam Kumar, Kunal Kumar, Aayush Raj, and Pakija Sehar.
- `poster_content.md` lists Shivam Kumar, Aayush Raj Singh, and placeholder entries for other members.
- Because the repository contains conflicting team-size data, mention the team only if exact member details are confirmed by the user.

Geographic domain:

- Bihar, India.
- Frontend includes Bihar district and police station GeoJSON assets.
- Documentation refers to 38 Bihar districts and police-station-level analysis.

Primary users:

- Admin
- Officer
- Analyst

Core purpose:

- Ingest FIR data.
- Store and query geospatial crime records.
- Detect crime hotspots.
- Visualize hotspots, heatmaps, trends, and risk signals.
- Support FIR management, analytics, women-safety monitoring, road accident mapping, geo-fencing, and patrol route planning.

## Problem Statement

The project addresses limitations in manual and semi-manual crime analysis workflows:

- FIR records may be collected or reviewed manually, making trend discovery slow.
- Police personnel need map-based visibility into crime-prone zones.
- Traditional crime review does not easily reveal spatial concentration, temporal patterns, seasonal trends, or emerging hotspots.
- Patrol planning can benefit from data-driven hotspot and risk information.
- Analysts and administrators need filtered dashboards, reports, and role-based access to sensitive operational data.

Do not claim that this system is integrated with live CCTNS or live police production infrastructure. The repository states that mock/sample data is used for academic development.

## Objectives

Use these project objectives:

- Identify crime-prone areas through spatial clustering.
- Visualize FIR records on maps using latitude and longitude.
- Detect hotspots using DBSCAN and density heatmaps using KDE.
- Classify or group FIRs using IPC, NDPS, POCSO, SC/ST Act, IT Act, MV Act, and similar crime-section metadata.
- Provide filters by crime type, zone, police station, status, and date range.
- Provide role-based dashboard access for Admin, Officer, and Analyst.
- Support manual FIR creation and bulk FIR import.
- Provide analytics for zone totals, seasonal patterns, forecasts, behavioral clustering, women-safety heatmaps, risk scores, and comparisons.
- Support IRAD accident ingestion and accident hotspot mapping.
- Support patrol route generation using optimized route sequencing.
- Provide audit logging, alert listing, and geo-fence management.

## Architecture

The implemented project is a three-service full-stack system:

1. Frontend:
   - Next.js application using React, TypeScript, Tailwind CSS, Leaflet/react-leaflet, Recharts, lucide-react, Radix/shadcn-style UI components.
   - Runs on port 3000 in Docker Compose.

2. Backend:
   - Node.js and Express 5 REST API.
   - Uses ES modules.
   - Uses Zod for validation.
   - Uses JWT-based authentication.
   - Uses role-based authorization.
   - Uses `pg` for PostgreSQL queries with raw SQL.
   - Runs on port 4000 in Docker Compose.

3. ML service:
   - Python FastAPI service.
   - Uses scikit-learn, pandas, numpy, Prophet, OR-Tools, Shapely, GeoPandas.
   - Implements computational functions for clustering, KDE, forecasting, patrol route optimization, and risk scoring.
   - Runs on port 8001 in Docker Compose.

4. Database:
   - Docker Compose uses `postgis/postgis:15-3.4`.
   - Migrations target PostgreSQL/PostGIS, but some migration comments mention a local PostgreSQL environment where PostGIS may be unavailable and JSONB location fallback is used.

Data flow:

- User interacts with the Next.js dashboard.
- Frontend sends API calls to the Express backend.
- Backend validates requests, checks JWT and role access, reads/writes PostgreSQL, and calls the ML service when needed.
- ML service returns computed clusters, KDE heat points, forecasts, route sequences, or risk scores.
- Frontend renders maps, charts, tables, and workflow screens.

Docker Compose services:

- `db`
- `ml-service`
- `backend`
- `frontend`

Important architecture discrepancy:

- Documentation describes Nginx, Redis, BullMQ, HttpOnly cookies, circuit breakers, MinIO/S3, SHAP endpoints, Random Forest training endpoints, Isolation Forest, Moran's I, PAI, Near-Repeat, and spaCy NER.
- The current source code does not implement all of those. The checked-in ML service exposes only `/health`, `/cluster`, `/hotspots/kde`, `/forecast`, `/routes/optimize`, and `/risk-score`.
- The checked-in frontend/backend authentication stores JWTs in `localStorage` and sends them as Bearer tokens. The docs describe HttpOnly cookie auth, but that is not how the current implementation works.

## Backend Implementation

Backend stack:

- Node.js
- Express 5
- PostgreSQL using `pg`
- Zod validation
- bcrypt password hashing
- jsonwebtoken JWT generation and verification
- CORS
- Custom rate limit middleware
- Audit middleware

Backend entry points:

- `backend/src/app.js`
- `backend/src/server.js`

Main backend folders:

- `controllers`: request handlers
- `routes`: API route definitions
- `services`: business logic and orchestration
- `models`: SQL queries
- `middlewares`: auth, validation, rate limiting, audit, error handling
- `validators`: Zod schemas
- `utils`: JWT, env, response, spatial utility, event bus
- `migrations`: node-pg-migrate database migrations
- `scripts`: seed and import utilities

Mounted backend API prefixes:

- `/api/v1/health`
- `/api/v1/auth`
- `/api/v1/fir`
- `/api/v1/firs`
- `/api/v1/hotspots`
- `/api/v1/ml`
- `/api/v1/zones`
- `/api/v1/classifications`
- `/api/v1/analytics`
- `/api/v1/irad`
- `/api/v1/patrol`
- `/api/v1/events`
- `/api/v1/users`
- `/api/v1/dashboard`
- `/api/v1/alerts`
- `/api/v1/audit`
- `/api/v1/geo-fences`
- `/api/v1/meta`

Authentication implementation:

- Signup creates a user after checking duplicate email.
- Passwords are hashed with bcrypt.
- Login verifies email/password and returns access token, refresh token, and user data.
- Tokens are returned in JSON responses.
- Protected backend routes check Bearer token, `x-access-token`, or query token for SSE.
- Refresh token handling is JWT-based in source, not persisted hashed refresh-token table logic.

Roles:

- `ADMIN`
- `OFFICER`
- `ANALYST`

Implemented route highlights:

- Auth: signup, login, refresh, logout, profile.
- FIR: create, bulk create, CCTNS-format create, list, search, get by ID.
- Hotspots: GET hotspot clusters from database-side clustering logic.
- ML proxy: DBSCAN cluster, KDE, forecast, route optimization, risk score.
- Analytics: zone analytics, seasonal trends, forecast, behavioral clustering, zone comparison, CSV export, heatmap timeline, women safety heatmap, women safety FIRs, risk scores, officer leaderboard, station/district crime totals.
- IRAD: ingest accidents, list accidents, accident hotspots.
- Patrol: generate routes, list routes, get route by ID, schedule, patrol logs.
- Events: SSE stream/subscribe endpoints.
- Users: current user, FCM token update, admin user list, update, delete, reset-password.
- Alerts: list, get, mark read.
- Audit: admin-only audit log list.
- Geo-fences: list, create, update, delete.
- Dashboard: summary endpoint.

## Frontend Implementation

Frontend stack:

- Next.js App Router
- React 19
- TypeScript
- Tailwind CSS 4
- Leaflet/react-leaflet
- Recharts
- lucide-react icons
- Radix/shadcn-style UI components

Authentication behavior:

- Login/signup pages call backend auth APIs.
- In development, auth service includes a local fallback user store if the API server is unavailable.
- Auth token and user data are stored in `localStorage` keys `authToken` and `authUser`.
- Dashboard access is guarded client-side through `DashboardShell` and `lib/rbac.ts`.

Role-based dashboard access:

- ADMIN: dashboard, analytics, audit log, FIRs, geo-fences, hotspots, IRAD, patrols, reports, settings, users, women safety.
- ANALYST: dashboard, analytics, hotspots, reports, women safety.
- OFFICER: dashboard, FIRs, geo-fences, hotspots, IRAD, patrols, reports, women safety.

Main public pages:

- `/landing_page`
- `/login`
- `/signup`

Dashboard pages:

- `/dashboard`: overview with KPIs, map preview, recent FIRs, forecasts, risk and behavior signals, officer leaderboard, health and pressure cards.
- `/dashboard/hotspots`: map page with DBSCAN/KDE modes, district and station layers, FIR pins, women-safety overlay, accident overlay, district shading, top-N charts, fullscreen map.
- `/dashboard/firs`: FIR records table, search, filters, pagination, manual FIR form, bulk import, export behavior.
- `/dashboard/analytics`: analytics dashboard with forecast, seasonal, behavioral, risk, comparison, women-safety-related data.
- `/dashboard/behavioral`: behavioral cluster-oriented page.
- `/dashboard/patrols`: patrol route generation and route preview.
- `/dashboard/irad`: road accident ingestion/listing/hotspot page.
- `/dashboard/reports`: forecast/reporting page.
- `/dashboard/women-safety`: dedicated women safety page.
- `/dashboard/geo-fences`: geo-fence management page.
- `/dashboard/users`: admin user management page.
- `/dashboard/audit-log`: admin audit log page.
- `/dashboard/settings`: settings and preferences page.

Layout:

- Sidebar groups: Operational, Analytical, Specialised, Admin.
- Topbar includes breadcrumb/eyebrow, date range indicator, Brief button, theme toggle, notification icon, Register FIR CTA for non-Analyst users, and logout.
- Theme is persisted through `localStorage`.

Dashboard data audit:

- Many dashboard fields are live from APIs.
- Some UI values are approximations or hardcoded, such as some deltas, sparklines, response-time estimates, fleet denominator, hotspot delta percentages, and forecast CI label.
- Use `docs/DASHBOARD_DATA_AUDIT.md` as the truth source when discussing which dashboard values are live vs approximate.

## Database Design

Database target:

- PostgreSQL with PostGIS.
- Migrations use node-pg-migrate.
- `docs/schema.sql` describes a complete schema.

Important database entities:

- `users`: login users with role, station/zone, lockout fields, FCM token fields.
- `refresh_tokens`: documented hashed refresh-token store.
- `crime_classifications`: IPC/special-act section master with category, severity, women-safety flag, accident-related flag, cognizable/bailable metadata.
- `zones`: district and police station boundaries.
- `firs`: central fact table for FIR records.
- `fir_attachments`: metadata for FIR attachments.
- `audit_logs`: immutable audit trail.
- `irad_accidents`: road accident records.
- `geo_fences`: sensitive-area polygons and alert metadata.
- `patrol_routes`: generated patrol route headers.
- `patrol_route_stops`: route waypoints.
- `patrol_units`: police patrol units.
- `patrol_logs`: route execution logs.
- `alerts`: anomaly/crime-spike alerts.
- `user_preferences`: dashboard/user preferences.
- `schema_versions`: schema tracking.

Core FIR fields:

- `fir_no`
- `crime_type`
- `act_type`
- `section`
- `section_code`
- `classification_id`
- `category`
- `severity`
- `occurred_at`
- `location`
- `location_name`
- `police_station`
- `zone`
- `zone_id`
- `victim_gender`
- `victim_age`
- `victim_count`
- `sensitive_notes_enc`
- `status`
- `description`
- `registered_by`
- `source`

Database design concepts:

- FIR location is intended for geospatial analysis.
- Documentation emphasizes GEOGRAPHY points for distance queries and GEOMETRY polygons for zone containment.
- Some migrations/source include fallback handling where location may be JSONB instead of PostGIS spatial type.
- Zone name is denormalized on FIR records for faster analytics.
- Crime classification metadata supports severity and women-safety analytics.
- Audit logs record sensitive actions.
- Views include `fir_summary`, `zone_crime_stats`, `hotspot_candidates`, and `dashboard_summary`.

Important discrepancy:

- Some source files still reference `date_time` in places, while migrations rename `date_time` to `occurred_at`. The code often aliases `occurred_at AS date_time` for frontend compatibility.

## ML Service Implementation

Implemented FastAPI endpoints:

- `GET /health`
- `POST /cluster`
- `POST /hotspots/kde`
- `POST /forecast`
- `POST /routes/optimize`
- `POST /risk-score`

Implemented ML algorithms in source:

1. DBSCAN clustering:
   - File: `ml-service/app/services/clustering.py`
   - Uses scikit-learn DBSCAN.
   - Converts latitude/longitude to radians.
   - Uses haversine metric.
   - Default `eps_meters`: 300.
   - Default `min_samples`: 4.
   - Returns clusters with centroid, crime count, member IDs, and noise IDs.

2. KDE heatmap generation:
   - File: `ml-service/app/services/hotspots.py`
   - Uses scikit-learn KernelDensity.
   - Supports optional boundary GeoJSON filtering using Shapely.
   - Supports optional weights, used by women-safety severity weighting.
   - Default `bandwidth_meters`: 500.
   - Default `grid_size`: 30.
   - Returns heat points with normalized intensity.

3. Forecasting:
   - File: `ml-service/app/services/forecast.py`
   - Uses Prophet when available.
   - Aggregates/deduplicates time-series points.
   - Produces forecast points with `yhat`, `yhat_lower`, `yhat_upper`.
   - Has baseline rolling-average fallback when Prophet is unavailable or fails.

4. Patrol route optimization:
   - File: `ml-service/app/services/routing.py`
   - Uses Google OR-Tools routing solver.
   - Builds haversine distance matrix.
   - Uses depot plus stop list.
   - Uses `PATH_CHEAPEST_ARC`.
   - Time limit: 10 seconds.
   - Returns ordered stop indexes and distance in kilometers.

5. Risk scoring:
   - File: `ml-service/app/services/risk.py`
   - Computes normalized weighted score from frequency, severity, recency, hotspot density, and repeat rate.
   - Weights in source:
     - frequency: 0.30
     - severity: 0.25
     - recency: 0.20
     - density: 0.15
     - repeat rate: 0.10
   - Returns 0-100 scores.

Important ML discrepancy:

- Documentation describes additional algorithms such as Random Forest, SHAP, Isolation Forest, Moran's I, PAI, Knox/near-repeat, spaCy NER, and BiLSTM classification.
- These are not present in the checked-in ML service source files.
- The research paper claims a BiLSTM + DBSCAN + KDE approach and gives performance results on synthetic FIR data. Treat those as research-paper claims, not current source-code implementation.

## Research Paper Details

The `.docx` research paper is titled:

- "Crime Predictive Hotspot Mapping Using Spatial Clustering and Machine Learning: A Hybrid DBSCAN-KDE Approach"

Authors listed in the document:

- Shivam Kumar
- Kunal Kumar
- Aayush Raj
- Pakija Sehar

Research-paper method claims:

- Hybrid DBSCAN-KDE hotspot detection.
- BiLSTM-based FIR text classification.
- Synthetic FIR dataset aligned to NCRB 2023 crime proportions.
- Role-based web interface.
- PostgreSQL/PostGIS spatial storage.

Dataset claim:

- 12,450 synthetic FIR entries.
- Date range January 2023 to December 2024.
- Designed because real CCTNS data cannot be publicly shared.
- Crime categories include Theft, Assault/Hurt, Robbery, Fraud/Economic, Narcotics, and Other IPC.

Research-paper reported metrics:

- Proposed model accuracy: 94.1%.
- Macro precision: 93.2%.
- Macro recall: 92.4%.
- Macro F1: 92.8%.
- DBSCAN-KDE clustering reported 12 clusters.
- Silhouette score: 0.71.
- Davies-Bouldin Index: 0.43.
- Hotspot precision: 0.84.
- PostGIS GiST spatial indexing benchmark claim: 210 ms median vs 1,840 ms without index for 10,000 points.

Use these numbers only when discussing the research-paper experiment or synthetic evaluation. Do not state that the current source code reproduces all BiLSTM experiments unless the user provides that model code.

## Core Workflows

FIR intake workflow:

- Officer/Admin creates a FIR manually or through bulk/CCTNS-style import.
- Backend validates request with Zod.
- Backend inserts FIR into PostgreSQL.
- FIR contains crime metadata, time, location, station/zone, victim details, status, and optional notes.
- FIRs can be listed, filtered, searched, and exported.

Hotspot workflow:

- User opens hotspot dashboard.
- Frontend requests FIRs, zones, hotspot clusters, KDE heat points, women-safety data, and IRAD overlays.
- Backend either computes database-side hotspot clusters or proxies data to ML service.
- ML service applies DBSCAN or KDE where used.
- Frontend renders cluster markers, heatmap layers, district/station GeoJSON, charts, overlays, and FIR pins.

Analytics workflow:

- Backend aggregates FIR counts by zone, month/weekday/hour, date buckets, risk inputs, and comparison zones.
- Forecast uses time series counts passed to ML service.
- Behavioral clustering sends incident coordinates to DBSCAN.
- Women-safety analytics filters FIRs using women-safety classification/category flags and uses weighted KDE.
- Risk scoring uses zone-level metrics and the ML risk-score endpoint.

Patrol workflow:

- User chooses depot/stops/vehicles or generates route data from hotspot/risk context.
- Backend sends route optimization payload to ML service.
- OR-Tools returns vehicle route stop order and distance.
- Backend stores route and stops.
- Frontend displays saved and generated routes.

IRAD workflow:

- Admin/Officer ingests road accident records.
- Records include accident ID, timestamp, severity, coordinates, road/district metadata, casualties/injuries, and environmental fields.
- Accidents can be listed and visualized as hotspots.

Geo-fence workflow:

- Admin creates polygon boundary with alert radius and notify roles.
- Geo-fences can be listed, updated, or deleted.
- Documentation describes alerting when FIR locations fall inside/near sensitive zones.

Event/alert workflow:

- Backend provides SSE stream endpoints `/events/stream` and `/events/subscribe`.
- Alert endpoints list, fetch, and mark alerts read.
- Event bus exists in source for broadcasting events.

## Security Features

Implemented or partially implemented:

- JWT authentication.
- Role-based authorization.
- Zod input validation.
- Rate limiting middleware.
- Audit middleware and audit log model/routes.
- bcrypt password hashing.
- CORS configuration.

Documented or planned production security:

- HttpOnly cookies.
- Hashed persistent refresh-token store.
- CSRF token.
- HTTPS/TLS termination.
- Managed secret storage.
- DB encryption at rest.
- Rotation of JWT secrets.
- Monitoring and alerting.

Important implementation note:

- Current frontend stores tokens in localStorage and sends Bearer tokens.
- Do not describe the current implementation as HttpOnly-cookie based unless discussing documented target architecture.

## Deployment and Environment

Docker Compose runs:

- PostgreSQL/PostGIS database on host port 5432.
- ML service on host port 8001.
- Backend on host port 4000.
- Frontend on host port 3000.

Backend environment variables:

- `PORT`
- `DATABASE_URL`
- `JWT_SECRET`
- `JWT_EXPIRES_IN`
- `ML_SERVICE_URL`
- `CORS_ORIGIN`
- `DB_SSL`
- `INIT_DB_ON_START`

Frontend environment variable:

- `NEXT_PUBLIC_API_BASE`

Backend scripts:

- `npm run start`
- `npm run dev`
- `npm run migrate:up`
- `npm run migrate:down`
- `npm run migrate:create`
- `npm run seed:classifications`
- `npm run seed:demo`
- `npm run seed:district-boundaries`
- `npm run db:convert-spatial`

ML service setup:

- Python FastAPI app with `uvicorn app.main:app --host 0.0.0.0 --port 8001`.

## Features to Present as Implemented

Use these as implemented project features, based on source code and current files:

- Next.js dashboard with multiple operational, analytical, and admin pages.
- Login/signup frontend and backend.
- JWT-based role access.
- FIR creation, listing, search, bulk import, and CCTNS-style import route.
- FIR table and manual FIR entry UI.
- Zone and police-station boundary assets.
- DBSCAN clustering endpoint in ML service.
- KDE heatmap endpoint in ML service.
- Forecast endpoint with Prophet and fallback.
- OR-Tools route optimization endpoint.
- Weighted risk scoring endpoint.
- Analytics APIs for zones, seasonal trends, forecast, behavioral clustering, women safety, risk, compare, heatmap timeline, exports, officer leaderboard, station/district totals.
- IRAD accident ingestion, listing, and hotspot endpoint.
- Patrol route generation, listing, detail, schedule, and logs.
- Alert APIs and SSE event stream.
- Geo-fence APIs.
- User management APIs.
- Audit log APIs.
- Dockerized frontend, backend, ML service, and database.

## Features to Present as Planned, Documented, or Research-Claimed

Use these only with careful wording:

- BiLSTM FIR text classification.
- Random Forest classifier training/prediction endpoints.
- SHAP explainability endpoint.
- Isolation Forest anomaly detection.
- Moran's I spatial autocorrelation endpoint.
- PAI evaluation endpoint.
- Knox/near-repeat victimization endpoint.
- spaCy NER endpoint.
- Redis caching and BullMQ background jobs.
- Nginx reverse proxy.
- MinIO/S3 attachment storage.
- HttpOnly-cookie authentication.
- Circuit breaker around ML service calls.
- Real CCTNS integration.
- Live police deployment.

## Thesis Content Prompt

Generate a full academic thesis for this project using only the facts below and the accuracy rules above.

Project name:

- Crime Predictive Hotspot Mapping System for Bihar Police.

Core idea:

- A web-based spatial intelligence platform that uses FIR data to detect crime hotspots, visualize spatial and temporal crime patterns, support analytics, and assist police decision-making through maps, dashboards, forecasts, risk scores, and patrol route planning.

Scope:

- Academic final-year project.
- Focused on Bihar, India.
- Uses mock/sample/synthetic FIR and IRAD-style data, not live police production data.
- Users are Admin, Officer, and Analyst.

System architecture:

- Frontend: Next.js, React, TypeScript, Tailwind CSS, Leaflet/react-leaflet, Recharts.
- Backend: Node.js, Express 5, Zod, JWT, RBAC, PostgreSQL via raw SQL.
- ML service: Python FastAPI, scikit-learn, Prophet, OR-Tools.
- Database: PostgreSQL/PostGIS target, with migrations and some JSONB fallback handling for local spatial compatibility.
- Deployment: Docker Compose with frontend, backend, ML service, and database.

Main modules:

- Authentication and role-based access.
- FIR management.
- Crime classification metadata.
- Hotspot mapping.
- Zone and station boundary management.
- Analytics and forecasting.
- Women safety analysis.
- IRAD accident analysis.
- Patrol route optimization.
- Geo-fence management.
- Alerts and SSE events.
- Audit logging.
- User administration.
- Dashboard reporting.

Data model:

- Main table is `firs`, containing FIR number, crime type, act/section metadata, category, severity, occurrence timestamp, location, station, zone, victim metadata, status, description, registered user, and source.
- Supporting entities include users, crime classifications, zones, IRAD accidents, geo-fences, patrol routes/stops/units/logs, alerts, audit logs, preferences, and schema versions.

Implemented algorithms:

- DBSCAN for spatial clustering using haversine distance.
- KDE for density heatmap generation, with optional severity weights and boundary filtering.
- Prophet for time-series forecasting, with fallback rolling-average forecast.
- OR-Tools VRP for route optimization.
- Weighted normalized risk scoring from frequency, severity, recency, hotspot density, and repeat rate.

Research-paper claims to mention separately:

- Synthetic FIR dataset of 12,450 records aligned to NCRB 2023 proportions.
- BiLSTM + DBSCAN + KDE experimental model.
- Reported accuracy 94.1%, macro precision 93.2%, macro recall 92.4%, macro F1 92.8%.
- Reported clustering results: 12 clusters, Silhouette 0.71, DBI 0.43, hotspot precision 0.84.
- Treat these as academic experiment claims from the included `.docx`, not necessarily implemented source-code endpoints.

Workflow narrative:

- FIR records are entered manually or imported in bulk.
- Backend validates and stores FIR records.
- Location-enabled FIRs are used for maps and hotspot analysis.
- Analytics APIs aggregate FIR data by zone, time, crime type, and risk factors.
- ML service computes clusters, heatmap intensities, forecasts, routes, and risk scores.
- Frontend renders role-specific dashboards, maps, tables, charts, reports, and admin pages.

Security narrative:

- JWT authentication and RBAC are implemented.
- Passwords are hashed with bcrypt.
- Zod validation protects API inputs.
- Rate limiting and audit logging exist.
- Production-hardening items such as HttpOnly cookies, CSRF, secret rotation, managed TLS, Redis queues, and object storage should be described as recommended or documented future improvements unless implemented code is provided.

Limitations to include:

- Uses mock/sample/synthetic data for academic development.
- Current code does not include every algorithm described in the docs.
- Current authentication uses localStorage Bearer tokens rather than HttpOnly cookies.
- Some dashboard values are approximations or hardcoded according to `DASHBOARD_DATA_AUDIT.md`.
- Some schema/code differences exist around `date_time` vs `occurred_at` and PostGIS vs JSONB location handling.
- Forecasting is dependent on historical data availability and falls back to a simple average when needed.
- Route optimization uses haversine distance and does not model real-time traffic or road-network constraints.

Future enhancements:

- Real CCTNS integration.
- Live police deployment after security review.
- Mobile/PWA app for field officers.
- Traffic-aware routing.
- Real-time FIR update stream.
- More robust anomaly detection.
- SHAP explainability if source implementation is added.
- Moran's I and PAI evaluation endpoints if source implementation is added.
- External datasets such as weather, events, demographics, or social signals.
- Stronger production authentication using HttpOnly cookies, CSRF protection, and refresh-token persistence.

Tone and accuracy requirement:

- Write in a precise academic style.
- Do not invent deployment metrics, user counts, live integrations, model performance, or production use.
- When using metrics from the research paper, explicitly say they come from synthetic evaluation or reported experiment results.
- Keep the thesis grounded in the actual architecture and implementation described here.

