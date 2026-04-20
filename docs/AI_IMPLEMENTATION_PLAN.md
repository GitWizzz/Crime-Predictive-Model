# AI Implementation Plan — Crime Predictive Hotspot Mapping System
**Last Updated:** 2026-04-20  
**Purpose:** Step-by-step implementation guide — give each section directly to an AI to execute.  
**Scope:** Project only (research paper excluded).

---

## HOW TO USE THIS DOCUMENT

Each priority tier is a self-contained block. Give the AI the **Context Block** at the top of each task + the specific task section. The AI will have everything it needs to implement without asking you questions.

**Global Context (always include with any task):**
```
Project: Crime Predictive Hotspot Mapping System
Stack: Next.js 15 (frontend) + Node.js/Express 5 (backend) + Python FastAPI (ml-service) + PostgreSQL 15 + PostGIS 3.4
Folder structure:
  /backend/src/  → controllers/, routes/, services/, models/, middlewares/, validators/, utils/
  /frontend/app/ → dashboard/, login/, signup/
  /frontend/components/ → auth/, dashboard/, map/, ui/
  /ml-service/app/ → main.py, schemas.py, services/
  /docs/ → documentation files
Pattern: Controller calls Service calls Model. Zod validates all inputs. pg pool for DB queries. JWT auth via middleware.
```

---

---

# PRIORITY 1 — CRITICAL SECURITY FIXES
> **Do these first. They are breaking security issues.**

---

## TASK 1.1 — Fix bcrypt Rounds (6 → 12)

**Context:**  
The auth service hashes passwords with bcrypt. Currently the work factor (rounds) is set to 6, which is too low — OWASP minimum is 12. File: `backend/src/services/auth.service.js`

**What to do:**  
Find every `bcrypt.hash(...)` and `bcrypt.genSalt(...)` call in `backend/src/services/auth.service.js`. Change the rounds/cost factor from `6` to `12`. Also make it configurable via env: read `parseInt(process.env.BCRYPT_ROUNDS) || 12`. Add `BCRYPT_ROUNDS=12` to `backend/.env.example`.

---

## TASK 1.2 — Move JWT from localStorage to HttpOnly Cookies

**Context:**  
The frontend stores JWT tokens in `localStorage`, which is vulnerable to XSS attacks. The backend sends JWT as a JSON response body. We need to switch to HttpOnly cookies.

**Backend changes** (`backend/src/controllers/auth.controller.js`):  
After a successful login or signup, instead of (or in addition to) returning the token in the JSON body, set an HttpOnly cookie:
```javascript
res.cookie('token', token, {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'strict',
  maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days in ms
});
```
Add a `/api/auth/logout` endpoint that clears the cookie:
```javascript
res.clearCookie('token').json({ success: true });
```

**Backend middleware changes** (`backend/src/middlewares/auth.middleware.js`):  
The JWT middleware currently reads from `Authorization` header or `x-access-token`. Add cookie reading as a third option (check it first):
```javascript
const token = req.cookies?.token || req.headers['authorization']?.split(' ')[1] || req.headers['x-access-token'];
```
Add `cookie-parser` npm package to backend and register it in `app.js`: `app.use(cookieParser())`.

**Frontend changes** (`frontend/services/api.ts` or equivalent API client):  
- Remove all `localStorage.getItem('token')` and `localStorage.setItem('token', ...)` calls.
- Remove the `Authorization` header from API requests — the browser will send the HttpOnly cookie automatically with `credentials: 'include'`.
- Add `credentials: 'include'` to all `fetch()` calls or set it as a global default in the API client.
- Update the CORS config in `backend/src/app.js` to allow credentials: `cors({ origin: process.env.CORS_ORIGIN, credentials: true })`.
- Update login/signup page to not store anything in localStorage after auth.
- For logout: call `POST /api/auth/logout` to clear the cookie.

**Install:** `npm install cookie-parser` in the backend, `npm install @types/cookie-parser --save-dev`.

---

## TASK 1.3 — Isolate ML Service from Public Network

**Context:**  
In `docker-compose.yml`, the ML FastAPI service is currently exposed on port 8001 to the host machine. It has no authentication. Only the backend service should be able to reach it.

**What to do** in `docker-compose.yml`:  
1. Create two networks: `internal` (backend ↔ ml-service) and `public` (frontend ↔ backend).
2. Remove the `ports:` mapping from the `ml-service` service (or change to `expose:` instead of `ports:` so it is only reachable inside Docker network).
3. Put `ml-service` and `backend` on the `internal` network.
4. Put `frontend` and `backend` on the `public` network.

Example structure:
```yaml
networks:
  internal:
    driver: bridge
  public:
    driver: bridge

services:
  ml-service:
    expose:
      - "8001"       # internal only, not published to host
    networks:
      - internal

  backend:
    networks:
      - internal
      - public

  frontend:
    networks:
      - public
```
Also add a shared secret: add `ML_API_KEY` env var to both backend and ml-service. In `ml-service/app/main.py`, add a dependency that checks the `X-API-Key` header matches the env var. In `backend/src/services/ml.service.js`, add `'X-API-Key': process.env.ML_API_KEY` to all requests to the ML service.

---

## TASK 1.4 — Add API Version Prefix (v1)

**Context:**  
All API routes are currently at `/api/*`. Before deploying, we must add versioning so future breaking changes don't affect existing clients. Change to `/api/v1/*`.

**What to do** in `backend/src/app.js`:  
Change all `app.use('/api/xxx', ...)` route registrations to `app.use('/api/v1/xxx', ...)`.  
Update `frontend/.env.local`: change `NEXT_PUBLIC_API_BASE=http://localhost:4000` and update all API client calls that hardcode `/api/` to use `/api/v1/`.  
Update `docs/deployment.md` health check from `/api/health` to `/api/v1/health`.  
Update `docker-compose.yml` healthcheck if it pings `/api/health`.

---

## TASK 1.5 — Remove `.env` from Git, Secure Secrets

**Context:**  
The `backend/.env` file (with real secrets) may have been committed to git. This must be fixed permanently.

**What to do:**  
1. Check `git log --all --full-history -- backend/.env` — if the file appears in history, remove it from all history using `git filter-repo --path backend/.env --invert-paths` (install git-filter-repo first).
2. Add to `.gitignore` at the root: `**/.env`, `**/.env.local`, `!**/.env.example`.
3. Rotate all secrets that may have been committed: generate new `JWT_SECRET`, new `DB_PASSWORD`, new `DB_ENCRYPTION_KEY`.
4. Update `.env.example` files to have placeholder values (never real values).

---

## TASK 1.6 — Add Helmet.js HTTP Security Headers

**Context:**  
The backend has no HTTP security headers. Missing headers expose the app to clickjacking, MIME sniffing, and XSS attacks. Helmet.js adds 11 security headers in one middleware call.

**Install:** `npm install helmet` in the backend.

**Update `backend/src/app.js`** — add as the very first middleware (before CORS, before routes):
```javascript
import helmet from 'helmet';
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],  // Tailwind needs this
      imgSrc: ["'self'", "data:", "https://*.tile.openstreetmap.org"],  // Leaflet tiles
      connectSrc: ["'self'", process.env.CORS_ORIGIN],
    }
  },
  crossOriginEmbedderPolicy: false,  // Required for Leaflet map tiles
}));
```

This sets: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy`, `HSTS` (production), `X-XSS-Protection`, and Content-Security-Policy automatically.

---

## TASK 1.7 — Add Per-Route Rate Limiting for Auth Endpoints

**Context:**  
The global rate limiter (200 req/60s) applies uniformly to all routes. The login endpoint needs a much stricter limit — brute-force attackers will attempt thousands of password combinations. Login should allow only 10 attempts per 15 minutes per IP.

**Install:** `express-rate-limit` is already a dependency (used for global limiter). No new install needed.

**Create a strict auth rate limiter in `backend/src/middlewares/rateLimit.middleware.js`** (add alongside existing global limiter):
```javascript
import rateLimit from 'express-rate-limit';

export const authRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,  // 15 minutes
  max: 10,                    // 10 attempts per window
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: 'Too many login attempts. Try again in 15 minutes.' },
  skipSuccessfulRequests: true,  // Only count failed attempts
});

export const signupRateLimit = rateLimit({
  windowMs: 60 * 60 * 1000,  // 1 hour
  max: 5,                     // Max 5 signups per hour per IP
  message: { success: false, message: 'Too many accounts created. Try again later.' },
});
```

**Apply in `backend/src/routes/auth.routes.js`:**
```javascript
import { authRateLimit, signupRateLimit } from '../middlewares/rateLimit.middleware.js';
router.post('/login', authRateLimit, loginController);
router.post('/signup', signupRateLimit, signupController);
```

---

## TASK 1.8 — Add Account Lockout After Failed Login Attempts

**Context:**  
Rate limiting by IP can be bypassed using proxy rotation. Account-level lockout prevents attackers from brute-forcing a specific user's password regardless of which IP they use.

**Database:** Add to the `users` table via a new migration `backend/migrations/20260420_04_account_lockout.cjs`:
```sql
ALTER TABLE users ADD COLUMN IF NOT EXISTS failed_login_attempts INTEGER NOT NULL DEFAULT 0;
ALTER TABLE users ADD COLUMN IF NOT EXISTS locked_until TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS last_failed_login TIMESTAMPTZ;
```

**Update `backend/src/services/auth.service.js`** login function:
```javascript
const MAX_ATTEMPTS = 5;
const LOCK_DURATION_MS = 30 * 60 * 1000; // 30 minutes

// After fetching user by email:
if (user.locked_until && new Date(user.locked_until) > new Date()) {
  const minutesLeft = Math.ceil((new Date(user.locked_until) - new Date()) / 60000);
  throw new Error(`Account locked. Try again in ${minutesLeft} minutes.`);
}

// After bcrypt.compare() fails:
if (!passwordMatch) {
  const newAttempts = (user.failed_login_attempts || 0) + 1;
  const lockedUntil = newAttempts >= MAX_ATTEMPTS 
    ? new Date(Date.now() + LOCK_DURATION_MS) 
    : null;
  await pool.query(
    'UPDATE users SET failed_login_attempts = $1, locked_until = $2, last_failed_login = NOW() WHERE id = $3',
    [newAttempts, lockedUntil, user.id]
  );
  throw new Error('Invalid credentials');
}

// After successful login — reset counter:
await pool.query(
  'UPDATE users SET failed_login_attempts = 0, locked_until = NULL WHERE id = $1',
  [user.id]
);
```

---

## TASK 1.9 — Add CSRF Protection

**Context:**  
Moving to HttpOnly cookies (Task 1.2) requires CSRF protection. The `SameSite=Strict` cookie attribute prevents most CSRF, but for full compliance and defence-in-depth, add CSRF token validation for all state-changing endpoints.

**Install:** `npm install csrf-csrf` in the backend.

**Update `backend/src/app.js`:**
```javascript
import { doubleCsrf } from 'csrf-csrf';

const { generateToken, doubleCsrfProtection } = doubleCsrf({
  getSecret: () => process.env.CSRF_SECRET || process.env.JWT_SECRET,
  cookieName: '__Host-psifi.x-csrf-token',
  cookieOptions: {
    httpOnly: true,
    sameSite: 'strict',
    secure: process.env.NODE_ENV === 'production',
  },
  size: 64,
  getTokenFromRequest: (req) => req.headers['x-csrf-token'],
});

// Expose CSRF token endpoint (before protection middleware)
app.get('/api/v1/csrf-token', (req, res) => {
  res.json({ csrfToken: generateToken(req, res) });
});

