# Local Development Setup Guide
**Crime Predictive Hotspot Mapping System**  
Last updated: 2026-04-20

---

## Prerequisites

Install these before starting. Verify each with the version command shown.

| Tool | Minimum Version | Check | Install |
|---|---|---|---|
| Node.js | 22.x | `node --version` | https://nodejs.org |
| Python | 3.11 | `python --version` | https://python.org |
| PostgreSQL | 15 | `psql --version` | https://postgresql.org |
| PostGIS | 3.4 | (install with PostgreSQL) | https://postgis.net |
| Docker Desktop | 24+ | `docker --version` | https://docker.com |
| Docker Compose | 2.x | `docker compose version` | (included with Docker Desktop) |
| Git | any | `git --version` | https://git-scm.com |

**Windows users:** Install Docker Desktop. This handles PostgreSQL, Redis, and MinIO automatically — you do not need to install them separately if you use Docker for the database.

**Optional but recommended:**
- VS Code with ESLint, Prettier, and Pylance extensions
- pgAdmin or DBeaver for database inspection
- Bruno or Postman for API testing

---

## Option A — Full Docker Setup (Recommended)

Run everything in containers. No local PostgreSQL/Redis/Python installation needed.

### Step 1 — Clone and enter the project

```bash
git clone <your-repo-url>
cd "Crime Predictive Model"
```

### Step 2 — Create environment files

```bash
# Backend
cp backend/.env.example backend/.env

# Frontend
cp frontend/.env.local.example frontend/.env.local

# ML service
cp ml-service/.env.example ml-service/.env
```

Now edit each file and fill in real values. At minimum change these:

**`backend/.env`:**
```env
DATABASE_URL=postgresql://crimemap:changeme@db:5432/crime_db
JWT_SECRET=<generate: node -e "console.log(require('crypto').randomBytes(64).toString('hex'))">
ML_API_KEY=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
DB_ENCRYPTION_KEY=<generate: node -e "console.log(require('crypto').randomBytes(32).toString('hex'))">
CORS_ORIGIN=http://localhost:3000
ML_SERVICE_URL=http://ml-service:8001
REDIS_URL=redis://redis:6379
NODE_ENV=development
```

**`ml-service/.env`:**
```env
ML_API_KEY=<same value as backend ML_API_KEY>
```

**`frontend/.env.local`:**
```env
NEXT_PUBLIC_API_BASE=http://localhost:4000
```

### Step 3 — Build and start all services

```bash
docker compose up -d --build
```

This starts: PostgreSQL, Redis, ML service, Backend, Frontend (and MinIO if configured).

First build takes 3–5 minutes. Subsequent starts take ~20 seconds.

### Step 4 — Run database migrations

```bash
docker compose exec backend npm run migrate:up
```

### Step 5 — Seed the database

```bash
# Seed crime classifications (IPC sections — required)
docker compose exec backend npm run seed:classifications

# Seed Bihar district boundaries (required for zone map)
docker compose exec backend npm run seed:district-boundaries

# Seed demo FIR data (optional — 500 synthetic FIRs for testing)
docker compose exec backend npm run seed:demo
```

### Step 6 — Verify everything is running

```bash
# Check all containers are up
docker compose ps

# Check backend health
curl http://localhost:4000/api/v1/health

# Expected:
# {"status":"ok","checks":{"database":{"status":"ok"},"ml_service":{"status":"ok"}}}
```

### Step 7 — Open the app

| Service | URL |
|---|---|
| Frontend dashboard | http://localhost:3000 |
| Backend API | http://localhost:4000/api/v1 |
| Swagger API docs | http://localhost:4000/api/docs |
| ML service docs | http://localhost:8001/docs |
| MinIO console | http://localhost:9001 |

**Default admin login:**
```
Email: admin@crimemap.bihar.gov.in
Password: Admin@1234
```
Change this immediately after first login.

---

## Option B — Local Development (Without Docker)

Run each service directly on your machine. Good for active development (faster hot-reload, easier debugging).

### Step 1 — Start PostgreSQL with PostGIS

**Option B1 — Using Docker just for the database (easiest):**
```bash
docker compose up -d db redis
```

**Option B2 — Local PostgreSQL:**
```bash
# Create database and user
psql -U postgres
CREATE USER crimemap WITH PASSWORD 'changeme';
CREATE DATABASE crime_hotspot_db OWNER crimemap;
\c crime_hotspot_db
CREATE EXTENSION postgis;
CREATE EXTENSION pgcrypto;
CREATE EXTENSION "uuid-ossp";
CREATE EXTENSION pg_trgm;
\q
```

### Step 2 — Set up the backend

