# Environment Variables Reference
**Crime Predictive Hotspot Mapping System**  
Last updated: 2026-04-20

---

## Overview

Three services each have their own environment file. Keep them separate — never share a `.env` across services.

| Service | File | Example file |
|---|---|---|
| Backend | `backend/.env` | `backend/.env.example` |
| Frontend | `frontend/.env.local` | `frontend/.env.local.example` |
| ML Service | `ml-service/.env` | `ml-service/.env.example` |

**Rules:**
- Never commit `.env`, `.env.local` — only `.env.example` files go to git
- Never put real secrets in `.env.example` — use placeholder values like `CHANGE_ME`
- All secrets must be rotated if ever committed to git history

---

## Backend — `backend/.env`

### Database

| Variable | Required | Default | Description |
|---|---|---|---|
| `DATABASE_URL` | Yes* | — | Full PostgreSQL connection string. If set, overrides individual DB_* vars. Format: `postgresql://user:pass@host:5432/dbname` |
| `DB_HOST` | Yes* | `localhost` | Database server hostname |
| `DB_PORT` | No | `5432` | Database server port |
| `DB_USER` | Yes* | — | Database username |
| `DB_PASSWORD` | Yes* | — | Database password |
| `DB_NAME` | Yes* | `crime_hotspot_db` | Database name |
| `DB_SSL` | No | `false` | Set to `true` for managed cloud databases (e.g. Render, Supabase) |
| `DB_POOL_MAX` | No | `20` | Maximum simultaneous DB connections |
| `DB_POOL_MIN` | No | `2` | Minimum idle DB connections kept alive |
| `DB_ENCRYPTION_KEY` | Yes | — | Key for pgp_sym_encrypt on `firs.sensitive_notes_enc`. Min 32 chars. Must never change after data is encrypted. |

*Either `DATABASE_URL` alone **or** all of `DB_HOST`, `DB_USER`, `DB_PASSWORD`, `DB_NAME` together.

**Example:**
```env
DATABASE_URL=postgresql://crimemap:s3cur3p4ss@localhost:5432/crime_hotspot_db
DB_SSL=false
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_ENCRYPTION_KEY=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6
```

---

### Authentication

| Variable | Required | Default | Description |
|---|---|---|---|
| `JWT_SECRET` | Yes | — | Secret key for signing JWT access tokens. Min 64 chars of random data. Rotate if compromised. |
| `JWT_EXPIRES_IN` | No | `15m` | Access token lifetime. Short values = more secure. Use `m` (minutes), `h` (hours). |
| `CSRF_SECRET` | No | Falls back to `JWT_SECRET` | Secret for CSRF double-submit cookie. Can be same as JWT_SECRET but separate is better. |
| `BCRYPT_ROUNDS` | No | `12` | bcrypt work factor. Higher = slower hashing. Never go below 10 in production. |

**Generate secrets:**
```bash
# JWT_SECRET (Node.js)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# Or use openssl
openssl rand -hex 64
```

**Example:**
```env
JWT_SECRET=a1b2c3d4...64_random_chars...
JWT_EXPIRES_IN=15m
BCRYPT_ROUNDS=12
```

---

### Server

| Variable | Required | Default | Description |
|---|---|---|---|
| `PORT` | No | `4000` | HTTP port the backend listens on |
| `NODE_ENV` | No | `development` | Set to `production` in deployed environments. Affects cookie `Secure` flag, Pino transport, error detail in responses. |
| `LOG_LEVEL` | No | `info` | Pino log level: `trace`, `debug`, `info`, `warn`, `error`, `fatal` |

---

### CORS & Rate Limiting

| Variable | Required | Default | Description |
|---|---|---|---|
| `CORS_ORIGIN` | Yes | `http://localhost:3000` | Exact origin(s) allowed. In production: `https://yourdomain.com`. Multiple origins: comma-separated. |
| `RATE_LIMIT_WINDOW_MS` | No | `60000` | Global rate limit window in milliseconds (default 60 seconds) |
| `RATE_LIMIT_MAX` | No | `200` | Max requests per window per IP (global limit) |

---

### ML Service