// Apply CSRF protection to all state-changing routes
app.use('/api/v1', doubleCsrfProtection);
```

**Frontend:** On app load, call `GET /api/v1/csrf-token` and store the token in memory (not localStorage). Include it as `X-CSRF-Token` header in all POST/PUT/DELETE requests:
```typescript
// In frontend/services/api.ts
let csrfToken = '';
export const initCsrf = async () => {
  const res = await fetch('/api/v1/csrf-token', { credentials: 'include' });
  const data = await res.json();
  csrfToken = data.csrfToken;
};
// Add to all mutating requests:
headers: { 'X-CSRF-Token': csrfToken }
```

Add `CSRF_SECRET=<random-64-char-hex>` to `.env.example`.

---

---

# PRIORITY 2 — IMPORTANT BACKEND UPGRADES

---

## TASK 2.1 — Add Refresh Token System

**Context:**  
Currently JWT tokens expire after 7 days with no way to revoke them. We need short-lived access tokens (15 minutes) + long-lived refresh tokens (7 days) stored securely. When the access token expires, the refresh token is used to get a new one silently.

**Database:** Add a `refresh_tokens` table via a new migration file `backend/migrations/20260420_01_refresh_tokens.cjs`:
```sql
CREATE TABLE refresh_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  revoked BOOLEAN NOT NULL DEFAULT FALSE
);
CREATE INDEX ON refresh_tokens(user_id);
CREATE INDEX ON refresh_tokens(token_hash);
```

**Backend — `auth.service.js`:**  
- On login/signup: generate access token (15min expiry) + refresh token (random 64-byte hex via `crypto.randomBytes(64).toString('hex')`).
- Hash the refresh token with SHA-256 before storing in DB (never store raw).
- Set access token in HttpOnly cookie (`token`, 15min), refresh token in a separate HttpOnly cookie (`refreshToken`, 7 days).

**Backend — new route `POST /api/v1/auth/refresh`:**  
- Read `refreshToken` cookie.
- Hash it, look up in `refresh_tokens` table where `revoked = FALSE AND expires_at > NOW()`.
- If valid, issue new access token cookie.
- If invalid/expired, return 401.

**Backend — `POST /api/v1/auth/logout`:**  
- Mark the refresh token as `revoked = TRUE` in the DB.
- Clear both cookies.

**Frontend:**  
- In the API client, on receiving a 401 response, automatically call `POST /api/v1/auth/refresh` once. If refresh succeeds, retry the original request. If refresh fails, redirect to login.

---

## TASK 2.2 — Add Composite Database Index for Common Queries

**Context:**  
The most frequent dashboard query filters FIRs by `zone`, `occurred_at` date range, and `crime_type` simultaneously. There is currently no composite index for this combination, making these queries do full table scans as the `firs` table grows.

**What to do:**  
Create new migration `backend/migrations/20260420_02_performance_indexes.cjs`:
```sql
-- Composite index for the most common dashboard filter pattern
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_firs_zone_date_type 
  ON firs(zone, occurred_at DESC, crime_type);

-- Index for time-range queries without zone filter
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_firs_occurred_at 
  ON firs(occurred_at DESC);

-- Index for police station filtering
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_firs_police_station 
  ON firs(police_station);

-- Index for status filtering  
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_firs_status 
  ON firs(status);

-- Composite for women safety queries (is_women_safety is on crime_classifications, join via section)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_firs_act_type_zone
  ON firs(act_type, zone);
```
Run: `npm run migrate:up` after adding.

---

## TASK 2.3 — Add Redis Caching for Hotspot Queries

**Context:**  
Hotspot generation calls the ML service with potentially thousands of FIR coordinates and runs DBSCAN clustering. This is expensive and the result is the same for any user viewing the same time window. It should be cached.

**Install:** Add `ioredis` to backend: `npm install ioredis`. Add Redis service to `docker-compose.yml`:
```yaml
redis:
  image: redis:7-alpine
  restart: unless-stopped
  networks:
    - internal
```

**Create `backend/src/utils/cache.js`:**
```javascript
import Redis from 'ioredis';
const redis = new Redis(process.env.REDIS_URL || 'redis://redis:6379');
export const getCache = (key) => redis.get(key).then(v => v ? JSON.parse(v) : null);
export const setCache = (key, value, ttlSeconds = 1800) => redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
export const delCache = (key) => redis.del(key);
export default redis;
```

**Update `backend/src/services/hotspot.service.js`:**  
Before calling the ML service, build a cache key from the query parameters:
```javascript
const cacheKey = `hotspots:${zone || 'all'}:${fromDate}:${toDate}:${crimeType || 'all'}`;
const cached = await getCache(cacheKey);
if (cached) return cached;
// ... call ML service ...
await setCache(cacheKey, result, 1800); // 30 min TTL
return result;
```

**Invalidate cache** when new FIRs are ingested: in `fir.service.js` after bulk insert, call `delCache('hotspots:*')` (use `redis.keys('hotspots:*')` + `redis.del(...)`).

Add `REDIS_URL=redis://redis:6379` to `backend/.env.example`. Add Redis to the backend's `docker-compose.yml` `depends_on`.

---

## TASK 2.4 — Add Structured Logging (Pino)

**Context:**  
Currently the backend uses `console.log` and `console.error` with no structure. Production systems need structured JSON logs with request IDs for tracing issues.

**Install:** `npm install pino pino-http` in backend.

**Create `backend/src/utils/logger.js`:**
```javascript
import pino from 'pino';
export const logger = pino({
  level: process.env.LOG_LEVEL || 'info',
  ...(process.env.NODE_ENV !== 'production' && { transport: { target: 'pino-pretty' } })
});
```

**Update `backend/src/app.js`:**  
Add `pino-http` middleware at the top of the middleware chain:
```javascript
import pinoHttp from 'pino-http';
import { logger } from './utils/logger.js';
app.use(pinoHttp({ logger }));
```

**Replace all `console.log` / `console.error` calls** throughout the codebase with `logger.info(...)` / `logger.error(...)` / `logger.warn(...)`. Pass an object as first arg for structured context:
```javascript
logger.info({ userId, action: 'fir_created', firNo }, 'FIR created');
logger.error({ err, userId }, 'Failed to generate hotspots');
```

**Install dev dep:** `npm install --save-dev pino-pretty`.  
Add `LOG_LEVEL=info` to `.env.example`.

---

## TASK 2.5 — Add Server-Sent Events for Real-Time FIR Alerts

**Context:**  
The `backend/src/routes/events.routes.js` file exists but is not fully implemented. The dashboard should receive real-time notifications when new FIRs are ingested without polling.

**What to do:**