```bash
cd backend
cp .env.example .env
# Edit .env — set DATABASE_URL, JWT_SECRET, ML_API_KEY, DB_ENCRYPTION_KEY
# For local DB: DATABASE_URL=postgresql://crimemap:changeme@localhost:5432/crime_hotspot_db
# For local ML: ML_SERVICE_URL=http://localhost:8001
# For local Redis: REDIS_URL=redis://localhost:6379

npm install
npm run migrate:up
npm run seed:classifications
npm run seed:district-boundaries
npm run seed:demo       # optional
npm run dev             # starts with --watch (auto-restarts on file change)
```

Backend runs on http://localhost:4000

### Step 3 — Set up the ML service

```bash
cd ml-service
cp .env.example .env
# Edit .env — set ML_API_KEY (same value as backend)

# Create Python virtual environment
python -m venv venv

# Activate
# Windows:
venv\Scripts\activate
# Mac/Linux:
source venv/bin/activate

# Install dependencies
pip install -r requirements.txt

# Download spaCy language model (for NLP entity extraction)
python -m spacy download en_core_web_sm

# Start the ML service
uvicorn app.main:app --host 0.0.0.0 --port 8001 --reload
```

ML service runs on http://localhost:8001  
Swagger docs at http://localhost:8001/docs

### Step 4 — Set up the frontend

```bash
cd frontend
cp .env.local.example .env.local
# NEXT_PUBLIC_API_BASE=http://localhost:4000

npm install
npm run dev
```

Frontend runs on http://localhost:3000

### Step 5 — Verify

Open three terminals (one per service) and check no red errors appear.

Visit http://localhost:3000 → login with admin credentials → the dashboard should load with zone stats.

---

## Common Errors and Fixes

### `Error: ECONNREFUSED 127.0.0.1:5432` (Backend)
Database is not running or wrong connection string.
```bash
# Check if DB container is running
docker compose ps

# Check DATABASE_URL in backend/.env
# In Docker setup: host should be 'db', not 'localhost'
DATABASE_URL=postgresql://crimemap:changeme@db:5432/crime_db

# In local setup: host should be 'localhost'
DATABASE_URL=postgresql://crimemap:changeme@localhost:5432/crime_db
```

### `extension "postgis" is not available` (Migration)
PostGIS not installed in PostgreSQL.
```bash
# With Docker — use the postgis image (already in docker-compose.yml):
image: postgis/postgis:15-3.4

# Manual local install (Ubuntu):
sudo apt install postgresql-15-postgis-3

# Manual local install (Windows):
# Re-run PostgreSQL installer and check PostGIS in the Stack Builder
```

### `Failed to load ML service` (Backend → ML)
ML service not running or wrong URL.
```bash
# Check ML service is running
curl http://localhost:8001/health

# In Docker, check the ML_SERVICE_URL in backend/.env:
ML_SERVICE_URL=http://ml-service:8001   # Docker
ML_SERVICE_URL=http://localhost:8001    # Local

# Check the ML_API_KEY matches in both backend/.env and ml-service/.env
```

### `Module not found: 'prophet'` (ML service)
Prophet not installed.
```bash
pip install prophet
# If that fails on Windows:
pip install pystan==2.19.1.1
pip install prophet
```

### `No module named 'libpysal'` (Moran's I)
PySAL dependencies not installed.
```bash
pip install libpysal esda
```

### `CORS error` (Frontend)
Browser blocks request from frontend origin.
```bash
# Check CORS_ORIGIN in backend/.env exactly matches the frontend URL
CORS_ORIGIN=http://localhost:3000   # No trailing slash

# For Docker: the frontend browser makes requests to localhost:4000
# (not to the Docker internal network)
CORS_ORIGIN=http://localhost:3000
```

### `JWT cookie not sent` (Auth fails after login)
Frontend fetch calls missing `credentials: 'include'`.
```typescript
// All API calls must have:
fetch(url, { credentials: 'include' })
// Or in the global API client, set this as default
```

### `hydration error` (Next.js)
Server and client rendered different HTML — usually from a browser extension or dynamic content (maps, dates).
```bash
# Add 'use client' to the affected component
# Wrap dynamic content in useEffect
# For Leaflet maps: dynamic import with { ssr: false }
```

### Migration fails: `relation already exists`
Migration was partially applied. Roll back and re-run.
```bash
npm run migrate:down
npm run migrate:up
```

### Port already in use
Another process is on the same port.
```bash
# Windows — find and kill the process using port 4000
netstat -ano | findstr :4000
taskkill /PID <pid> /F

# Or change the port in .env and docker-compose.yml
```

---

## Development Workflow