| Variable | Required | Default | Description |
|---|---|---|---|
| `ML_SERVICE_URL` | Yes | `http://localhost:8001` | URL of the FastAPI ML service. In Docker: `http://ml-service:8001` |
| `ML_API_KEY` | Yes | — | Shared secret between backend and ML service. Backend sends as `X-API-Key` header. ML service validates it. Min 32 chars. |

---

### Redis

| Variable | Required | Default | Description |
|---|---|---|---|
| `REDIS_URL` | No | `redis://localhost:6379` | Redis connection URL. In Docker: `redis://redis:6379` |

---

### Object Storage (MinIO / S3)

| Variable | Required | Default | Description |
|---|---|---|---|
| `S3_ENDPOINT` | No | — | MinIO endpoint: `http://minio:9000`. For AWS S3: leave empty (uses default). |
| `S3_ACCESS_KEY` | No | — | S3/MinIO access key |
| `S3_SECRET_KEY` | No | — | S3/MinIO secret key |
| `S3_BUCKET` | No | `crime-map-attachments` | Bucket name for FIR attachments |
| `S3_REGION` | No | `us-east-1` | AWS region (unused for MinIO) |

---

### Email (SMTP)

| Variable | Required | Default | Description |
|---|---|---|---|
| `SMTP_HOST` | No | — | SMTP server hostname (e.g. `smtp.gmail.com`) |
| `SMTP_PORT` | No | `587` | SMTP port. 587 = TLS (STARTTLS), 465 = SSL |
| `SMTP_USER` | No | — | SMTP login username |
| `SMTP_PASS` | No | — | SMTP password or app password |
| `SMTP_FROM` | No | — | Sender email address. e.g. `noreply@crimemap.bihar.gov.in` |

*SMTP vars only required if weekly report email (Task 6.3) is enabled.*

---

### AI / LLM (Natural Language Query)

| Variable | Required | Default | Description |
|---|---|---|---|
| `ANTHROPIC_API_KEY` | No | — | Anthropic API key for natural language query feature (Task 6.7). Get from console.anthropic.com |

---

### Complete `backend/.env.example`

```env
# ── Database ──────────────────────────────────────────────────
DATABASE_URL=postgresql://crimemap:CHANGE_ME@localhost:5432/crime_db
DB_SSL=false
DB_POOL_MAX=20
DB_POOL_MIN=2
DB_ENCRYPTION_KEY=CHANGE_ME_32_CHARS_MIN

# ── Authentication ─────────────────────────────────────────────
JWT_SECRET=CHANGE_ME_64_CHARS_MIN
JWT_EXPIRES_IN=15m
CSRF_SECRET=CHANGE_ME_64_CHARS_MIN
BCRYPT_ROUNDS=12

# ── Server ─────────────────────────────────────────────────────
PORT=4000
NODE_ENV=development
LOG_LEVEL=info

# ── CORS & Rate Limiting ───────────────────────────────────────
CORS_ORIGIN=http://localhost:3000
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX=200

# ── ML Service ─────────────────────────────────────────────────
ML_SERVICE_URL=http://localhost:8001
ML_API_KEY=CHANGE_ME_32_CHARS_MIN

# ── Redis ──────────────────────────────────────────────────────
REDIS_URL=redis://localhost:6379

# ── Object Storage ─────────────────────────────────────────────
S3_ENDPOINT=http://localhost:9000
S3_ACCESS_KEY=minio
S3_SECRET_KEY=CHANGE_ME
S3_BUCKET=crime-map-attachments
S3_REGION=us-east-1

# ── Email ──────────────────────────────────────────────────────
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=noreply@example.com
SMTP_PASS=CHANGE_ME
SMTP_FROM=noreply@crimemap.bihar.gov.in

# ── AI ─────────────────────────────────────────────────────────
ANTHROPIC_API_KEY=CHANGE_ME
```

---

## Frontend — `frontend/.env.local`

| Variable | Required | Default | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_BASE` | Yes | `http://localhost:4000` | Backend API base URL. Must be accessible from the user's browser (not Docker internal). In production: `https://api.yourdomain.com` |
| `NEXT_PUBLIC_MAP_TILE_URL` | No | OpenStreetMap default | Custom tile server URL for Leaflet. Leave empty to use free OSM tiles. |
| `NEXT_PUBLIC_APP_NAME` | No | `Crime Predictive System` | App name shown in browser title and header |
| `NEXT_PUBLIC_ENVIRONMENT` | No | `development` | `development` or `production`. Controls debug UI. |