**`backend/src/controllers/events.controller.js`** (create or update):
```javascript
const clients = new Set();

export const subscribe = (req, res) => {
  res.set({
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no'
  });
  res.flushHeaders();
  
  const clientId = Date.now();
  clients.add(res);
  
  // Keep-alive ping every 30s
  const ping = setInterval(() => res.write(':ping\n\n'), 30000);
  
  req.on('close', () => {
    clearInterval(ping);
    clients.delete(res);
  });
};

export const broadcast = (event, data) => {
  clients.forEach(client => {
    client.write(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`);
  });
};
```

**`backend/src/routes/events.routes.js`:**
```javascript
router.get('/subscribe', authenticate, subscribe);
```

**In `fir.service.js`** (or `fir.controller.js`) after any FIR creation/bulk import, call:
```javascript
import { broadcast } from '../controllers/events.controller.js';
broadcast('fir_created', { count: insertedCount, zone, timestamp: new Date() });
```

**Frontend (`frontend/hooks/useSSE.ts`):**  
Create a custom hook that connects to `/api/v1/events/subscribe` using `EventSource` and dispatches events to update dashboard stats without a full page refresh.

---

## TASK 2.6 — Add Input Validation to All Missing Endpoints

**Context:**  
Zod validation schemas exist for most routes but may not be wired to all controllers. Every route that accepts body or query parameters must have validation middleware applied.

**What to do:**  
1. Audit each route file in `backend/src/routes/` — check that every `POST`/`PUT` route has `validate(schema)` middleware before the controller.
2. Audit all `GET` routes with query parameters — they need query schema validation too.
3. Specifically add/verify validation for:
   - `POST /api/v1/irad/ingest` — body validation for accident fields
   - `POST /api/v1/patrol/routes` — body validation for stops array, depot point
   - `GET /api/v1/analytics/*` — query param validation (date ranges, zone names)
   - `POST /api/v1/fir/bulk` — validate each item in array, max array size (e.g., 500 items)
4. For bulk import: add a max items check — reject requests with more than 500 FIRs per batch.

---

## TASK 2.7 — Add Graceful Shutdown Handler

**Context:**  
When Docker stops the container (`SIGTERM`), Node.js currently exits immediately, dropping in-flight requests and leaving DB connections open. Graceful shutdown waits for ongoing requests to finish before exiting — a standard production requirement.

**Update `backend/src/server.js`:**
```javascript
const server = app.listen(PORT, () => {
  logger.info({ port: PORT }, 'Server started');
});

const shutdown = async (signal) => {
  logger.info({ signal }, 'Shutdown signal received');
  server.close(async () => {
    logger.info('HTTP server closed');
    await pool.end();  // Close all DB connections
    logger.info('Database pool closed');
    process.exit(0);
  });
  // Force exit if graceful shutdown takes too long
  setTimeout(() => {
    logger.error('Forced shutdown after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('uncaughtException', (err) => {
  logger.error({ err }, 'Uncaught exception');
  shutdown('uncaughtException');
});
process.on('unhandledRejection', (reason) => {
  logger.error({ reason }, 'Unhandled rejection');
});
```

---

## TASK 2.8 — Add Circuit Breaker for ML Service Calls

**Context:**  
When the ML FastAPI service is down or slow, every API call to the backend that requires ML hangs until timeout, degrading the entire system. A circuit breaker stops forwarding requests to a failing service and returns a fast fallback response instead.

**Install:** `npm install opossum` in the backend.

**Update `backend/src/services/ml.service.js`:**
```javascript
import CircuitBreaker from 'opossum';

const options = {
  timeout: 8000,           // If ML takes >8s, trip the breaker
  errorThresholdPercentage: 50,  // Trip if 50% of requests fail
  resetTimeout: 30000,     // Try again after 30s
  volumeThreshold: 5,      // Minimum calls before breaker can trip
};

const mlFetch = async (method, path, body) => {
  const res = await fetch(`${process.env.ML_SERVICE_URL}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'X-API-Key': process.env.ML_API_KEY },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(8000),
  });
  if (!res.ok) throw new Error(`ML service error: ${res.status}`);
  return res.json();
};

const breaker = new CircuitBreaker(mlFetch, options);

breaker.fallback((method, path, body) => {
  logger.warn({ path }, 'ML service circuit open — using fallback');
  return { fallback: true, message: 'ML service temporarily unavailable', data: [] };
});

breaker.on('open', () => logger.error('ML circuit breaker OPEN'));
breaker.on('halfOpen', () => logger.warn('ML circuit breaker HALF-OPEN'));
breaker.on('close', () => logger.info('ML circuit breaker CLOSED'));

export const callML = (method, path, body) => breaker.fire(method, path, body);
```

---

## TASK 2.9 — Add Request Correlation IDs

**Context:**  
When a request flows through frontend → backend → ML service, there is no shared ID to trace it across service logs. Correlation IDs make debugging distributed failures possible.

**Install:** `npm install uuid` in the backend.

**Add middleware in `backend/src/middlewares/correlationId.middleware.js`:**
```javascript
import { randomUUID } from 'crypto';

export const correlationIdMiddleware = (req, res, next) => {
  const id = req.headers['x-request-id'] || randomUUID();
  req.correlationId = id;
  res.setHeader('X-Request-Id', id);
  next();
};
```

**Register in `backend/src/app.js`** as the first middleware (before pino-http):
```javascript
app.use(correlationIdMiddleware);
app.use(pinoHttp({ 
  logger,
  genReqId: (req) => req.correlationId,
}));
```

**In ML service calls** (`ml.service.js`), forward the correlation ID:
```javascript
headers: { 'X-Request-Id': req.correlationId, ... }
```

**In FastAPI** (`ml-service/app/main.py`), log the `X-Request-Id` header on each request:
```python
import logging
logger = logging.getLogger("uvicorn")

@app.middleware("http")
async def log_correlation(request: Request, call_next):
    correlation_id = request.headers.get("X-Request-Id", "unknown")
    logger.info(f"[{correlation_id}] {request.method} {request.url.path}")
    response = await call_next(request)
    response.headers["X-Request-Id"] = correlation_id
    return response
```

---

## TASK 2.10 — Tune Database Connection Pool

**Context:**  
The `pg` pool uses defaults: `max=10`, no `idleTimeoutMillis`, no `connectionTimeoutMillis`. Under concurrent dashboard load (multiple users requesting hotspot + analytics simultaneously), connections queue up silently. This needs explicit tuning.

**Update `backend/src/config/db.js`:**
```javascript
import pg from 'pg';
const { Pool } = pg;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DB_SSL === 'true' ? { rejectUnauthorized: false } : false,
  max: parseInt(process.env.DB_POOL_MAX) || 20,          // Max concurrent connections
  min: parseInt(process.env.DB_POOL_MIN) || 2,           // Keep 2 alive always
  idleTimeoutMillis: 30000,                               // Release idle connections after 30s
  connectionTimeoutMillis: 5000,                          // Fail fast if can't connect in 5s
  statement_timeout: 30000,                               // Kill queries running >30s
  application_name: 'crime-predictive-backend',           // Visible in pg_stat_activity
});

pool.on('error', (err) => {
  logger.error({ err }, 'Unexpected DB pool error');
});
```

Add to `.env.example`:
```
DB_POOL_MAX=20
DB_POOL_MIN=2
```

---

## TASK 2.11 — Add Full-Text Search on FIR Descriptions

**Context:**  
Officers need to search FIRs by keywords in the description or notes fields (e.g., "search for FIRs mentioning knife" or "vehicle theft on NH-28"). PostgreSQL has built-in full-text search via `tsvector` that is much faster than `LIKE '%keyword%'`.

**Migration** — create `backend/migrations/20260420_05_fir_fulltext.cjs`:
```sql
-- Add tsvector column for full-text search
ALTER TABLE firs ADD COLUMN IF NOT EXISTS search_vector tsvector;

-- Populate from existing data (combine description + location_name + crime_type)
UPDATE firs SET search_vector = to_tsvector('english', 
  coalesce(description, '') || ' ' || 
  coalesce(location_name, '') || ' ' ||
  coalesce(crime_type, '')
);

-- GIN index for fast full-text queries
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_firs_search_vector 
  ON firs USING GIN(search_vector);

-- Trigger to auto-update search_vector on insert/update
CREATE OR REPLACE FUNCTION firs_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector := to_tsvector('english',
    coalesce(NEW.description, '') || ' ' ||
    coalesce(NEW.location_name, '') || ' ' ||
    coalesce(NEW.crime_type, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER firs_search_vector_trigger
  BEFORE INSERT OR UPDATE ON firs
  FOR EACH ROW EXECUTE FUNCTION firs_search_vector_update();
```

**Add to `backend/src/models/fir.model.js`** — new search function:
```javascript
export const searchFIRs = async ({ query, zone, page = 1, limit = 50 }) => {
  const offset = (page - 1) * limit;
  return pool.query(`
    SELECT *, ts_rank(search_vector, plainto_tsquery($1)) AS relevance,
           COUNT(*) OVER() AS total_count
    FROM firs
    WHERE search_vector @@ plainto_tsquery($1)
      AND ($2::text IS NULL OR zone = $2)
    ORDER BY relevance DESC, occurred_at DESC
    LIMIT $3 OFFSET $4
  `, [query, zone || null, limit, offset]);
};
```

**Add route:** `GET /api/v1/fir/search?q=knife&zone=Patna&page=1`

**Frontend:** Add a search input to the FIR table page that calls this endpoint with debounce (wait 300ms after user stops typing before firing the query).

---

## TASK 2.12 — Add BullMQ Background Job Queue for ML Training

**Context:**  
Training a classifier on 12,000+ FIR records is a CPU-heavy operation that can take 30–60 seconds. Running it synchronously in an HTTP request will timeout and block the server. Background job queues handle this properly: the API returns immediately with a job ID, and the client polls for completion.

**Install:** `npm install bullmq` in the backend. Redis is already added in Task 2.3.

**Create `backend/src/utils/queue.js`:**
```javascript
import { Queue, Worker } from 'bullmq';
import { callML } from '../services/ml.service.js';

const connection = { host: 'redis', port: 6379 };

export const mlQueue = new Queue('ml-jobs', { connection });

export const mlWorker = new Worker('ml-jobs', async (job) => {
  const { type, payload } = job.data;
  logger.info({ jobId: job.id, type }, 'Processing ML job');
  
  if (type === 'train_classifier') {
    const result = await callML('POST', '/classify/train', payload);
    return result;
  }
  if (type === 'compute_morans_i') {
    return await callML('POST', '/spatial/morans-i', payload);
  }
  throw new Error(`Unknown job type: ${type}`);
}, { connection, concurrency: 1 });

mlWorker.on('completed', (job, result) => {
  logger.info({ jobId: job.id }, 'ML job completed');
});
mlWorker.on('failed', (job, err) => {
  logger.error({ jobId: job.id, err }, 'ML job failed');
});
```

**Add job status endpoint** `GET /api/v1/ml/jobs/:jobId`:
```javascript
import { mlQueue } from '../utils/queue.js';
export const getJobStatus = async (req, res) => {
  const job = await mlQueue.getJob(req.params.jobId);
  if (!job) return res.status(404).json({ error: 'Job not found' });
  const state = await job.getState();
  const result = state === 'completed' ? await job.returnvalue : null;
  res.json({ jobId: job.id, state, result, progress: job.progress });
};
```

**Update `POST /api/v1/ml/classify/train`** to enqueue instead of calling directly:
```javascript
const job = await mlQueue.add('train_classifier', { type: 'train_classifier', payload: { fir_records } });
res.json({ jobId: job.id, message: 'Training started. Poll /api/v1/ml/jobs/:jobId for status.' });
```

**Frontend:** After submitting training, show a progress indicator and poll `GET /api/v1/ml/jobs/:jobId` every 3 seconds until state is `completed`.

---

---

# PRIORITY 3 — ML SERVICE UPGRADES

---

## TASK 3.1 — Implement Real Crime Classification Model

**Context:**  
The ML service has no classification model. The risk scoring uses a hand-crafted weighted formula. We need a real trained model that classifies crime categories and can be evaluated with proper metrics.

**File to create: `ml-service/app/services/classification.py`**

```python
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder, StandardScaler
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, f1_score
import joblib
import os

MODEL_PATH = os.path.join(os.path.dirname(__file__), '../models/crime_classifier.pkl')
ENCODERS_PATH = os.path.join(os.path.dirname(__file__), '../models/encoders.pkl')

def train_classifier(fir_records: list[dict]) -> dict:
    """
    Train a Random Forest classifier on FIR records.
    Each record needs: hour, day_of_week, month, zone, act_type, target: crime_category
    """
    if len(fir_records) < 50:
        raise ValueError("Need at least 50 records to train")

    df_features = []
    df_labels = []
    
    zone_enc = LabelEncoder()
    act_enc = LabelEncoder()
    
    zones = [r['zone'] for r in fir_records]
    acts = [r['act_type'] for r in fir_records]
    zone_enc.fit(zones)
    act_enc.fit(acts)
    
    for r in fir_records:
        df_features.append([
            r.get('hour', 12),
            r.get('day_of_week', 3),
            r.get('month', 6),
            zone_enc.transform([r['zone']])[0],
            act_enc.transform([r['act_type']])[0],
            r.get('severity', 1),
        ])
        df_labels.append(r['crime_category'])
    
    X = np.array(df_features)
    y = np.array(df_labels)
    
    label_enc = LabelEncoder()
    y_encoded = label_enc.fit_transform(y)
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y_encoded, test_size=0.2, random_state=42, stratify=y_encoded
    )
    
    clf = RandomForestClassifier(
        n_estimators=200,
        max_depth=15,
        min_samples_leaf=2,
        class_weight='balanced',
        random_state=42,
        n_jobs=-1
    )
    clf.fit(X_train, y_train)
    
    y_pred = clf.predict(X_test)
    report = classification_report(y_test, y_pred, target_names=label_enc.classes_, output_dict=True)
    
    # Save model and encoders
    os.makedirs(os.path.dirname(MODEL_PATH), exist_ok=True)
    joblib.dump(clf, MODEL_PATH)
    joblib.dump({'zone': zone_enc, 'act': act_enc, 'label': label_enc, 'scaler': scaler}, ENCODERS_PATH)
    
    return {
        'accuracy': report['accuracy'],
        'macro_f1': report['macro avg']['f1-score'],
        'weighted_f1': report['weighted avg']['f1-score'],
        'per_class': {k: v for k, v in report.items() if k not in ['accuracy', 'macro avg', 'weighted avg']},
        'samples_trained': len(X_train),
        'samples_tested': len(X_test),
    }

def predict_crime_category(records: list[dict]) -> list[dict]:
    """Predict crime category for new records."""
    if not os.path.exists(MODEL_PATH):
        raise FileNotFoundError("Model not trained yet. Call /ml/train first.")
    
    clf = joblib.load(MODEL_PATH)
    encs = joblib.load(ENCODERS_PATH)
    
    features = []
    for r in records:
        zone_enc_val = encs['zone'].transform([r.get('zone', 'unknown')])[0] if r.get('zone') in encs['zone'].classes_ else 0
        act_enc_val = encs['act'].transform([r.get('act_type', 'IPC')])[0] if r.get('act_type') in encs['act'].classes_ else 0
        features.append([r.get('hour', 12), r.get('day_of_week', 3), r.get('month', 6), zone_enc_val, act_enc_val, r.get('severity', 1)])
    
    X = encs['scaler'].transform(np.array(features))
    preds = clf.predict(X)
    probs = clf.predict_proba(X)
    
    return [
        {'predicted_category': encs['label'].inverse_transform([p])[0], 'confidence': float(max(prob))}
        for p, prob in zip(preds, probs)
    ]
```

**Add to `ml-service/requirements.txt`:** `scikit-learn`, `joblib` (already present — confirm).

**Add to `ml-service/app/schemas.py`:**
```python
class TrainRequest(BaseModel):
    fir_records: list[dict]  # list of FIR dicts with required fields

class PredictRequest(BaseModel):
    records: list[dict]

class TrainResponse(BaseModel):
    accuracy: float
    macro_f1: float
    weighted_f1: float
    per_class: dict
    samples_trained: int
    samples_tested: int
```

**Add to `ml-service/app/main.py`:**
```python
@app.post("/classify/train", response_model=TrainResponse)
def train(req: TrainRequest):
    return train_classifier(req.fir_records)

@app.post("/classify/predict")
def predict(req: PredictRequest):
    return predict_crime_category(req.records)
```

**Add proxy routes in backend** (`backend/src/routes/ml.routes.js`):
- `POST /api/v1/ml/classify/train`
- `POST /api/v1/ml/classify/predict`

**Add to `backend/src/services/ml.service.js`:**
```javascript
export const trainClassifier = (firRecords) => callML('POST', '/classify/train', { fir_records: firRecords });
export const predictCategory = (records) => callML('POST', '/classify/predict', { records });
```

---

## TASK 3.2 — Add Moran's I Spatial Autocorrelation

**Context:**  
Academic validation requires proving that detected crime clusters are statistically significant (not random chance). Moran's I is the standard test. We need to compute it per crime type and return both the statistic and p-value.

**Install in ml-service:** Add `libpysal esda` to `ml-service/requirements.txt`.

**Create `ml-service/app/services/spatial_stats.py`:**
```python
import numpy as np
from libpysal.weights import KNN
from esda.moran import Moran

def compute_morans_i(incidents: list[dict], k_neighbors: int = 5) -> dict:
    """
    Compute Global Moran's I for spatial autocorrelation of crime counts.
    incidents: list of {lat, lon, count} per zone/cell
    """
    if len(incidents) < 10:
        return {'error': 'Need at least 10 spatial units for Moran\'s I'}
    
    coords = np.array([[i['lon'], i['lat']] for i in incidents])
    values = np.array([i.get('count', 1) for i in incidents], dtype=float)
    
    k = min(k_neighbors, len(incidents) - 1)
    w = KNN.from_array(coords, k=k)
    w.transform = 'r'  # row-standardize
    
    moran = Moran(values, w)
    
    return {
        'morans_i': float(moran.I),
        'expected_i': float(moran.EI),
        'variance': float(moran.VI_norm),
        'z_score': float(moran.z_norm),
        'p_value': float(moran.p_norm),
        'is_significant': bool(moran.p_norm < 0.05),
        'interpretation': (
            'Strong spatial clustering (non-random)' if moran.p_norm < 0.01
            else 'Moderate spatial clustering' if moran.p_norm < 0.05
            else 'Not statistically significant spatial clustering'
        )
    }
```

**Add to `ml-service/app/schemas.py`:**
```python
class MoransIRequest(BaseModel):
    incidents: list[dict]  # [{lat, lon, count}]
    k_neighbors: int = 5
```

**Add to `ml-service/app/main.py`:**
```python
@app.post("/spatial/morans-i")
def morans_i(req: MoransIRequest):
    return compute_morans_i(req.incidents, req.k_neighbors)
```

**Add to backend:** proxy route `POST /api/v1/ml/spatial/morans-i` and expose it on the analytics dashboard as a card showing "Spatial Autocorrelation: Moran's I = 0.71 (p < 0.001, significant)".

---

## TASK 3.3 — Add PAI (Predictive Accuracy Index) Metric

**Context:**  
PAI is the standard criminological metric for hotspot evaluation. PAI = (% crimes captured in hotspot area) / (% of total area flagged as hotspot). Values > 1 = better than random; > 5 = good; > 10 = excellent.

**Create `ml-service/app/services/evaluation.py`:**
```python
import numpy as np

def compute_pai(
    predicted_hotspots: list[dict],  # [{lat, lon, radius_m}]
    actual_crimes: list[dict],        # [{lat, lon}]
    total_area_km2: float,
    hotspot_radius_m: float = 300
) -> dict:
    """Compute Predictive Accuracy Index."""
    from math import radians, cos, sin, asin, sqrt
    
    def haversine(lat1, lon1, lat2, lon2):
        R = 6371000  # meters
        φ1, φ2 = radians(lat1), radians(lat2)
        Δφ = radians(lat2 - lat1)
        Δλ = radians(lon2 - lon1)
        a = sin(Δφ/2)**2 + cos(φ1)*cos(φ2)*sin(Δλ/2)**2
        return R * 2 * asin(sqrt(a))
    
    # Count crimes captured in any hotspot circle
    captured = 0
    for crime in actual_crimes:
        for hs in predicted_hotspots:
            dist = haversine(crime['lat'], crime['lon'], hs['lat'], hs['lon'])
            if dist <= hotspot_radius_m:
                captured += 1
                break
    
    # Hotspot area (union of circles — approximate, assuming no overlap)
    import math
    hotspot_area_km2 = len(predicted_hotspots) * math.pi * (hotspot_radius_m / 1000) ** 2
    
    pct_crimes_captured = captured / len(actual_crimes) if actual_crimes else 0
    pct_area_flagged = min(hotspot_area_km2 / total_area_km2, 1.0) if total_area_km2 > 0 else 0
    
    pai = pct_crimes_captured / pct_area_flagged if pct_area_flagged > 0 else 0
    
    return {
        'pai': round(pai, 3),
        'crimes_captured': captured,
        'total_crimes': len(actual_crimes),
        'pct_crimes_captured': round(pct_crimes_captured * 100, 2),
        'hotspot_area_km2': round(hotspot_area_km2, 4),
        'total_area_km2': total_area_km2,
        'pct_area_flagged': round(pct_area_flagged * 100, 2),
        'rating': 'Excellent' if pai > 10 else 'Good' if pai > 5 else 'Fair' if pai > 1 else 'Poor'
    }
```

**Add endpoint** `POST /ml/evaluation/pai` to `ml-service/app/main.py` and proxy it from backend.

---

## TASK 3.4 — Improve Risk Scoring with Learned Weights

**Context:**  
Current risk scoring uses fixed hand-crafted weights (freq=0.30, severity=0.25, etc.). These should be learned from data. Replace with a Ridge regression model that learns weights from historical crime outcomes.

**Update `ml-service/app/services/risk.py`:**  
Keep the existing `compute_risk_scores()` function as a fallback. Add a new function:

```python
from sklearn.linear_model import Ridge
from sklearn.preprocessing import StandardScaler
import numpy as np
import joblib
import os

RISK_MODEL_PATH = os.path.join(os.path.dirname(__file__), '../models/risk_model.pkl')

def train_risk_model(training_data: list[dict]) -> dict:
    """
    Train risk model from historical data.
    Each record: {frequency, severity, recency_days, hotspot_density, repeat_rate, actual_future_crimes}
    """
    X = np.array([[r['frequency'], r['severity'], r['recency_days'], 
                   r['hotspot_density'], r['repeat_rate']] for r in training_data])
    y = np.array([r['actual_future_crimes'] for r in training_data])
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    model = Ridge(alpha=1.0)
    model.fit(X_scaled, y)
    
    feature_names = ['frequency', 'severity', 'recency_days', 'hotspot_density', 'repeat_rate']
    learned_weights = dict(zip(feature_names, model.coef_))
    
    joblib.dump({'model': model, 'scaler': scaler}, RISK_MODEL_PATH)
    
    return {
        'learned_weights': learned_weights,
        'intercept': float(model.intercept_),
        'r2_score': float(model.score(X_scaled, y))
    }

def compute_risk_scores_ml(records: list[dict]) -> list[dict]:
    """Use trained model if available, fall back to weighted formula."""
    if not os.path.exists(RISK_MODEL_PATH):
        return compute_risk_scores(records)  # existing fallback
    
    saved = joblib.load(RISK_MODEL_PATH)
    model, scaler = saved['model'], saved['scaler']
    
    X = np.array([[r.get('frequency', 0), r.get('severity', 1), r.get('recency_days', 30),
                   r.get('hotspot_density', 0), r.get('repeat_rate', 0)] for r in records])
    X_scaled = scaler.transform(X)
    scores_raw = model.predict(X_scaled)
    
    # Normalize to 0-100
    if scores_raw.max() > scores_raw.min():
        scores_normalized = (scores_raw - scores_raw.min()) / (scores_raw.max() - scores_raw.min()) * 100
    else:
        scores_normalized = np.full_like(scores_raw, 50.0)
    
    return [{'risk_score': float(np.clip(s, 0, 100))} for s in scores_normalized]
```

---

## TASK 3.5 — Add SHAP Explainability for Risk Scores

**Context:**  
The risk model currently outputs a number (0–100) with no explanation of why a zone is high-risk. SHAP (SHapley Additive exPlanations) shows how much each feature contributed to a specific prediction. This is essential for officer trust ("Zone X is high-risk because frequency=40%, recency=35%...") and for academic credibility.

**Install:** Add `shap` to `ml-service/requirements.txt`.

**Update `ml-service/app/services/risk.py`** — add after `compute_risk_scores_ml()`:
```python
import shap
import joblib
import numpy as np

def explain_risk_scores(records: list[dict]) -> list[dict]:
    """Return SHAP explanation for each risk score."""
    if not os.path.exists(RISK_MODEL_PATH):
        raise FileNotFoundError("Model not trained yet")
    
    saved = joblib.load(RISK_MODEL_PATH)
    model, scaler = saved['model'], saved['scaler']
    
    feature_names = ['frequency', 'severity', 'recency_days', 'hotspot_density', 'repeat_rate']
    X = np.array([[r.get(f, 0) for f in feature_names] for r in records])
    X_scaled = scaler.transform(X)
    
    explainer = shap.LinearExplainer(model, X_scaled, feature_perturbation='interventional')
    shap_values = explainer.shap_values(X_scaled)
    
    results = []
    for i, record in enumerate(records):
        contributions = {
            feature_names[j]: round(float(shap_values[i][j]), 4)
            for j in range(len(feature_names))
        }
        dominant_factor = max(contributions, key=lambda k: abs(contributions[k]))
        results.append({
            'zone': record.get('zone'),
            'risk_score': float(np.clip(model.predict(X_scaled[i:i+1])[0], 0, 100)),
            'shap_contributions': contributions,
            'dominant_factor': dominant_factor,
            'explanation': f"Risk is primarily driven by {dominant_factor.replace('_', ' ')} ({contributions[dominant_factor]:+.2f})"
        })
    return results
```

**Add endpoint** `POST /ml/risk/explain` and proxy from backend.

**Frontend:** In the analytics dashboard zone cards, add a "Why?" tooltip button that shows the SHAP breakdown as a small horizontal bar chart (positive = increases risk, negative = decreases risk).

---

## TASK 3.6 — Add Crime Spike Anomaly Detection

**Context:**  
The system should automatically detect when crime in a zone suddenly spikes far above its historical baseline — and flag it for officer attention. This turns the system from passive visualization to active alerting.

**Create `ml-service/app/services/anomaly.py`:**
```python
import numpy as np
from sklearn.ensemble import IsolationForest
from datetime import datetime, timedelta

def detect_crime_spikes(time_series_data: list[dict], contamination: float = 0.05) -> list[dict]:
    """
    Detect anomalous crime count spikes in time series data.
    Input: [{date: '2025-01-01', zone: 'Patna', count: 45}, ...]
    Output: same records with is_anomaly and anomaly_score fields
    """
    if len(time_series_data) < 20:
        return [{'error': 'Need at least 20 data points for anomaly detection'}]
    
    counts = np.array([d['count'] for d in time_series_data]).reshape(-1, 1)
    
    # Z-score method for simple spike detection
    mean = np.mean(counts)
    std = np.std(counts)
    z_scores = np.abs((counts - mean) / (std + 1e-8)).flatten()
    
    # Isolation Forest for multivariate (if multiple features available)
    iso = IsolationForest(contamination=contamination, random_state=42)
    iso_scores = iso.fit_predict(counts)  # -1 = anomaly, 1 = normal
    
    results = []
    for i, record in enumerate(time_series_data):
        is_anomaly = bool(z_scores[i] > 2.5 or iso_scores[i] == -1)
        results.append({
            **record,
            'is_anomaly': is_anomaly,
            'z_score': round(float(z_scores[i]), 3),
            'anomaly_score': round(float(-iso.score_samples([[counts[i][0]]])[0]), 3),
            'severity': 'critical' if z_scores[i] > 3.5 else 'warning' if is_anomaly else 'normal'
        })
    return results
```

**Add endpoint** `POST /ml/anomaly/detect` to `ml-service/app/main.py` and proxy from backend.

**Backend — integrate with SSE:** After running anomaly detection, broadcast any critical anomalies via the SSE event bus:
```javascript
const anomalies = results.filter(r => r.severity === 'critical');
if (anomalies.length > 0) {
  broadcast('crime_spike_alert', { anomalies, timestamp: new Date() });
}
```

**Frontend:** Show a red alert banner on the dashboard when a crime spike is detected. Display the zone name, count vs. baseline, and a "View on Map" button.

---

## TASK 3.7 — Add Near-Repeat Victimization Analysis

**Context:**  
Near-repeat victimization is a validated criminological phenomenon: after a crime occurs, nearby properties/locations have a significantly elevated risk of crime within the next 1–2 weeks. This is academically important (publishable insight) and practically useful (targeted short-term patrol deployment).

**Create `ml-service/app/services/near_repeat.py`:**
```python
import numpy as np
from math import radians, cos, sin, asin, sqrt

def haversine_m(lat1, lon1, lat2, lon2):
    R = 6371000
    φ1, φ2 = radians(lat1), radians(lat2)
    Δφ = radians(lat2 - lat1)
    Δλ = radians(lon2 - lon1)
    return R * 2 * asin(sqrt(sin(Δφ/2)**2 + cos(φ1)*cos(φ2)*sin(Δλ/2)**2))

def compute_near_repeat_risk(
    historical_crimes: list[dict],  # [{lat, lon, occurred_at (ISO), crime_type}]
    candidate_locations: list[dict],  # [{lat, lon}] to score
    spatial_bandwidth_m: float = 400,
    temporal_bandwidth_days: int = 14
) -> list[dict]:
    """
    Score each candidate location based on near-repeat risk from recent crimes.
    Higher score = more likely to have crime based on what happened nearby recently.
    """
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    
    results = []
    for loc in candidate_locations:
        risk = 0.0
        contributing_crimes = 0
        
        for crime in historical_crimes:
            # Spatial component
            dist = haversine_m(loc['lat'], loc['lon'], crime['lat'], crime['lon'])
            if dist > spatial_bandwidth_m:
                continue
            
            # Temporal component (decay)
            crime_time = datetime.fromisoformat(crime['occurred_at'].replace('Z', '+00:00'))
            days_ago = (now - crime_time).days
            if days_ago > temporal_bandwidth_days:
                continue
            
            spatial_weight = 1 - (dist / spatial_bandwidth_m)
            temporal_weight = 1 - (days_ago / temporal_bandwidth_days)
            risk += spatial_weight * temporal_weight
            contributing_crimes += 1
        
        results.append({
            **loc,
            'near_repeat_risk': round(min(risk, 10.0), 4),  # Cap at 10
            'contributing_crimes': contributing_crimes,
            'risk_level': 'high' if risk > 2 else 'medium' if risk > 0.5 else 'low'
        })
    
    return sorted(results, key=lambda x: x['near_repeat_risk'], reverse=True)
```

**Add endpoint** `POST /ml/near-repeat` and proxy from backend.

**Frontend:** In the hotspot map, add a toggle layer "Near-Repeat Risk Zones" that shows the next 14 days' predicted risk areas as a translucent overlay distinct from the historical KDE layer.

---

## TASK 3.8 — Add k-Fold Cross-Validation to Classifier

**Context:**  
The crime classifier (Task 3.1) uses a single 80/20 train-test split. A single split can give misleading accuracy if the split happened to be favorable. k-Fold cross-validation gives a more reliable estimate of true model performance by testing on 5 different data splits.

**Add to `ml-service/app/services/classification.py`:**
```python
from sklearn.model_selection import StratifiedKFold, cross_val_score

def cross_validate_classifier(fir_records: list[dict], k: int = 5) -> dict:
    """Run k-fold cross-validation and return mean/std accuracy."""
    if len(fir_records) < k * 10:
        raise ValueError(f"Need at least {k * 10} records for {k}-fold CV")
    
    # Build features + labels (same logic as train_classifier)
    # ... (reuse feature engineering from train_classifier) ...
    
    clf = RandomForestClassifier(n_estimators=100, class_weight='balanced', random_state=42)
    skf = StratifiedKFold(n_splits=k, shuffle=True, random_state=42)
    
    scores = cross_val_score(clf, X, y_encoded, cv=skf, scoring='f1_weighted', n_jobs=-1)
    
    return {
        'k_folds': k,
        'fold_scores': [round(float(s), 4) for s in scores],
        'mean_f1': round(float(scores.mean()), 4),
        'std_f1': round(float(scores.std()), 4),
        'confidence_interval_95': [
            round(float(scores.mean() - 1.96 * scores.std()), 4),
            round(float(scores.mean() + 1.96 * scores.std()), 4)
        ]
    }
```

**Add endpoint** `POST /ml/classify/cross-validate` and proxy from backend.  
**In the paper:** Report cross-validated F1 mean ± std instead of single-split accuracy. This is the academically correct way.

---

---

# PRIORITY 4 — FRONTEND UPGRADES

---

## TASK 4.1 — Add Loading Skeletons and Error Boundaries to Dashboard

**Context:**  
The dashboard at `frontend/app/dashboard/page.tsx` fetches from multiple APIs in parallel. During loading, the UI should show skeleton placeholders, not blank space. On error, it should show a graceful error state per card.

**Create `frontend/components/ui/skeleton.tsx`** (if not in shadcn/ui already):
```tsx
export function Skeleton({ className }: { className?: string }) {
  return <div className={`animate-pulse bg-muted rounded-md ${className}`} />;
}

export function StatCardSkeleton() {
  return (
    <div className="rounded-lg border p-6 space-y-3">
      <Skeleton className="h-4 w-1/3" />
      <Skeleton className="h-8 w-1/2" />
      <Skeleton className="h-3 w-2/3" />
    </div>
  );
}
```

**Update `frontend/app/dashboard/page.tsx`:**  
- Show `<StatCardSkeleton />` for each of the 9 stat cards while data is loading.
- Add per-card error state: if one API call fails, show the card with "Unavailable" label and a retry button, not a broken page.
- Use `Promise.allSettled()` instead of `Promise.all()` so one failed API call does not crash the entire dashboard.

**Create `frontend/components/ErrorBoundary.tsx`:**
```tsx
'use client';
import { Component, ReactNode } from 'react';

export class ErrorBoundary extends Component<{ children: ReactNode; fallback: ReactNode }, { hasError: boolean }> {
  state = { hasError: false };
  static getDerivedStateFromError() { return { hasError: true }; }
  render() { return this.state.hasError ? this.props.fallback : this.props.children; }
}
```

Wrap the dashboard map component in `<ErrorBoundary fallback={<div>Map failed to load</div>}>`.

---

## TASK 4.2 — Add PWA Support (Offline FIR Drafting)

**Context:**  
Field officers in rural Bihar may have unreliable internet. The app should work as a Progressive Web App with offline FIR drafting capability.

**What to do:**

1. **Add `frontend/public/manifest.json`:**
```json
{
  "name": "Crime Predictive Hotspot System",
  "short_name": "CrimeMap",
  "start_url": "/dashboard",
  "display": "standalone",
  "background_color": "#0f172a",
  "theme_color": "#3b82f6",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" }
  ]
}
```

2. **Add to `frontend/app/layout.tsx`:**
```tsx
<link rel="manifest" href="/manifest.json" />
<meta name="theme-color" content="#3b82f6" />
```

3. **Create `frontend/public/sw.js`** (service worker):
```javascript
const CACHE = 'crime-map-v1';
const OFFLINE_URLS = ['/', '/dashboard', '/login'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(OFFLINE_URLS)));
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return; // Don't intercept POST (FIR submission)
  e.respondWith(
    fetch(e.request).catch(() => caches.match(e.request))
  );
});
```

4. **Register service worker** in `frontend/app/layout.tsx`:
```tsx
useEffect(() => {
  if ('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js');
}, []);
```

5. **Add offline FIR drafting**: In the FIR creation form (`frontend/app/dashboard/firs/`), detect `navigator.onLine`. If offline, save the draft to `localStorage` (or IndexedDB via `idb` package). On reconnect, auto-submit the queued drafts.

---

## TASK 4.3 — Add Export Functionality (CSV + PDF)

**Context:**  
The `docs/README.md` lists report export as a planned feature. The `backend/src/controllers/` has a `analytics.controller.js` but no export endpoints.

**Backend — add export endpoints in `backend/src/routes/analytics.routes.js`:**
- `GET /api/v1/analytics/export/csv?zone=&fromDate=&toDate=` → returns a CSV file
- `GET /api/v1/analytics/export/patrol-report/:routeId` → returns a PDF

**Install:** `npm install json2csv` for CSV, `npm install pdfkit` for PDF generation.

**`backend/src/controllers/analytics.controller.js`** — add:
```javascript
export const exportCSV = async (req, res) => {
  const { zone, fromDate, toDate } = req.query;
  const firs = await getFIRsForExport({ zone, fromDate, toDate }); // add this to fir.model.js
  const { Parser } = await import('json2csv');
  const fields = ['fir_no', 'crime_type', 'act_type', 'section', 'zone', 'police_station', 'occurred_at', 'status'];
  const parser = new Parser({ fields });
  const csv = parser.parse(firs);
  res.set('Content-Disposition', `attachment; filename="firs_${Date.now()}.csv"`);
  res.set('Content-Type', 'text/csv');
  res.send(csv);
};
```

**Frontend — add an "Export CSV" button** to the FIR table page that triggers a download via `window.open('/api/v1/analytics/export/csv?...')`.

---

## TASK 4.4 — Add Pagination Controls to FIR Table

**Context:**  
The backend FIR list endpoint already supports `?page=1&limit=50` pagination with `total_count`. The frontend table needs UI controls to navigate pages.

**What to do in `frontend/app/dashboard/firs/page.tsx`:**  
- Add state: `const [page, setPage] = useState(1)` and `const [totalCount, setTotalCount] = useState(0)`.
- Pass `?page=${page}&limit=50` to the FIR list API call.
- Read `total_count` from the API response and store in state.
- Render pagination controls:
```tsx
const totalPages = Math.ceil(totalCount / 50);
<div className="flex items-center gap-2">
  <Button disabled={page === 1} onClick={() => setPage(p => p - 1)}>Previous</Button>
  <span>Page {page} of {totalPages}</span>
  <Button disabled={page === totalPages} onClick={() => setPage(p => p + 1)}>Next</Button>
</div>
```
- Re-fetch when `page` changes (add `page` to useEffect dependency array).

---

## TASK 4.5 — Add Map Marker Clustering (Leaflet.markercluster)

**Context:**  
When the FIR table has 1000+ entries and all are plotted on the map, Leaflet renders every marker individually — this kills browser performance (freezes at ~500+ markers). Marker clustering groups nearby markers into a single count badge and splits them apart on zoom. This is a critical performance fix for a real-use system.

**Install:** `npm install react-leaflet-markercluster leaflet.markercluster` in the frontend.  
Also add `@types/leaflet.markercluster --save-dev`.

**In the FIR map component** (`frontend/components/map/`), replace direct `<Marker>` rendering with a `<MarkerClusterGroup>` wrapper:
```tsx
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';

// Replace:
// {firs.map(fir => <Marker key={fir.id} position={[fir.lat, fir.lon]} />)}

// With:
<MarkerClusterGroup chunkedLoading maxClusterRadius={60}>
  {firs.map(fir => (
    <Marker key={fir.id} position={[fir.lat, fir.lon]}>
      <Popup>
        <strong>{fir.fir_no}</strong><br />
        {fir.crime_type} — {fir.zone}<br />
        {new Date(fir.occurred_at).toLocaleDateString('en-IN')}
      </Popup>
    </Marker>
  ))}
</MarkerClusterGroup>
```

Configure cluster icon to show count badge. On zoom, clusters split into sub-clusters and eventually individual markers. Performance gain: can handle 10,000+ markers smoothly.

---

## TASK 4.6 — Add Toast Notifications for User Actions

**Context:**  
There is no feedback when a user creates a FIR, runs a bulk import, exports data, or triggers ML training. Silent success/failure is a UX failure. Toast notifications provide non-blocking feedback.

**shadcn/ui has a `Toaster` component** — install it if not already:
```bash
npx shadcn-ui@latest add toast
```

**In `frontend/app/layout.tsx`** add `<Toaster />` at the root level.

**Usage pattern across all action-triggering components:**
```tsx
import { useToast } from '@/components/ui/use-toast';

const { toast } = useToast();

// On FIR creation success:
toast({ title: 'FIR Created', description: `FIR ${firNo} registered successfully.`, variant: 'default' });

// On bulk import:
toast({ title: `${count} FIRs Imported`, description: `${skipped} duplicates skipped.` });

// On ML training queued:
toast({ title: 'Training Started', description: 'Model training queued. Check ML status panel.' });

// On error:
toast({ title: 'Error', description: errorMessage, variant: 'destructive' });
```

Apply toasts to: FIR create/update, bulk import, CSV export, patrol route generation, ML training trigger, and any delete action.

---

## TASK 4.7 — Add Filter Persistence via URL Query Params

**Context:**  
When a user selects zone=Patna, fromDate=2025-01-01, crimeType=Theft on the FIR table — then navigates away and comes back — all filters are reset. This is frustrating during an investigation. Store filters in the URL so they persist and can be shared.

**In all dashboard filter pages** (`firs/page.tsx`, `hotspots/page.tsx`, `analytics/page.tsx`):

Replace local `useState` for filters with URL-synced state using Next.js `useSearchParams` + `useRouter`:
```tsx
'use client';
import { useSearchParams, useRouter, usePathname } from 'next/navigation';

const searchParams = useSearchParams();
const router = useRouter();
const pathname = usePathname();

// Read filters from URL
const zone = searchParams.get('zone') || '';
const fromDate = searchParams.get('fromDate') || '';
const crimeType = searchParams.get('crimeType') || '';

// Update URL when filter changes (replaces state, no history entry)
const updateFilter = (key: string, value: string) => {
  const params = new URLSearchParams(searchParams.toString());
  if (value) params.set(key, value); else params.delete(key);
  router.replace(`${pathname}?${params.toString()}`);
};
```

This means: filters survive page refresh, are bookmarkable, and can be shared between officers ("hey look at this filter view" → send URL).

---

## TASK 4.8 — Mobile Responsive Audit and Fixes

**Context:**  
Field officers may access the dashboard on phones. The current Tailwind layout likely breaks on small screens. A systematic responsive audit and fix pass is needed.

**What to do — audit each dashboard page:**

1. Wrap the main grid in `frontend/app/dashboard/page.tsx` with responsive columns:
   - Change `grid-cols-3` → `grid-cols-1 sm:grid-cols-2 lg:grid-cols-3`
   - Change `grid-cols-4` → `grid-cols-2 lg:grid-cols-4`

2. **Sidebar navigation** — add a hamburger menu for mobile. The sidebar should collapse to an off-canvas drawer on screens `< 768px`. Use shadcn/ui `Sheet` component as the mobile drawer.

3. **Map pages** — ensure the map container has a min-height on mobile (`min-h-[60vh]`) and controls don't overlap the map.

4. **FIR table** — on mobile, switch from a full table to a card-based list view (each FIR as a card with key fields). Use `hidden md:table` on the table and `block md:hidden` on the card list.

5. **Test at these breakpoints:** 375px (iPhone SE), 414px (iPhone XR), 768px (iPad), 1024px (desktop).

6. **Touch targets** — all buttons must be at least 44×44px on mobile. Add `min-h-[44px] min-w-[44px]` to icon-only buttons.

---

---

# PRIORITY 5 — DEVOPS & QUALITY

---

## TASK 5.1 — Add GitHub Actions CI Pipeline

**Context:**  
There is no CI pipeline. Every push should run linting and build checks automatically to catch breakage.

**Create `.github/workflows/ci.yml`:**
```yaml
name: CI

on:
  push:
    branches: [master, main]
  pull_request:
    branches: [master, main]

jobs:
  backend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: backend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: backend/package-lock.json
      - run: npm ci
      - run: node --check src/server.js  # syntax check

  frontend:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: frontend
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: npm
          cache-dependency-path: frontend/package-lock.json
      - run: npm ci
      - run: npm run lint
      - run: npm run build

  ml-service:
    runs-on: ubuntu-latest
    defaults:
      run:
        working-directory: ml-service
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-python@v5
        with:
          python-version: '3.11'
          cache: pip
      - run: pip install -r requirements.txt
      - run: python -c "from app.main import app; print('ML service imports OK')"
```

---

## TASK 5.2 — Add Database Partitioning for FIRs Table

**Context:**  
The `firs` table will grow indefinitely. Partition it by year for query performance and data management. This is a migration operation.

**Create `backend/migrations/20260420_03_partition_firs.cjs`:**  
This is a significant migration — it renames the existing table, creates a partitioned parent, and migrates data. Due to the complexity and risk, implement it as follows:

1. Add a comment at the top: `-- RUN IN TRANSACTION. TAKE A BACKUP FIRST.`
2. Rename current `firs` → `firs_legacy`.
3. Create partitioned table `firs` with `PARTITION BY RANGE (occurred_at)`.
4. Create initial partitions: `firs_2024`, `firs_2025`, `firs_2026`.
5. `INSERT INTO firs SELECT * FROM firs_legacy`.
6. Drop `firs_legacy`.
7. Re-create all indexes and foreign key references.

**Note for the AI implementing this:** Generate the full SQL carefully. Test on a local copy first. This migration is NOT reversible without a backup.

---

## TASK 5.3 — Add Swagger/OpenAPI Documentation

**Context:**  
The API has no documentation. Adding Swagger UI helps with demos, internship applications, and team development.

**Backend — install:** `npm install swagger-jsdoc swagger-ui-express`.

**Create `backend/src/swagger.js`:**
```javascript
import swaggerJsdoc from 'swagger-jsdoc';
export const swaggerSpec = swaggerJsdoc({
  definition: {
    openapi: '3.0.0',
    info: { title: 'Crime Predictive Model API', version: '1.0.0', description: 'REST API for crime hotspot mapping and analysis' },
    servers: [{ url: '/api/v1' }],
    components: {
      securitySchemes: { cookieAuth: { type: 'apiKey', in: 'cookie', name: 'token' } }
    },
    security: [{ cookieAuth: [] }]
  },
  apis: ['./src/routes/*.js'],
});
```

**Register in `app.js`:**
```javascript
import swaggerUi from 'swagger-ui-express';
import { swaggerSpec } from './swagger.js';
app.use('/api/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
```

**Add JSDoc comments to each route file.** Example for `fir.routes.js`:
```javascript
/**
 * @swagger
 * /fir:
 *   get:
 *     summary: List FIRs with filters
 *     parameters:
 *       - in: query
 *         name: zone
 *         schema: { type: string }
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *     responses:
 *       200:
 *         description: Paginated list of FIRs
 */