### Making changes to the backend
```bash
# Backend auto-restarts on save (--watch flag in dev script)
# No restart needed for most changes

# After adding a new table or column:
npm run migrate:create -- add_my_column
# Edit the generated migration file
npm run migrate:up
```

### Making changes to the ML service
```bash
# Uvicorn auto-reloads on save (--reload flag)
# No restart needed

# After adding a new Python package:
pip install <package>
pip freeze > requirements.txt   # Update requirements file
```

### Making changes to the frontend
```bash
# Next.js hot-reloads on save automatically
# No restart needed for component and page changes
# Restart needed for next.config.ts changes
```

### Running the full stack reset (clean slate)
```bash
# Stop everything
docker compose down -v   # -v removes volumes (deletes database data)

# Restart fresh
docker compose up -d --build
docker compose exec backend npm run migrate:up
docker compose exec backend npm run seed:classifications
docker compose exec backend npm run seed:district-boundaries
```

---

## Database Management

### Access the database directly
```bash
# Via Docker
docker compose exec db psql -U crimemap -d crime_hotspot_db

# Via local psql
psql postgresql://crimemap:changeme@localhost:5432/crime_hotspot_db
```

### Useful psql commands
```sql
\dt                         -- List all tables
\d firs                     -- Describe firs table structure
SELECT COUNT(*) FROM firs;  -- Check row count
\q                          -- Quit
```

### Create a new migration
```bash
cd backend
npm run migrate:create -- my_migration_name
# Edit backend/migrations/<timestamp>_my_migration_name.cjs
npm run migrate:up
```

### Rollback last migration
```bash
npm run migrate:down
```

### Take a database backup
```bash
# Via Docker
docker compose exec db pg_dump -U crimemap crime_hotspot_db -Fc > backup_$(date +%Y%m%d).dump

# Restore
docker compose exec -T db pg_restore -U crimemap -d crime_hotspot_db < backup_20250420.dump
```

---

## Running Tests

```bash
# Backend integration tests (requires test DB)
cd backend
TEST_DATABASE_URL=postgresql://crimemap:changeme@localhost:5432/crime_hotspot_db_test npm test

# Frontend lint check
cd frontend
npm run lint

# Frontend build check (catches TypeScript errors)
cd frontend
npm run build

# ML service import check
cd ml-service
python -c "from app.main import app; print('OK')"
```

---

## Project Structure Quick Reference

```
Crime Predictive Model/
├── backend/
│   ├── src/
│   │   ├── app.js              ← Express app + middleware setup
│   │   ├── server.js           ← HTTP server + graceful shutdown
│   │   ├── config/db.js        ← PostgreSQL pool
│   │   ├── controllers/        ← Parse req → call service → send res
│   │   ├── services/           ← Business logic
│   │   ├── models/             ← SQL queries (pg parameterized)
│   │   ├── routes/             ← Express route definitions
│   │   ├── middlewares/        ← auth, validate, rateLimit, audit
│   │   ├── validators/         ← Zod schemas
│   │   └── utils/              ← logger, cache, jwt, queue
│   ├── migrations/             ← node-pg-migrate files
│   ├── scripts/                ← Seed scripts
│   └── .env                    ← Local config (not in git)
│
├── frontend/
│   ├── app/                    ← Next.js App Router pages
│   │   └── dashboard/          ← All dashboard pages
│   ├── components/             ← Reusable React components
│   │   ├── map/                ← Leaflet map components
│   │   └── ui/                 ← shadcn/ui components
│   ├── services/               ← API client functions
│   ├── hooks/                  ← Custom React hooks
│   └── .env.local              ← Local config (not in git)
│
├── ml-service/
│   ├── app/
│   │   ├── main.py             ← FastAPI endpoints
│   │   ├── schemas.py          ← Pydantic request/response models
│   │   ├── services/           ← Algorithm implementations
│   │   └── models/             ← Saved .pkl model files (gitignored)
│   └── .env                    ← Local config (not in git)
│
├── docs/                       ← All documentation
├── docker-compose.yml          ← Full-stack container config
└── nginx/nginx.conf            ← Reverse proxy config
```

---

## Getting Help

- **Architecture:** [ARCHITECTURE.md](ARCHITECTURE.md)
- **API endpoints:** [API_REFERENCE.md](API_REFERENCE.md)
- **Database tables:** [DATABASE_SCHEMA.md](DATABASE_SCHEMA.md)
- **Environment variables:** [ENV_REFERENCE.md](ENV_REFERENCE.md)
- **ML algorithms:** [ML_ALGORITHMS.md](ML_ALGORITHMS.md)
- **Implementation tasks:** [AI_IMPLEMENTATION_PLAN.md](AI_IMPLEMENTATION_PLAN.md)