**Important:** All `NEXT_PUBLIC_*` variables are **visible to the browser**. Never put secrets here.

### Complete `frontend/.env.local.example`

```env
# ── API ────────────────────────────────────────────────────────
NEXT_PUBLIC_API_BASE=http://localhost:4000

# ── Map ────────────────────────────────────────────────────────
# Leave empty to use default OpenStreetMap tiles (free, no key needed)
NEXT_PUBLIC_MAP_TILE_URL=

# ── App ────────────────────────────────────────────────────────
NEXT_PUBLIC_APP_NAME=Crime Predictive System
NEXT_PUBLIC_ENVIRONMENT=development
```

---

## ML Service — `ml-service/.env`

| Variable | Required | Default | Description |
|---|---|---|---|
| `ML_API_KEY` | Yes | — | Must match `ML_API_KEY` in backend. All requests validated against this. |
| `MODEL_DIR` | No | `./app/models` | Directory where trained `.pkl` model files are saved |
| `LOG_LEVEL` | No | `info` | Uvicorn log level: `debug`, `info`, `warning`, `error` |
| `WORKERS` | No | `2` | Number of uvicorn worker processes (set to CPU count in production) |

### Complete `ml-service/.env.example`

```env
# ── Security ───────────────────────────────────────────────────
ML_API_KEY=CHANGE_ME_32_CHARS_MIN

# ── Model Storage ──────────────────────────────────────────────
MODEL_DIR=./app/models

# ── Server ─────────────────────────────────────────────────────
LOG_LEVEL=info
WORKERS=2
```

---

## Docker Compose Environment

When using `docker-compose.yml`, variables are passed to each service's `environment:` block. Sensitive values should come from a root `.env` file that is **not committed to git**.

**Root `.env` (Docker Compose reads this automatically):**
```env
# Shared across services
POSTGRES_USER=crimemap
POSTGRES_PASSWORD=CHANGE_ME
POSTGRES_DB=crime_db

JWT_SECRET=CHANGE_ME_64_CHARS
ML_API_KEY=CHANGE_ME_32_CHARS
DB_ENCRYPTION_KEY=CHANGE_ME_32_CHARS

MINIO_ROOT_USER=minio
MINIO_ROOT_PASSWORD=CHANGE_ME

CORS_ORIGIN=http://localhost:3000
```

**`docker-compose.yml` references these as:**
```yaml
services:
  backend:
    environment:
      DATABASE_URL: postgresql://${POSTGRES_USER}:${POSTGRES_PASSWORD}@db:5432/${POSTGRES_DB}
      JWT_SECRET: ${JWT_SECRET}
      ML_API_KEY: ${ML_API_KEY}
```

---

## Production Checklist

Before deploying to production, verify every item:

- [ ] `JWT_SECRET` — at least 64 random chars, different from development
- [ ] `DB_PASSWORD` — strong password, different from development
- [ ] `DB_ENCRYPTION_KEY` — recorded securely; **cannot change** after notes are encrypted
- [ ] `ML_API_KEY` — at least 32 random chars
- [ ] `CSRF_SECRET` — at least 64 random chars
- [ ] `NODE_ENV=production` — enables Secure cookie flag, disables debug output
- [ ] `DB_SSL=true` — required for managed cloud databases
- [ ] `CORS_ORIGIN` — set to your actual production domain, not `*`
- [ ] `NEXT_PUBLIC_API_BASE` — set to your production API domain
- [ ] `SMTP_*` — configured for real email delivery
- [ ] No real secrets in git history (`git log --all -- backend/.env`)

---

## Generating Secure Values

```bash
# 64-character hex string (for JWT_SECRET, CSRF_SECRET)
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"

# 32-character hex string (for ML_API_KEY, DB_ENCRYPTION_KEY)
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"

# Or with openssl
openssl rand -hex 64
openssl rand -hex 32
```