```

Access at `http://localhost:4000/api/docs` after startup.

---

## TASK 5.4 — Add Health Check Enhancements

**Context:**  
The existing `/api/v1/health` endpoint exists but likely returns only a basic "ok" response. It should return structured health info for all dependencies.

**Update `backend/src/controllers/health.controller.js`:**
```javascript
export const getHealth = async (req, res) => {
  const checks = {};
  
  // DB check
  try {
    await pool.query('SELECT 1');
    checks.database = { status: 'ok' };
  } catch (e) {
    checks.database = { status: 'error', error: e.message };
  }
  
  // Redis check (if added)
  try {
    await redis.ping();
    checks.cache = { status: 'ok' };
  } catch (e) {
    checks.cache = { status: 'error', error: e.message };
  }
  
  // ML service check
  try {
    const r = await fetch(`${process.env.ML_SERVICE_URL}/health`, { signal: AbortSignal.timeout(3000) });
    checks.ml_service = { status: r.ok ? 'ok' : 'degraded' };
  } catch (e) {
    checks.ml_service = { status: 'error', error: e.message };
  }
  
  const allOk = Object.values(checks).every(c => c.status === 'ok');
  res.status(allOk ? 200 : 503).json({
    status: allOk ? 'ok' : 'degraded',
    timestamp: new Date().toISOString(),
    version: process.env.npm_package_version || '1.0.0',
    checks
  });
};
```

