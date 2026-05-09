# System Architecture
**Crime Predictive Hotspot Mapping System**  
Last updated: 2026-05-09

---

## Overview

A three-tier microservices system built for crime analysis and hotspot prediction across Bihar, India. Each service has a single responsibility and communicates via HTTP. The database is shared only by the backend — the ML service never touches it directly.

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT BROWSER                          │
│                    Next.js 15 (React 19)                        │
│              Leaflet Maps · Recharts · shadcn/ui                │
│                        port 3000                                │
└─────────────────────────┬───────────────────────────────────────┘
                          │ HTTPS / HTTP  (credentials: include)
                          │ HttpOnly cookies for auth
                          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      NGINX REVERSE PROXY                        │
│              Rate limiting · Gzip · SSL termination             │
│                         port 80/443                             │
└──────────────────┬──────────────────────────────────────────────┘
                   │
        ┌──────────┴──────────┐
        │ /api/v1/*           │ /  (everything else)
        ▼                     ▼
┌───────────────┐    ┌─────────────────┐
│   BACKEND     │    │   FRONTEND      │
│  Express 5    │    │  Next.js SSR    │
│  Node.js 22   │    │   port 3000     │
│  port 4000    │    └─────────────────┘
└──────┬────────┘
       │
  ┌────┴──────────────────────────┐
  │                               │
  ▼                               ▼
┌──────────────────┐    ┌─────────────────────┐
│   PostgreSQL 15  │    │   ML SERVICE        │
│   + PostGIS 3.4  │    │   FastAPI (Python)  │
│   port 5432      │    │   port 8001         │
│                  │    │   (internal only)   │
│  Primary data    │    │                     │
│  Spatial index   │    │  DBSCAN · KDE       │
│  Full-text idx   │    │  Prophet · OR-Tools │
│  Audit log       │    │  scikit-learn       │
└──────────────────┘    └─────────────────────┘
       │
  ┌────┴──────┐
  ▼           ▼
┌──────┐  ┌──────────────┐
│Redis │  │ MinIO / S3   │
│Cache │  │ Attachments  │
│6379  │  │ port 9000    │
└──────┘  └──────────────┘
```

---

## Services

### 1. Frontend — Next.js 15
**Responsibility:** Render the UI, handle user interaction, visualize data on maps and charts.

- **Framework:** Next.js 15 with App Router, React 19, TypeScript
- **Maps:** Leaflet + react-leaflet for interactive crime maps, heatmaps, marker clusters
- **Charts:** Recharts for time-series forecasts, seasonal trends, zone comparisons
- **UI:** shadcn/ui (Radix primitives) + Tailwind CSS 4
- **Auth:** HttpOnly cookie — browser sends it automatically, no manual token handling
- **API calls:** All go to `/api/v1/*` via Nginx. `credentials: 'include'` on every fetch.
- **State:** React local state + URL query params for filter persistence
- **Real-time:** EventSource (SSE) for live FIR alerts and crime spike notifications

**Key pages (13 dashboard routes + 3 public):**
| Route | Purpose | Status |
|---|---|---|
| `/landing_page` | Hero landing with stat preview + auth portal | ✅ Implemented |
| `/login` | JWT auth | ✅ Implemented |
| `/signup` | Account registration | ✅ Implemented |
| `/dashboard` | Overview: 9 KPI cards, map preview, recent FIRs, system health | ✅ Implemented |
| `/dashboard/hotspots` | DBSCAN clusters + KDE heatmap, women safety overlay, IRAD layer, district shading, Top-N charts | ✅ Implemented |
| `/dashboard/firs` | FIR table (7 filters, bulk JSON import, CSV export, 10+ field form, pagination) | ✅ Implemented |
| `/dashboard/analytics` | 7 tabs: Forecasts, Seasonal, Behavioral, Risk Scores, Zone Compare, Women Safety, Anomalies | ✅ Implemented |
| `/dashboard/behavioral` | Cluster count cards, incident pattern table with tags, date-range filter | ✅ Minimal |
| `/dashboard/patrols` | Route generation (DISTRICT/STATION, 1–N vehicles), Leaflet preview, saved routes | ✅ Implemented |
| `/dashboard/irad` | JSON upload, KDE accident heatmap, accident records table | ✅ Implemented |
| `/dashboard/reports` | Configurable forecast (7–60 days), actual vs forecast chart, downloadable tables | ✅ Implemented |
| `/dashboard/women-safety` | Women safety intelligence layer (KDE + FIR classification) | ⚠️ Stub |
| `/dashboard/geo-fences` | Boundary zone monitoring and alert configuration | ⚠️ Stub |
| `/dashboard/users` | User management (ADMIN role only) | ⚠️ Stub |
| `/dashboard/audit-log` | Audit history of all API operations | ⚠️ Stub |
| `/dashboard/settings` | System preferences and configuration | ⚠️ Stub |

**Topbar features (as of 2026-05-09):**
- Breadcrumb navigation: `Station · Page eyebrow → Page title`
- Theme toggle (dark ↔ light, persisted in localStorage)
- "Brief" button (AI summary action)
- "Register FIR" primary CTA (quick FIR intake)
- Bell notifications icon
- Logout button

---

### 2. Backend — Node.js / Express 5
**Responsibility:** Business logic, authentication, authorization, data persistence, ML service orchestration.

- **Framework:** Express 5 (ES modules, `import/export`)
- **Auth:** JWT (access token 15min in HttpOnly cookie) + refresh tokens (7 days, hashed in DB)
- **RBAC:** Three roles — `ADMIN`, `OFFICER`, `ANALYST`
- **Validation:** Zod schemas on every endpoint (body + query params)
- **DB:** `pg` pool connecting to PostgreSQL. Parameterized queries only (no ORM — raw SQL).
- **Caching:** Redis via ioredis — hotspot results cached 30 min
- **Logging:** Pino structured JSON logs with correlation IDs
- **Real-time:** SSE via in-memory client Set — broadcasts FIR events to subscribed dashboards
- **Background jobs:** BullMQ for ML training jobs (non-blocking)
- **Circuit breaker:** Opossum around all ML service calls

**Internal structure:**
```
app.js          → Express setup, middleware chain, route mounting
server.js       → HTTP server, graceful shutdown, cron jobs
config/db.js    → pg Pool with tuned settings
middlewares/    → auth, validate, audit, rateLimit, correlationId, error
routes/         → 11 route files (one per domain)
controllers/    → Thin layer: parse request → call service → send response
services/       → Business logic: orchestrate model calls, call ML service
models/         → SQL queries: parameterized pg.query() calls
validators/     → Zod schemas for every endpoint
utils/          → logger, cache, jwt, response, spatial, queue, metrics
```

**Middleware chain order (app.js):**
```
correlationId → helmet → pino-http → cors → cookieParser →
rateLimit (global) → express.json() → routes
```

---

### 3. ML Service — Python FastAPI
**Responsibility:** Computationally expensive spatial/statistical/ML operations that would block Node.js.

- **Framework:** FastAPI with uvicorn (2 workers in production)
- **Access:** Internal Docker network only. Never exposed to public. Requires `X-API-Key` header.
- **Algorithms:** DBSCAN, KDE, Prophet, OR-Tools VRP, Random Forest, Ridge regression, SHAP, Moran's I, Isolation Forest
- **Models:** Persisted as `.pkl` files in `ml-service/app/models/` via joblib
- **No DB access:** All data comes from the backend via HTTP request body

**Endpoints:**
| Endpoint | Algorithm | Use case |
|---|---|---|
| `POST /cluster` | DBSCAN (haversine) | Crime hotspot cluster detection |
| `POST /hotspots/kde` | KDE (scikit-learn) | Density heatmap generation |
| `POST /forecast` | Prophet | 30-day crime count forecasting |
| `POST /routes/optimize` | OR-Tools VRP | Patrol route optimization |
| `POST /risk-score` | Ridge regression | Zone risk scoring |
| `POST /classify/train` | Random Forest | Train crime classifier |
| `POST /classify/predict` | Random Forest | Predict crime category |
| `POST /spatial/morans-i` | Moran's I (PySAL) | Spatial autocorrelation test |
| `POST /evaluation/pai` | PAI metric | Hotspot accuracy evaluation |
| `POST /risk/explain` | SHAP | Risk score explainability |
| `POST /anomaly/detect` | Isolation Forest | Crime spike detection |
| `POST /near-repeat` | Knox test | Near-repeat victimization |
| `POST /nlp/extract` | spaCy NER | Entity extraction from FIR text |
| `GET /health` | — | Health check |

---

### 4. PostgreSQL 15 + PostGIS 3.4
**Responsibility:** Persistent storage. Only the backend connects to it.

- **Spatial:** GEOGRAPHY(Point) for crime locations, GEOMETRY(MultiPolygon) for zone boundaries
- **Indexes:** GIST (spatial), GIN (full-text), BTree (composite for common filters)
- **Encryption:** pgcrypto for sensitive FIR notes
- **Migrations:** node-pg-migrate with timestamped `.cjs` migration files
- **Connection:** pg pool, `max=20`, `idleTimeoutMillis=30s`, `statement_timeout=30s`
- **Backup:** Daily `pg_dump -Fc` → object storage (see `backup.md`)

---

### 5. Redis
**Responsibility:** Two uses — response caching and BullMQ job queue.

- **Caching:** Hotspot results keyed by `hotspots:{zone}:{fromDate}:{toDate}:{crimeType}` with 30 min TTL. Invalidated on FIR bulk import.
- **BullMQ:** Background job queue for ML training. Jobs persist across restarts.
- **Access:** Internal Docker network only (no public port).

---

## Request Lifecycle Examples

### FIR Creation Request
```
Officer browser
  │
  ├─ POST /api/v1/fir  (HttpOnly cookie sent automatically)
  │
  ▼ Nginx
  ├─ Rate limit check (global: 30r/s)
  │
  ▼ Backend
  ├─ correlationId middleware → generates X-Request-Id
  ├─ auth middleware → reads cookie → verifies JWT → sets req.user
  ├─ authorize('ADMIN','OFFICER') → checks role
  ├─ validate(firSchema) → Zod validates body
  ├─ fir.controller.js → calls fir.service.js
  ├─ fir.service.js → calls fir.model.js
  ├─ fir.model.js → INSERT INTO firs ... (parameterized)
  ├─ fir.service.js → geo-fence check → broadcast SSE if triggered
  ├─ audit.middleware.js → INSERT INTO audit_logs
  └─ response: 201 { success: true, data: { id, fir_no, ... } }
```

### Hotspot Map Load
```
Dashboard browser
  │
  ├─ GET /api/v1/hotspots?zone=Patna&fromDate=2025-01-01&toDate=2025-12-31
  │
  ▼ Backend
  ├─ auth middleware (reads cookie)
  ├─ hotspot.service.js → check Redis cache
  │     HIT  → return cached result (< 5ms)
  │     MISS → continue
  ├─ fir.model.js → SELECT lat/lon from hotspot_candidates view (PostGIS)
  ├─ ml.service.js → POST http://ml-service:8001/cluster  (internal network)
  │     circuit breaker checks state
  │     if OPEN → return fallback { fallback: true, data: [] }
  ├─ ml-service → DBSCAN → returns clusters
  ├─ hotspot.service.js → SET Redis cache (TTL 30 min)
  └─ response: 200 { clusters: [...], heatPoints: [...] }
```

### ML Training (Background Job)
```
Admin browser
  │
  ├─ POST /api/v1/ml/classify/train  { fir_records: [...] }
  │
  ▼ Backend
  ├─ auth + authorize('ADMIN')
  ├─ ml.controller.js → mlQueue.add('train_classifier', payload)
  └─ response: 202 { jobId: 'abc123', message: 'Training queued' }

  [BullMQ worker picks up job]
  │
  ├─ POST http://ml-service:8001/classify/train
  ├─ ML service → RandomForest.fit() → saves .pkl
  └─ Job state → 'completed', result stored in Redis

Frontend polls GET /api/v1/ml/jobs/abc123 every 3s
  └─ When state='completed' → shows accuracy metrics
```

---

## Data Flow

### Crime Data Pipeline
```
Field Officer
  └─► Register FIR (manual)         ──┐
      Bulk CSV import                 ├─► firs table (PostgreSQL)
      CCTNS API import               ──┘
                                          │
                                          ▼
                                   hotspot_candidates (view)
                                          │
                    ┌─────────────────────┼──────────────────────┐
                    ▼                     ▼                       ▼
             DBSCAN clusters        KDE heatmap           Prophet forecast
             (cluster map)          (heat layer)          (trend chart)
                    │                     │                       │
                    └─────────────────────┴───────────────────────┘
                                          │
                                          ▼
                                   Dashboard Frontend
                                   (Leaflet map + Recharts)
```

### Authentication Flow
```
Login form
  └─► POST /api/v1/auth/login
        │
        ├─ Verify password (bcrypt, cost=12)
        ├─ Check account not locked
        ├─ Generate access token (JWT, 15 min)
        ├─ Generate refresh token (64 bytes random)
        ├─ SHA-256(refresh token) → store in refresh_tokens table
        ├─ Set cookie: token=<jwt>; HttpOnly; Secure; SameSite=Strict
        ├─ Set cookie: refreshToken=<raw>; HttpOnly; Secure; SameSite=Strict
        └─ Response: 200 { user: { id, name, role } }

Every API request
  └─► auth middleware reads 'token' cookie → verify JWT
        │
        ├─ Valid: set req.user → continue
        └─ Expired 401: frontend auto-calls POST /api/v1/auth/refresh
              └─ Backend: hash cookie refreshToken → lookup → issue new JWT cookie
```

---

## Docker Network Topology

```yaml
networks:
  public:   frontend ↔ backend ↔ nginx
  internal: backend ↔ ml-service ↔ redis ↔ postgres ↔ minio

Ports exposed to host:
  80/443  → nginx (public entry point)
  9001    → minio console (admin only, firewall in production)

Ports internal only (not published to host):
  4000    → backend
  3000    → frontend
  8001    → ml-service
  5432    → postgres
  6379    → redis
  9000    → minio API
```

---

## Technology Choices — Rationale

| Choice | Alternative | Why we chose it |
|---|---|---|
| PostgreSQL + PostGIS | MongoDB | Native spatial queries (ST_DWithin, GIST index) — no application-layer geo math |
| Express 5 | NestJS, Fastify | Minimal, team already knows it, ESM support |
| FastAPI (Python) | Node ML lib | Python ML ecosystem (scikit-learn, Prophet, OR-Tools) is unmatched |
| Prophet | ARIMA, LSTM | Best out-of-box for daily/weekly seasonality with minimal tuning |
| OR-Tools | Custom routing | Google's VRP solver handles large route sets in milliseconds |
| DBSCAN | K-means, HDBSCAN | Works without specifying cluster count; noise-aware; haversine-compatible |
| KDE | Grid counting | Smooth probability density; better for sparse crime data |
| Redis | Memcached | Dual-use: cache + BullMQ queue store; persistence across restarts |
| Next.js App Router | CRA, Vite | SSR for SEO + API routes + file-based routing |
| Leaflet | Google Maps, Mapbox | Open source, no API key cost, react-leaflet ecosystem |
| Pino | Winston, Morgan | 5x faster than Winston; native JSON output for log aggregation |
| Zod | Joi, Yup | TypeScript-first; parse, not just validate; great error messages |

---

## Scalability Path

**Current (single server):**
All 5 containers on one machine. Suitable for demo and small deployment.

**Next step (vertical):**
Increase `DB_POOL_MAX`, add `--workers 4` to uvicorn, tune Redis memory limit.

**Horizontal scaling:**
- Backend: stateless (JWT in cookie, session in Redis) → can run multiple instances behind Nginx upstream
- ML service: stateless (models on shared volume) → can run multiple instances
- Frontend: Next.js with output=standalone → can run multiple instances
- PostgreSQL: add read replica for analytics queries
- Redis: Redis Cluster for high availability

**Full production (cloud):**
- Managed PostgreSQL: AWS RDS or Supabase
- Managed Redis: Upstash or Elasticache
- Object storage: AWS S3 or Cloudflare R2
- Container orchestration: Kubernetes (EKS) or Docker Swarm
- CDN: Cloudflare for static assets

---

*See [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md) for the data layer detail.*  
*See [API_REFERENCE.md](API_REFERENCE.md) for endpoint documentation.*  
*See [ML_ALGORITHMS.md](ML_ALGORITHMS.md) for ML algorithm details.*