---

## TASK 5.5 — Add Nginx Reverse Proxy Configuration

**Context:**  
In production, Nginx should sit in front of all services: handle SSL termination, compress responses, rate-limit at the edge, and proxy to the correct backend. Currently there is no Nginx config.

**Create `nginx/nginx.conf`:**
```nginx
events { worker_connections 1024; }

http {
  gzip on;
  gzip_types text/plain application/json application/javascript text/css;
  gzip_min_length 1000;

  limit_req_zone $binary_remote_addr zone=api:10m rate=30r/s;
  limit_req_zone $binary_remote_addr zone=auth:10m rate=5r/m;

  upstream backend  { server backend:4000; }
  upstream frontend { server frontend:3000; }

  server {
    listen 80;
    server_name _;

    # Auth endpoints — strict rate limit
    location /api/v1/auth/login {
      limit_req zone=auth burst=3 nodelay;
      proxy_pass http://backend;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }

    # All other API routes
    location /api/ {
      limit_req zone=api burst=50 nodelay;
      proxy_pass http://backend;
      proxy_set_header X-Real-IP $remote_addr;
      proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
      proxy_read_timeout 60s;
    }

    # SSE — disable buffering
    location /api/v1/events/ {
      proxy_pass http://backend;
      proxy_buffering off;
      proxy_cache off;
      proxy_set_header Connection '';
      proxy_http_version 1.1;
      chunked_transfer_encoding on;
    }

    # Frontend
    location / {
      proxy_pass http://frontend;
      proxy_set_header Host $host;
    }
  }
}
```

**Add to `docker-compose.yml`:**
```yaml
nginx:
  image: nginx:alpine
  ports:
    - "80:80"
    - "443:443"
  volumes:
    - ./nginx/nginx.conf:/etc/nginx/nginx.conf:ro
  depends_on:
    - backend
    - frontend
  networks:
    - public
```

Remove direct port mappings from `frontend` and `backend` services — Nginx is now the only public entry point.

---

## TASK 5.6 — Add Prometheus Metrics + Grafana Dashboard

**Context:**  
The project has no observability. Prometheus collects metrics (request count, latency, DB pool usage, ML service latency). Grafana visualizes them. This is what a real production team uses to monitor a system.

**Install:** `npm install prom-client` in backend.

**Create `backend/src/utils/metrics.js`:**
```javascript
import client from 'prom-client';

client.collectDefaultMetrics({ prefix: 'crime_api_' });

export const httpRequestDuration = new client.Histogram({
  name: 'crime_api_http_request_duration_seconds',
  help: 'HTTP request duration',
  labelNames: ['method', 'route', 'status_code'],
  buckets: [0.05, 0.1, 0.3, 0.5, 1, 2, 5],
});

export const mlServiceCallDuration = new client.Histogram({
  name: 'crime_api_ml_call_duration_seconds',
  help: 'ML service call duration',
  labelNames: ['endpoint'],
  buckets: [0.1, 0.5, 1, 2, 5, 10],
});

export const activeDbConnections = new client.Gauge({
  name: 'crime_api_db_pool_active',
  help: 'Active DB pool connections',
});

export const firIngestCounter = new client.Counter({
  name: 'crime_api_firs_ingested_total',
  help: 'Total FIRs ingested',
  labelNames: ['zone', 'crime_type'],
});

export const metricsRegistry = client.register;
```

**Add `/metrics` endpoint in `app.js`** (no auth — internal only, protected by Nginx):
```javascript
import { metricsRegistry } from './utils/metrics.js';
app.get('/metrics', async (req, res) => {
  res.set('Content-Type', metricsRegistry.contentType);
  res.end(await metricsRegistry.metrics());
});
```

**Add `prometheus/` and `grafana/` to docker-compose.yml** and create a pre-built Grafana dashboard JSON at `grafana/dashboards/crime-api.json` tracking: req/s by route, p95 latency, error rate, ML call latency, FIRs ingested per hour, DB pool utilization.

---

## TASK 5.7 — Add Integration Tests (Auth + FIR Flow)

**Context:**  
There are zero tests in the project. Integration tests run against a real test database and verify the complete request flow — routing → controller → service → model → DB → response. These catch real bugs that unit tests miss.

**Install:** `npm install --save-dev vitest supertest` in the backend.

**Create `backend/tests/auth.test.js`:**
```javascript
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import app from '../src/app.js';

describe('Auth API', () => {
  let authCookie;
  
  it('POST /api/v1/auth/signup — creates a user', async () => {
    const res = await request(app)
      .post('/api/v1/auth/signup')
      .send({ name: 'Test Officer', email: 'test@test.com', password: 'Test@1234', role: 'OFFICER' });
    expect(res.status).toBe(201);
    expect(res.body.success).toBe(true);
  });

  it('POST /api/v1/auth/login — returns HttpOnly cookie', async () => {
    const res = await request(app)
      .post('/api/v1/auth/login')
      .send({ email: 'test@test.com', password: 'Test@1234' });
    expect(res.status).toBe(200);
    expect(res.headers['set-cookie']).toBeDefined();
    authCookie = res.headers['set-cookie'];
  });

  it('GET /api/v1/auth/profile — protected, returns user', async () => {
    const res = await request(app)
      .get('/api/v1/auth/profile')
      .set('Cookie', authCookie);
    expect(res.status).toBe(200);
    expect(res.body.data.email).toBe('test@test.com');
  });

  it('GET /api/v1/auth/profile — without auth, returns 401', async () => {
    const res = await request(app).get('/api/v1/auth/profile');
    expect(res.status).toBe(401);
  });
});
```

**Create `backend/tests/fir.test.js`** — test FIR create, list with filters, pagination.

**Add test script to `backend/package.json`:**
```json
"scripts": {
  "test": "vitest run",
  "test:watch": "vitest",
  "test:coverage": "vitest run --coverage"
}
```

**Add test DB setup**: create a `TEST_DATABASE_URL` in `.env.example` pointing to a separate test DB. Before tests run, apply migrations and seed minimal data. After tests, truncate tables.

---

## TASK 5.8 — Add Docker `.dockerignore` and Optimize Image Sizes

**Context:**  
Without `.dockerignore`, Docker sends the entire project directory (including `node_modules`, `.git`, logs, `.env`) as build context — making builds slow and accidentally bundling secrets. Image sizes are likely larger than necessary.

**Create `backend/.dockerignore`:**
```
node_modules
.git
*.log
.env
.env.*
!.env.example
coverage
tests
docs
```

**Create `frontend/.dockerignore`:**
```
node_modules
.next
.git
*.log
.env*
!.env.example
```

**Create `ml-service/.dockerignore`:**
```
__pycache__
*.pyc
.git
*.log
.env
models/*.pkl
```

**Optimize ML Dockerfile** — use multi-stage to avoid shipping build tools:
```dockerfile
FROM python:3.11-slim AS builder
WORKDIR /app
RUN pip install --user --no-cache-dir -r requirements.txt

FROM python:3.11-slim
WORKDIR /app
COPY --from=builder /root/.local /root/.local
COPY app ./app
ENV PATH=/root/.local/bin:$PATH
EXPOSE 8001
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
```

Adding `--workers 2` to uvicorn improves ML throughput under concurrent requests.

---

## TASK 5.9 — Add k6 Load Testing Script

**Context:**  
Before any real deployment, you need to know how many concurrent users the system can handle and where it breaks. k6 is a developer-friendly load testing tool.

**Install k6:** (separate install — not a Node package)  
Windows: `winget install k6` | Linux: `sudo apt install k6`

**Create `load-tests/hotspot.js`:**
```javascript
import http from 'k6/http';
import { check, sleep } from 'k6';
import { Trend, Rate } from 'k6/metrics';

const hotspotDuration = new Trend('hotspot_duration');
const errorRate = new Rate('errors');

export const options = {
  stages: [
    { duration: '30s', target: 10 },   // Ramp up to 10 users
    { duration: '1m', target: 50 },    // Hold at 50 users
    { duration: '30s', target: 100 },  // Stress: 100 users
    { duration: '30s', target: 0 },    // Ramp down
  ],
  thresholds: {
    http_req_duration: ['p(95)<3000'],  // 95% under 3s
    errors: ['rate<0.05'],              // Error rate under 5%
  },
};

const BASE = __ENV.BASE_URL || 'http://localhost:80';

export function setup() {
  const res = http.post(`${BASE}/api/v1/auth/login`, JSON.stringify({ 
    email: 'test@test.com', password: 'Test@1234' 
  }), { headers: { 'Content-Type': 'application/json' } });
  return { cookie: res.headers['Set-Cookie'] };
}

export default function (data) {
  const params = { headers: { Cookie: data.cookie } };
  
  const res = http.get(`${BASE}/api/v1/hotspots?zone=Patna&fromDate=2025-01-01&toDate=2025-12-31`, params);
  hotspotDuration.add(res.timings.duration);
  errorRate.add(res.status !== 200);
  
  check(res, {
    'status is 200': (r) => r.status === 200,
    'has clusters': (r) => JSON.parse(r.body).data?.length >= 0,
  });
  
  sleep(1);
}
```

**Run:** `k6 run load-tests/hotspot.js`  
**Add to CI** (Task 5.1) as an optional step that runs against staging: alerts if p95 latency > 3s.

---

---

# PRIORITY 6 — NEXT-LEVEL FEATURES
> **These features separate a college project from a real product. Implement after P1–P5.**

---

## TASK 6.1 — Animated Crime Heatmap Time-Slider

**Context:**  
A static heatmap shows where crimes happen. A time-slider heatmap shows HOW crime patterns evolve month by month — revealing seasonal patterns, neighbourhood deterioration, and the effect of interventions. This is the single most visually impressive feature you can add.

**What to build:**

**Backend — add time-bucketed KDE endpoint** `GET /api/v1/analytics/heatmap-timeline?zone=&crimeType=&bucketBy=month`:
- Returns an array of `{ bucket: '2025-01', heatPoints: [{lat, lon, intensity}] }` objects.
- Each bucket is a separate KDE computation over that month's crimes.

**Frontend — in `frontend/app/dashboard/hotspots/page.tsx`:**
```tsx
const [timelineData, setTimelineData] = useState<TimelineBucket[]>([]);
const [currentIndex, setCurrentIndex] = useState(0);
const [isPlaying, setIsPlaying] = useState(false);

// Auto-play: advance index every 800ms
useEffect(() => {
  if (!isPlaying) return;
  const timer = setInterval(() => {
    setCurrentIndex(i => (i + 1) % timelineData.length);
  }, 800);
  return () => clearInterval(timer);
}, [isPlaying, timelineData.length]);

// Render controls:
<div className="flex items-center gap-3 p-4 bg-card rounded-lg">
  <Button onClick={() => setIsPlaying(!isPlaying)}>
    {isPlaying ? 'Pause' : 'Play'}
  </Button>
  <input 
    type="range" min={0} max={timelineData.length - 1} value={currentIndex}
    onChange={e => setCurrentIndex(Number(e.target.value))}
    className="flex-1"
  />
  <span className="font-mono text-sm">{timelineData[currentIndex]?.bucket}</span>
</div>

// Pass timelineData[currentIndex].heatPoints to the KDE heatmap layer
```

The result: a scrub-able, auto-playable animation of crime evolution over 24 months. Extraordinary demo material.

---

## TASK 6.2 — NLP Entity Extraction from FIR Text

**Context:**  
FIR descriptions contain valuable information locked in free text: location names, time descriptions, suspect descriptions, weapon mentions, vehicle numbers. Automatically extracting these entities enriches the structured data and enables better spatial pinpointing.

**Add to `ml-service/requirements.txt`:** `spacy`  
**Download model:** `python -m spacy download en_core_web_sm` (or `xx_ent_wiki_sm` for multilingual including Hindi transliterated text).

**Create `ml-service/app/services/nlp.py`:**
```python
import spacy
import re

nlp = spacy.load('en_core_web_sm')

# Crime-domain patterns (extend with Hindi transliterations as needed)
LOCATION_PATTERNS = ['near', 'at', 'in front of', 'behind', 'beside', 'NH-', 'ward no']
TIME_PATTERNS = [r'\d{1,2}:\d{2}\s*(?:AM|PM|am|pm)?', r'(?:morning|evening|night|midnight|noon)']

def extract_fir_entities(description: str) -> dict:
    """Extract structured entities from FIR description text."""
    doc = nlp(description)
    
    entities = {
        'locations': [],
        'persons': [],
        'organizations': [],
        'dates': [],
        'times': [],
        'vehicle_numbers': [],
        'phone_numbers': [],
    }
    
    for ent in doc.ents:
        if ent.label_ in ('GPE', 'LOC', 'FAC'): entities['locations'].append(ent.text)
        elif ent.label_ == 'PERSON': entities['persons'].append(ent.text)
        elif ent.label_ == 'ORG': entities['organizations'].append(ent.text)
        elif ent.label_ == 'DATE': entities['dates'].append(ent.text)
        elif ent.label_ == 'TIME': entities['times'].append(ent.text)
    
    # Regex patterns for domain-specific entities
    vehicle_pattern = r'[A-Z]{2}\s?\d{2}\s?[A-Z]{1,2}\s?\d{4}'
    entities['vehicle_numbers'] = re.findall(vehicle_pattern, description)
    
    phone_pattern = r'(?:\+91|0)?[6-9]\d{9}'
    entities['phone_numbers'] = re.findall(phone_pattern, description)
    
    return {k: list(set(v)) for k, v in entities.items()}

def batch_extract(fir_list: list[dict]) -> list[dict]:
    return [
        {**fir, 'extracted_entities': extract_fir_entities(fir.get('description', ''))}
        for fir in fir_list
    ]
```

**Add endpoint** `POST /ml/nlp/extract` and proxy from backend.

**Frontend:** In the FIR detail view, show an "Extracted Entities" panel with tags for locations, persons, vehicle numbers extracted from the description. This data can also be used to auto-fill the location field if it was left blank.

---

## TASK 6.3 — Automated Weekly Crime Report (Email Digest)

**Context:**  
Every Monday morning, the system should automatically email zone supervisors a PDF summary of: last week's crime counts by zone, top hotspots, emerging trends, and patrol recommendations. This turns the system from a tool officers visit into one that pushes information to them.

**Install:** `npm install nodemailer @react-email/components` and `npm install --save-dev @react-email/tailwind` in the backend.

**Create `backend/src/services/report.service.js`:**
```javascript
import nodemailer from 'nodemailer';
import PDFDocument from 'pdfkit';

const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT) || 587,
  auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
});

export const generateWeeklyReport = async () => {
  // 1. Fetch last 7 days of analytics
  const zoneStats = await fetchZoneAnalytics({ fromDate: '7daysago' });
  const topHotspots = await fetchHotspots({ fromDate: '7daysago', limit: 5 });
  const forecast = await buildForecast({ periods: 7 });
  
  // 2. Generate PDF
  const doc = new PDFDocument({ margin: 50 });
  const buffers = [];
  doc.on('data', b => buffers.push(b));
  
  doc.fontSize(20).text('Weekly Crime Intelligence Report', { align: 'center' });
  doc.fontSize(12).text(`Generated: ${new Date().toLocaleDateString('en-IN')}`, { align: 'center' });
  doc.moveDown();
  
  doc.fontSize(14).text('Top 5 Hotspot Zones This Week:');
  topHotspots.forEach((h, i) => {
    doc.fontSize(11).text(`${i+1}. ${h.zone} — ${h.crime_count} incidents (${h.dominant_crime})`);
  });
  
  doc.end();
  const pdfBuffer = Buffer.concat(buffers);
  
  // 3. Email to supervisors
  const supervisors = await getUsersByRole('ADMIN');
  for (const user of supervisors) {
    await transporter.sendMail({
      from: process.env.SMTP_FROM,
      to: user.email,
      subject: `Weekly Crime Report — ${new Date().toLocaleDateString('en-IN')}`,
      text: 'Please find this week\'s crime intelligence report attached.',
      attachments: [{ filename: 'weekly-report.pdf', content: pdfBuffer }]
    });
  }
  
  logger.info({ recipients: supervisors.length }, 'Weekly report sent');
};
```

**Schedule using node-cron** — add to `backend/src/server.js`:
```javascript
import cron from 'node-cron';
// Every Monday at 7:00 AM IST (01:30 UTC)
cron.schedule('30 1 * * 1', generateWeeklyReport, { timezone: 'Asia/Kolkata' });
```

**Install:** `npm install node-cron pdfkit nodemailer`.

Add to `.env.example`: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`.

---

## TASK 6.4 — Geo-Fencing Alerts for Sensitive Areas

**Context:**  
Police departments need immediate alerts when crimes occur within designated sensitive areas — schools, hospitals, temples, political offices, border checkpoints. This is a high-priority feature for real deployment.

**Database migration** — `backend/migrations/20260420_06_geo_fences.cjs`:
```sql
CREATE TABLE geo_fences (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('SCHOOL', 'HOSPITAL', 'GOVERNMENT', 'RELIGIOUS', 'BORDER', 'CUSTOM')),
  boundary GEOMETRY(Polygon, 4326) NOT NULL,
  alert_radius_m INTEGER NOT NULL DEFAULT 500,
  notify_roles TEXT[] NOT NULL DEFAULT ARRAY['ADMIN', 'OFFICER'],
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_by INTEGER REFERENCES users(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
CREATE INDEX ON geo_fences USING GIST(boundary);
```

**Backend service** — check geo-fence violations after every FIR insert:
```javascript
// In fir.service.js, after inserting a new FIR:
const violations = await pool.query(`
  SELECT gf.name, gf.type, ST_Distance(
    ST_Transform($1::geometry, 3857),
    ST_Transform(gf.boundary, 3857)
  ) AS distance_m
  FROM geo_fences gf
  WHERE gf.active = TRUE
    AND ST_DWithin(
      gf.boundary::geography,
      ST_MakePoint($2, $3)::geography,
      gf.alert_radius_m
    )
`, [fir.location, fir.longitude, fir.latitude]);

if (violations.rows.length > 0) {
  broadcast('geo_fence_alert', {
    fir_no: fir.fir_no,
    crime_type: fir.crime_type,
    zones_violated: violations.rows.map(v => v.name),
    timestamp: new Date()
  });
}
```

**Frontend:** Add a "Geo-Fences" management page where admins can draw polygon boundaries on the map (using Leaflet.draw) and assign them a type and alert radius. New crime alerts within any fence show as a red push notification in the top navbar.

**Install:** `npm install leaflet-draw @types/leaflet-draw` in the frontend.

---

## TASK 6.5 — Hindi Language Support (i18n)

**Context:**  
Bihar police officers speak Hindi. Key UI elements (labels, buttons, status messages) in Hindi makes the system 10× more accessible for actual deployment. This is a unique differentiator no similar open-source project has.

**Install:** `npm install next-intl` in the frontend.

**Create `frontend/messages/en.json`:**
```json
{
  "dashboard": {
    "title": "Crime Intelligence Dashboard",
    "totalFIRs": "Total FIRs",
    "activeHotspots": "Active Hotspots"
  },
  "fir": {
    "createNew": "Register FIR",
    "firNumber": "FIR Number",
    "crimeType": "Crime Type"
  }
}
```

**Create `frontend/messages/hi.json`:**
```json
{
  "dashboard": {
    "title": "अपराध सूचना डैशबोर्ड",
    "totalFIRs": "कुल एफआईआर",
    "activeHotspots": "सक्रिय हॉटस्पॉट"
  },
  "fir": {
    "createNew": "एफआईआर दर्ज करें",
    "firNumber": "एफआईआर नंबर",
    "crimeType": "अपराध का प्रकार"
  }
}
```

**Configure `next-intl`** in `frontend/next.config.ts` and wrap the app with the provider. Add a language toggle (EN/HI) in the top navbar that persists the selection in a cookie.

---

## TASK 6.6 — FIR Photo/Document Attachments

**Context:**  
Real FIRs often have supporting evidence: crime scene photos, medical reports, witness statements. The system should allow attaching files to FIRs with secure storage.

**Storage:** Use MinIO (self-hosted S3-compatible) in development, actual S3/GCS in production.

**Add MinIO to `docker-compose.yml`:**
```yaml
minio:
  image: minio/minio
  command: server /data --console-address ":9001"
  environment:
    MINIO_ROOT_USER: minio
    MINIO_ROOT_PASSWORD: minio123
  ports:
    - "9000:9000"
    - "9001:9001"
  networks:
    - internal
```

**Install:** `npm install @aws-sdk/client-s3 @aws-sdk/s3-request-presigner multer` in backend.

**Database migration** — add attachments table:
```sql
CREATE TABLE fir_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fir_id INTEGER NOT NULL REFERENCES firs(id) ON DELETE CASCADE,
  filename TEXT NOT NULL,
  original_name TEXT NOT NULL,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  storage_key TEXT NOT NULL UNIQUE,
  uploaded_by INTEGER REFERENCES users(id),
  uploaded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
```

**Backend endpoints:**
- `POST /api/v1/fir/:id/attachments` — multipart upload (multer → S3), max 10MB per file, max 5 files per FIR, allowed: image/jpeg, image/png, application/pdf.
- `GET /api/v1/fir/:id/attachments` — list attachments.
- `GET /api/v1/fir/:id/attachments/:attachmentId/download` — generate pre-signed S3 URL (1-hour expiry) and redirect.

**Frontend:** In the FIR detail view, add a drag-and-drop file upload zone. Show attached files as thumbnails (images) or PDF icons. Click to download via pre-signed URL.

---

## TASK 6.7 — Natural Language Query Interface (AI Chatbot for Crime Data)

**Context:**  
Officers should be able to ask questions like "How many thefts happened in Muzaffarpur last month?" or "Which zone has the highest crime rate this year?" and get an instant answer — without navigating menus. This uses an LLM to convert natural language to SQL.

**Backend — create `backend/src/services/nlq.service.js`:**
```javascript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

const SCHEMA_CONTEXT = `
Database tables:
- firs(id, fir_no, crime_type, act_type, zone, police_station, occurred_at, status, severity)
- zones(id, name, type)
- irad_accidents(id, accident_id, severity, zone, date_time)

Available zones: Bihar districts (Patna, Muzaffarpur, Gaya, Bhagalpur, etc.)
Crime types: Theft, Murder, Robbery, Assault, Kidnapping, Fraud, Women Safety
`;

export const naturalLanguageQuery = async (question) => {
  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 500,
    system: `You are a SQL expert for a PostgreSQL crime database. 
Convert the user's question to a safe SELECT query only.
Never use DROP, DELETE, UPDATE, INSERT, or any DDL.
Return ONLY the SQL query, nothing else.
Schema: ${SCHEMA_CONTEXT}`,
    messages: [{ role: 'user', content: question }],
  });
  
  const sql = response.content[0].text.trim();
  
  // Safety check: only allow SELECT
  if (!/^SELECT/i.test(sql) || /DROP|DELETE|UPDATE|INSERT|CREATE|ALTER/i.test(sql)) {
    throw new Error('Only SELECT queries are allowed');
  }
  
  // Execute with timeout
  const result = await pool.query({ text: sql, rowMode: 'array' });
  return { sql, rows: result.rows, fields: result.fields.map(f => f.name) };
};
```

**Add route** `POST /api/v1/analytics/ask` (ADMIN/ANALYST only).

**Frontend — add a chat widget** in the analytics page:
```tsx
<div className="fixed bottom-4 right-4 z-50">
  <Button onClick={() => setOpen(!open)}>
    Ask AI
  </Button>
  {open && (
    <div className="absolute bottom-12 right-0 w-96 bg-card border rounded-lg shadow-xl p-4">
      <input 
        placeholder='e.g. "How many FIRs in Patna last month?"'
        onKeyDown={e => e.key === 'Enter' && sendQuery(e.target.value)}
      />
      {result && <pre className="text-xs mt-2 overflow-auto">{JSON.stringify(result, null, 2)}</pre>}
    </div>
  )}
</div>
```

Add `ANTHROPIC_API_KEY=your_key` to `.env.example`.

---

## TASK 6.8 — Crime Pattern Comparison Between Zones

**Context:**  
Officers want to compare two zones side by side: "Is Patna worse than Muzaffarpur for theft this year? Is it improving?" A dedicated comparison view with overlaid charts answers this without manual data lookup.

**Backend — add `GET /api/v1/analytics/compare?zones=Patna,Muzaffarpur&crimeType=Theft&year=2025`:**
```javascript
// Returns monthly crime counts for each zone in the date range
const result = await pool.query(`
  SELECT 
    zone,
    TO_CHAR(DATE_TRUNC('month', occurred_at), 'YYYY-MM') AS month,
    COUNT(*) AS count,
    SUM(CASE WHEN severity >= 3 THEN 1 ELSE 0 END) AS serious_count
  FROM firs
  WHERE zone = ANY($1::text[])
    AND ($2::text IS NULL OR crime_type = $2)
    AND EXTRACT(YEAR FROM occurred_at) = $3
  GROUP BY zone, month
  ORDER BY zone, month
`, [zones, crimeType || null, year]);
```

**Frontend — add `frontend/app/dashboard/analytics/compare/page.tsx`:**
- A zone selector (multi-select, max 4 zones) + crime type filter + year selector.
- A Recharts `LineChart` with one line per zone, same X-axis (months), Y-axis (crime count).
- Below the chart: a summary table comparing total, peak month, change vs. previous year (↑↓ with percentage).
- Export button to download the comparison as CSV.

---

## TASK 6.9 — Officer Performance Dashboard

**Context:**  
Station House Officers (SHOs) and DIG-level supervisors need to track patrol coverage, response times, and FIR registration rates per police station. This turns the system into an accountability tool.

**Database migration** — `backend/migrations/20260420_07_officer_metrics.cjs`:
```sql
CREATE TABLE patrol_logs (
  id SERIAL PRIMARY KEY,
  route_id INTEGER REFERENCES patrol_routes(id),
  unit_id INTEGER REFERENCES patrol_units(id),
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  coverage_pct DECIMAL(5,2),  -- % of route actually covered
  notes TEXT
);
```

**Backend analytics** — `GET /api/v1/analytics/officer-performance?station=&month=`:
```javascript
// Returns per-station metrics:
// - FIRs registered this month
// - Patrol routes completed vs. planned
// - Average route coverage %
// - Days with zero patrols ("dark days")
// - Serious crime response count
```

**Frontend — add `frontend/app/dashboard/reports/officer-performance/page.tsx`:**
- A table of police stations with colour-coded performance indicators (green/yellow/red).
- Clicking a station drills down to its officer-level detail.
- Printable view for weekly review meetings (use `@media print` CSS).

---

---

# TASK EXECUTION ORDER (COMPLETE)

Give tasks to AI in this order. Each row is a self-contained session.

## Phase A — Critical Fixes (Week 1)
| Order | Task | Time | Impact |
|---|---|---|---|
| 1 | Task 1.1 — bcrypt rounds 6→12 | 10 min | Security |
| 2 | Task 1.6 — Helmet.js security headers | 15 min | Security |
| 3 | Task 1.4 — API v1 prefix | 20 min | Maintainability |
| 4 | Task 1.5 — Remove .env from git | 15 min | Security |
| 5 | Task 1.7 — Per-route auth rate limiting | 20 min | Security |
| 6 | Task 1.8 — Account lockout | 30 min | Security |
| 7 | Task 1.2 — JWT → HttpOnly cookies | 45 min | Security |
| 8 | Task 1.9 — CSRF protection | 45 min | Security |
| 9 | Task 1.3 — Isolate ML service network | 20 min | Security |

## Phase B — Backend Hardening (Week 2)
| Order | Task | Time | Impact |
|---|---|---|---|
| 10 | Task 2.7 — Graceful shutdown | 15 min | Reliability |
| 11 | Task 2.10 — DB connection pool tuning | 10 min | Performance |
| 12 | Task 2.2 — Composite DB indexes | 15 min | Performance |
| 13 | Task 2.9 — Request correlation IDs | 20 min | Observability |
| 14 | Task 2.4 — Pino structured logging | 30 min | Observability |
| 15 | Task 2.6 — Validate all missing endpoints | 30 min | Correctness |
| 16 | Task 2.8 — Circuit breaker for ML service | 45 min | Reliability |
| 17 | Task 2.11 — Full-text search on FIRs | 30 min | Feature |
| 18 | Task 2.1 — Refresh token system | 90 min | Security |
| 19 | Task 2.3 — Redis caching for hotspots | 60 min | Performance |
| 20 | Task 2.5 — SSE real-time FIR alerts | 60 min | Feature |
| 21 | Task 2.12 — BullMQ background ML jobs | 60 min | Architecture |

## Phase C — ML Upgrades (Week 3)
| Order | Task | Time | Impact |
|---|---|---|---|
| 22 | Task 3.1 — Random Forest classifier | 60 min | ML depth |
| 23 | Task 3.8 — k-Fold cross-validation | 30 min | ML credibility |
| 24 | Task 3.2 — Moran's I autocorrelation | 45 min | Academic |
| 25 | Task 3.3 — PAI metric | 30 min | Academic |
| 26 | Task 3.4 — Learned risk weights (Ridge) | 45 min | ML depth |
| 27 | Task 3.5 — SHAP explainability | 60 min | Academic + UX |
| 28 | Task 3.6 — Crime spike anomaly detection | 45 min | Feature |
| 29 | Task 3.7 — Near-repeat victimization | 45 min | Academic + Feature |

## Phase D — Frontend Polish (Week 4)
| Order | Task | Time | Impact |
|---|---|---|---|
| 30 | Task 4.5 — Map marker clustering | 30 min | Performance |
| 31 | Task 4.6 — Toast notifications | 20 min | UX |
| 32 | Task 4.1 — Loading skeletons + error boundaries | 45 min | UX |
| 33 | Task 4.4 — FIR table pagination controls | 30 min | UX |
| 34 | Task 4.7 — Filter persistence via URL params | 30 min | UX |
| 35 | Task 4.8 — Mobile responsive audit | 60 min | Accessibility |
| 36 | Task 4.3 — CSV/PDF export | 60 min | Feature |
| 37 | Task 4.2 — PWA offline support | 90 min | Field use |

## Phase E — DevOps & Quality (Week 5)
| Order | Task | Time | Impact |
|---|---|---|---|
| 38 | Task 5.8 — Docker .dockerignore + image optimize | 20 min | DevOps |
| 39 | Task 5.1 — GitHub Actions CI pipeline | 30 min | Quality |
| 40 | Task 5.7 — Integration tests (auth + FIR) | 60 min | Quality |
| 41 | Task 5.4 — Health check enhancement | 20 min | Observability |
| 42 | Task 5.3 — Swagger/OpenAPI docs | 60 min | Professional |
| 43 | Task 5.5 — Nginx reverse proxy config | 30 min | Production |
| 44 | Task 5.6 — Prometheus + Grafana monitoring | 60 min | Observability |
| 45 | Task 5.9 — k6 load testing | 45 min | Quality |
| 46 | Task 5.2 — DB table partitioning (careful!) | 120 min | Scalability |

## Phase F — Next-Level Features (Week 6+)
| Order | Task | Time | Impact |
|---|---|---|---|
| 47 | Task 6.1 — Animated heatmap time-slider | 90 min | Wow factor |
| 48 | Task 6.8 — Zone comparison charts | 60 min | Analytics |
| 49 | Task 6.4 — Geo-fencing sensitive area alerts | 90 min | Real-world |
| 50 | Task 6.6 — FIR photo/document attachments | 120 min | Real-world |
| 51 | Task 6.2 — NLP entity extraction from FIR text | 90 min | AI depth |
| 52 | Task 6.9 — Officer performance dashboard | 90 min | Real-world |
| 53 | Task 6.3 — Automated weekly email report | 60 min | Automation |
| 54 | Task 6.5 — Hindi language support (i18n) | 90 min | Deployment |
| 55 | Task 6.7 — Natural language query (AI chatbot) | 120 min | Next-level |

---

## Quick-Start Cheat Sheet

**Today (30 minutes):** Tasks 1, 2, 3, 4 — all tiny, all critical, zero risk.  
**This week:** Complete Phase A (all security fixes).  
**Before demo:** Complete Phase C (ML upgrades) + Phase D (frontend polish).  
**For internship portfolio:** Complete Phase F Tasks 47, 51, 55 (animated heatmap, NLP, AI chatbot).

---

*Document generated: 2026-04-20 | Total tasks: 55 | Estimated total: ~60–70 hours*  
*For research paper improvements, see the separate research paper review.*
