# Database Schema Reference
**Crime Predictive Hotspot Mapping System**  
PostgreSQL 15 + PostGIS 3.4  
Last updated: 2026-04-20

---

## Quick Reference

| Table | Rows (est. prod.) | Purpose |
|---|---|---|
| `users` | ~100 | Officers, analysts, admins who log in |
| `refresh_tokens` | ~300 | JWT refresh token store (hashed) |
| `crime_classifications` | ~500 | IPC / special act section master |
| `zones` | ~400 | District and police station boundaries |
| `firs` | 50k–500k | **Primary fact table** — one row per FIR |
| `fir_attachments` | ~200k | Photos/PDFs linked to FIRs (metadata only) |
| `audit_logs` | millions | Immutable action log — never updated |
| `irad_accidents` | ~10k | Road accident records from IRAD |
| `geo_fences` | ~50 | Sensitive area polygons (schools, hospitals) |
| `patrol_routes` | ~1k | OR-Tools optimized patrol routes |
| `patrol_route_stops` | ~10k | Waypoints within each route |
| `patrol_units` | ~200 | Police vehicles/units with live location |
| `patrol_logs` | ~5k | Execution records (planned vs. actual) |
| `schema_versions` | <10 | Applied schema version tracking |

---

## Entity Relationship Diagram

```
users ──────────────────────────────────────────────────────────────┐
  │ id                                                               │
  ├──(created_by)──► patrol_routes                                  │
  ├──(registered_by)► firs                                          │
  ├──(uploaded_by)──► fir_attachments                               │
  ├──(user_id)──────► audit_logs                                    │
  ├──(created_by)──► geo_fences                                     │
  ├──(officer_id)───► patrol_logs                                   │
  └──(user_id)──────► refresh_tokens                                │
                                                                     │
crime_classifications ──(classification_id)──► firs                │
                                                │                    │
zones ──────────────────(zone_id)──────────────┘                    │
  │ (parent_id self-ref)                                             │
  └── DISTRICT ──► STATION (parent-child hierarchy)                 │
                                                                     │
firs ──────────────────────────────────────────────────────────────┤
  │ id                                                               │
  └──(fir_id)────────► fir_attachments                              │
                                                                     │
patrol_routes ──────────────────────────────────────────────────────┤
  │ id                                                               │
  ├──(route_id)──────► patrol_route_stops                           │
  ├──(assigned_unit)──► patrol_units                                │
  └──(route_id)──────► patrol_logs                                  │
                                                                     │
patrol_units ──────────────────────────────────────────────────────┘
  │ id
  ├──(assigned_route_id)── patrol_routes (circular — managed in app)
  └──(unit_id)────────► patrol_logs
```

---

## Extensions Required

```sql
postgis     -- Spatial types (GEOGRAPHY, GEOMETRY) and ST_* functions
pgcrypto    -- pgp_sym_encrypt / pgp_sym_decrypt for sensitive fields
uuid-ossp   -- gen_random_uuid() for token tables
pg_trgm     -- Trigram similarity for fuzzy text search fallback
```

---

## Tables — Detailed Reference

---

### `users`

Stores every person who can log into the system.

| Column | Type | Nullable | Default | Notes |
|---|---|---|---|---|
| `id` | SERIAL | NO | auto | Primary key |
| `name` | VARCHAR(255) | NO | — | Full name |
| `email` | VARCHAR(255) | NO | — | Unique login identifier |
| `password_hash` | TEXT | NO | — | bcrypt, cost=12 minimum |
| `role` | ENUM | NO | `'OFFICER'` | `ADMIN`, `OFFICER`, `ANALYST` |
| `failed_login_attempts` | INTEGER | NO | `0` | Reset to 0 on success |
| `locked_until` | TIMESTAMPTZ | YES | NULL | NULL = not locked |
| `last_failed_login` | TIMESTAMPTZ | YES | NULL | Last failed attempt time |
| `is_active` | BOOLEAN | NO | `TRUE` | FALSE = cannot login |
| `last_login_at` | TIMESTAMPTZ | YES | NULL | Updated on every login |
| `created_at` | TIMESTAMPTZ | NO | NOW() | — |
| `updated_at` | TIMESTAMPTZ | NO | NOW() | Auto-updated by trigger |

**Roles:**
- `ADMIN` — full access including user management, all zones
- `OFFICER` — create/update FIRs in their assigned station
- `ANALYST` — read-only, can run ML analysis and export reports

**Indexes:** `email` (unique), `role`, `is_active`

**Lockout logic:** After 5 failed logins → `locked_until = NOW() + 30 minutes`. Backend checks this before bcrypt comparison to avoid timing attacks.

---

### `refresh_tokens`

Stores hashed long-lived tokens for the JWT refresh flow. Raw tokens are never stored.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK — gen_random_uuid() |
| `user_id` | INTEGER | FK → users(id) CASCADE DELETE |
| `token_hash` | TEXT | SHA-256(raw_token). Unique. |
| `expires_at` | TIMESTAMPTZ | 7 days from creation |
| `revoked` | BOOLEAN | Set TRUE on logout |
| `ip_address` | VARCHAR(64) | For audit purposes |
| `user_agent` | TEXT | Browser/device identification |
| `created_at` | TIMESTAMPTZ | — |

**Flow:**
1. Login → generate 64-byte random token → SHA-256 → store hash → send raw token in HttpOnly cookie
2. Access token (15 min) expires → send refresh token cookie to `POST /api/v1/auth/refresh`
3. Backend hashes incoming token → looks up in table → issues new access token
4. Logout → `revoked = TRUE` → both cookies cleared

---

### `crime_classifications`

IPC and special act section master table. Seeded from `scripts/seed_classifications.js`.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `act_type` | VARCHAR(50) | `'IPC'`, `'POCSO'`, `'SC_ST'`, `'NDPS'`, `'IT_ACT'`, `'MV_ACT'` |
| `section_code` | VARCHAR(50) | `'302'`, `'376'`, `'420'` |
| `title` | VARCHAR(255) | Short: `'Murder'`, `'Rape'` |
| `description` | TEXT | Full legal text |
| `category` | VARCHAR(100) | `'Violent'`, `'Property'`, `'Cyber'`, `'Women Safety'` |
| `severity` | INTEGER | 1=Minor → 5=Heinous |
| `is_women_safety` | BOOLEAN | Weights the women-safety KDE layer |
| `is_accident_related` | BOOLEAN | Used in IRAD overlap analysis |
| `is_cognizable` | BOOLEAN | FIR can be filed without magistrate |
| `bailable` | BOOLEAN | NULL = court discretion |

**Unique constraint:** `(act_type, section_code)` — one row per section per act.

**Severity scale:**

| Value | Label | Examples |
|---|---|---|
| 1 | Minor | Simple hurt, trespass |
| 2 | Low | Theft, cheating |
| 3 | Moderate | Robbery, grievous hurt |
| 4 | Serious | Gang robbery, kidnapping |
| 5 | Heinous | Murder, rape, dacoity |

---

### `zones`

Administrative boundary polygons for Bihar. Two types: district-level and station-level.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `name` | VARCHAR(255) | `'Patna'`, `'Muzaffarpur Sadar PS'` |
| `type` | ENUM | `'DISTRICT'` or `'STATION'` |
| `boundary` | GEOMETRY(MultiPolygon, 4326) | **GEOMETRY**, not GEOGRAPHY (for containment) |
| `parent_id` | INTEGER | Station zones → parent District zone |
| `district` | VARCHAR(100) | Denormalized for fast GROUP BY |
| `area_km2` | NUMERIC(10,4) | Pre-computed for PAI metric |

**GEOMETRY vs GEOGRAPHY design decision:**
- `firs.location` is **GEOGRAPHY** → uses haversine distance (accurate for `ST_DWithin` radius queries across lat/lon)
- `zones.boundary` is **GEOMETRY** → uses planar math (faster for `ST_Within`, `ST_Intersects` containment queries on local-scale polygons)

**GeoJSON source:** `frontend/public/geo/bihar_districts.geojson` and `bihar_police_stations.geojson`

---

### `firs` ⭐ (Primary Fact Table)

The core table. Every crime report is one row here.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `fir_no` | VARCHAR(50) | Unique FIR number, e.g. `'123/2025'` |
| `crime_type` | VARCHAR(100) | Human-readable: `'Theft'`, `'Murder'` |
| `act_type` | VARCHAR(50) | `'IPC'`, `'POCSO'`, etc. |
| `section` | VARCHAR(100) | Raw text from FIR form |
| `section_code` | VARCHAR(50) | Normalized code for FK |
| `classification_id` | INTEGER | FK → crime_classifications |
| `category` | VARCHAR(100) | Denormalized from classification |
| `severity` | INTEGER | 1–5 (copied from classification) |
| `occurred_at` | TIMESTAMPTZ | **When crime happened** (not filed) |
| `location` | GEOGRAPHY(Point, 4326) | Crime scene lat/lon |
| `location_name` | VARCHAR(255) | Human-readable address |
| `police_station` | VARCHAR(100) | Jurisdiction |
| `zone` | VARCHAR(100) | District name (denormalized) |
| `zone_id` | INTEGER | FK → zones(id) |
| `victim_gender` | VARCHAR(20) | `'MALE'`, `'FEMALE'`, `'TRANSGENDER'`, `'UNKNOWN'` |
| `victim_age` | INTEGER | Age of primary victim |
| `victim_count` | INTEGER | Total victims in this FIR |
| `sensitive_notes_enc` | BYTEA | pgp_sym_encrypt(notes, key) |
| `status` | ENUM | `PENDING` → `UNDER_INVESTIGATION` → `CHARGESHEETED` / `CLOSED` |
| `description` | TEXT | FIR narrative |
| `search_vector` | TSVECTOR | Auto-computed by trigger for FTS |
| `registered_by` | INTEGER | FK → users |
| `source` | VARCHAR(50) | `'MANUAL'`, `'BULK_IMPORT'`, `'CCTNS'` |

**Full-text search usage:**
```sql
-- Find FIRs mentioning "knife" or "NH-28"
SELECT * FROM firs
WHERE search_vector @@ plainto_tsquery('english', 'knife NH-28')
ORDER BY ts_rank(search_vector, plainto_tsquery('english', 'knife')) DESC;
```

**Spatial query usage:**
```sql
-- FIRs within 500m of a point
SELECT * FROM firs
WHERE ST_DWithin(location, ST_MakePoint(85.3, 25.5)::geography, 500);
```

**Sensitive notes encryption:**
```sql
-- Encrypt (in application layer, not SQL):
-- pgp_sym_encrypt(plaintext, key) → store in sensitive_notes_enc
-- pgp_sym_decrypt(sensitive_notes_enc, key) → read in application layer
```

**Indexes summary:**
| Index | Type | Columns | Purpose |
|---|---|---|---|
| `idx_firs_location_gix` | GIST | `location` | `ST_DWithin` hotspot queries |
| `idx_firs_search_vector_gin` | GIN | `search_vector` | Full-text search |
| `idx_firs_zone_date_type` | BTree | `zone, occurred_at, crime_type` | Dashboard filter (most used) |
| `idx_firs_occurred_at` | BTree | `occurred_at DESC` | Time-range queries |
| `idx_firs_police_station` | BTree | `police_station` | Station filter |
| `idx_firs_status` | BTree | `status` | Pending/active filter |
| `idx_firs_act_type_zone` | BTree | `act_type, zone` | Women-safety analytics |

---

### `fir_attachments`

File attachment metadata. Actual files live in MinIO/S3 object storage.

| Column | Type | Notes |
|---|---|---|
| `id` | UUID | PK — gen_random_uuid() |
| `fir_id` | INTEGER | FK → firs(id) CASCADE |
| `filename` | TEXT | Storage filename (UUID-based) |
| `original_name` | TEXT | User's original filename |
| `mime_type` | TEXT | `'image/jpeg'`, `'application/pdf'` |
| `size_bytes` | INTEGER | For display and quota enforcement |
| `storage_key` | TEXT | Full object path: `fir-attachments/{fir_id}/{uuid}.jpg` |
| `attachment_type` | ENUM | `IMAGE`, `PDF`, `VIDEO`, `AUDIO`, `OTHER` |
| `uploaded_by` | INTEGER | FK → users |
| `uploaded_at` | TIMESTAMPTZ | — |

**Storage path convention:** `s3://crime-map-bucket/fir-attachments/{fir_id}/{uuid}{ext}`

**Limits (enforced in application layer):** max 5 attachments per FIR, max 10MB per file, allowed MIME: `image/jpeg`, `image/png`, `image/webp`, `application/pdf`

**Download:** Never serve files directly. Generate a pre-signed S3 URL valid for 1 hour.

---

### `audit_logs`

Immutable event log. Every sensitive action writes a row here. Never update or delete.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `user_id` | INTEGER | FK → users (nullable — system actions) |
| `action` | VARCHAR(100) | Verb: `FIR_CREATE`, `FIR_UPDATE`, `USER_LOGIN`, `BULK_IMPORT` |
| `entity` | VARCHAR(100) | Table name: `'firs'`, `'users'` |
| `entity_id` | VARCHAR(100) | PK of affected row |
| `metadata` | JSONB | `{before: {}, after: {}}` or `{count: 42, skipped: 3}` |
| `ip_address` | VARCHAR(64) | Request origin |
| `user_agent` | TEXT | Browser fingerprint |
| `created_at` | TIMESTAMPTZ | — |

**Standard action names:**

| Action | Triggered by |
|---|---|
| `USER_LOGIN` | Successful login |
| `USER_LOGIN_FAILED` | Failed login attempt |
| `USER_LOCKED` | Account locked after max attempts |
| `FIR_CREATE` | New FIR registered |
| `FIR_UPDATE` | FIR status or fields changed |
| `BULK_IMPORT` | CSV/CCTNS bulk import |
| `PATROL_ROUTE_CREATED` | New route generated |
| `GEO_FENCE_ALERT` | Crime detected in geo-fence |

---

### `irad_accidents`

Road accident records from the Integrated Road Accident Database (IRAD) system.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `accident_id` | VARCHAR(100) | IRAD system ID (unique) |
| `occurred_at` | TIMESTAMPTZ | Accident timestamp |
| `severity` | INTEGER | 1=Minor, 2=Serious, 3=Fatal |
| `location` | GEOGRAPHY(Point, 4326) | Accident location |
| `location_name` | VARCHAR(255) | Landmark/address |
| `road_name` | VARCHAR(255) | `'NH-28'`, `'SH-4'` |
| `road_type` | VARCHAR(50) | `'NH'`, `'SH'`, `'MDR'`, `'VR'` |
| `district` | VARCHAR(100) | Bihar district |
| `casualties` | INTEGER | Deaths |
| `injuries` | INTEGER | Non-fatal injuries |
| `weather_condition` | VARCHAR(50) | `'CLEAR'`, `'RAIN'`, `'FOG'` |
| `light_condition` | VARCHAR(50) | `'DAYLIGHT'`, `'DARK_UNLIT'` |
| `source` | VARCHAR(100) | `'IRAD'` (default) |

---

### `geo_fences`

Sensitive area polygons. When a FIR is registered whose location falls within `alert_radius_m` of a fence boundary, an SSE alert is broadcast.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `name` | TEXT | `'Patna City Hospital'`, `'Ganga Bridge'` |
| `type` | ENUM | `SCHOOL`, `HOSPITAL`, `GOVERNMENT`, `RELIGIOUS`, `BORDER`, `CUSTOM` |
| `boundary` | GEOMETRY(Polygon, 4326) | Polygon drawn on Leaflet map |
| `alert_radius_m` | INTEGER | Extra buffer beyond polygon (default 500m) |
| `notify_roles` | TEXT[] | `['ADMIN', 'OFFICER']` — who gets the SSE alert |
| `active` | BOOLEAN | Toggle without deleting |
| `created_by` | INTEGER | FK → users |

**Alert query (runs after every FIR insert):**
```sql
SELECT gf.name, gf.type
FROM geo_fences gf
WHERE gf.active = TRUE
  AND ST_DWithin(
    gf.boundary::geography,
    ST_MakePoint($lon, $lat)::geography,
    gf.alert_radius_m
  );
```

---

### `patrol_routes`

Optimized patrol routes generated by the OR-Tools VRP solver in the ML service.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `name` | VARCHAR(255) | e.g. `'Patna Sadar Night Patrol 2025-04-20'` |
| `zone` | VARCHAR(100) | Coverage area |
| `created_by` | INTEGER | FK → users |
| `assigned_unit` | INTEGER | FK → patrol_units |
| `status` | ENUM | `PLANNED` → `ACTIVE` → `COMPLETED` / `CANCELLED` |
| `risk_score` | NUMERIC(6,2) | Aggregate risk of all stops |
| `total_distance_km` | NUMERIC(8,3) | Pre-computed by OR-Tools |
| `scheduled_for` | TIMESTAMPTZ | Planned start time |
| `estimated_duration_min` | INTEGER | Expected duration |

---

### `patrol_route_stops`

Ordered waypoints for a patrol route. `sequence` is 1-based.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `route_id` | INTEGER | FK → patrol_routes CASCADE |
| `sequence` | INTEGER | Order within route (1, 2, 3...) |
| `latitude` | NUMERIC(10,6) | — |
| `longitude` | NUMERIC(10,6) | — |
| `location` | GEOGRAPHY(Point) | **Generated column** from lat/lon |
| `stop_name` | TEXT | Landmark name |
| `crime_count` | INTEGER | Recent crimes within 300m |
| `risk_score` | NUMERIC(6,2) | Individual stop risk |
| `dwell_time_min` | INTEGER | Recommended stop duration |

**Generated column:** `location` is automatically computed from `latitude` and `longitude` — no need to set it manually:
```sql
location GEOGRAPHY(Point, 4326)
  GENERATED ALWAYS AS (ST_MakePoint(longitude, latitude)::geography) STORED
```

---

### `patrol_units`

Police vehicles, motorcycles, or foot patrols. Tracks live status and location.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `unit_code` | VARCHAR(50) | `'PATROL-PAT-01'`, `'PCR-006'` (unique) |
| `unit_type` | VARCHAR(50) | `'VEHICLE'`, `'MOTORCYCLE'`, `'FOOT'` |
| `officer_name` | VARCHAR(255) | Currently assigned officer |
| `officer_badge` | VARCHAR(50) | Badge number |
| `status` | ENUM | `AVAILABLE`, `ON_PATROL`, `OFF_DUTY`, `MAINTENANCE` |
| `last_lat` | NUMERIC(10,6) | Last known latitude |
| `last_lon` | NUMERIC(10,6) | Last known longitude |
| `last_location` | GEOGRAPHY(Point) | For spatial proximity queries |
| `last_seen` | TIMESTAMPTZ | When last_location was updated |
| `assigned_route_id` | INTEGER | FK → patrol_routes |
| `station` | VARCHAR(100) | Home police station |

---

### `patrol_logs`

Records what actually happened when a patrol was executed. Feeds the officer performance dashboard.

| Column | Type | Notes |
|---|---|---|
| `id` | SERIAL | PK |
| `route_id` | INTEGER | FK → patrol_routes CASCADE |
| `unit_id` | INTEGER | FK → patrol_units |
| `officer_id` | INTEGER | FK → users |
| `started_at` | TIMESTAMPTZ | Actual start time |
| `completed_at` | TIMESTAMPTZ | Actual end time |
| `coverage_pct` | NUMERIC(5,2) | % of planned stops visited (0–100) |
| `stops_visited` | INTEGER | Actual stops completed |
| `stops_planned` | INTEGER | Planned stop count |
| `distance_km_actual` | NUMERIC(8,3) | GPS-tracked actual distance |
| `incidents_encountered` | INTEGER | FIRs registered during this patrol |

---

## Views Reference

### `fir_summary`
Pre-joined view combining `firs + crime_classifications + users`. Used by analytics and export endpoints. Includes computed time fields (`year`, `month`, `day_of_week`, `hour_of_day`) and extracted lat/lon from the GEOGRAPHY column.

### `zone_crime_stats`
Aggregated per-zone statistics: total FIRs, last 7/30 days, pending count, avg severity, dominant crime type. Used by the dashboard summary cards.

### `hotspot_candidates`
Filtered view: recent (last 90 days), non-closed FIRs with location data. This is the input dataset for DBSCAN and KDE in the ML service. Keeps ML queries clean and avoids filtering in the ML service Python code.

---

## Key Design Decisions

### 1. GEOGRAPHY vs GEOMETRY
```
firs.location         → GEOGRAPHY(Point, 4326)
irad_accidents.location → GEOGRAPHY(Point, 4326)
patrol_units.last_location → GEOGRAPHY(Point, 4326)

zones.boundary        → GEOMETRY(MultiPolygon, 4326)
geo_fences.boundary   → GEOMETRY(Polygon, 4326)
patrol_route_stops.location → GEOGRAPHY(Point, 4326)
```
**GEOGRAPHY** is used for any point that needs accurate distance calculation (`ST_DWithin` uses haversine). **GEOMETRY** is used for polygon boundary operations (`ST_Within`, `ST_Intersects`) which are faster on projected coordinates.

### 2. `occurred_at` vs `date_time`
Original migrations used `date_time`. The full schema standardizes on `occurred_at` — more semantically clear (it is when the crime *occurred*, not when the FIR was *filed* or *created*). Migration needed: `ALTER TABLE firs RENAME COLUMN date_time TO occurred_at;`

### 3. Denormalized `zone` Column on `firs`
`firs.zone` (VARCHAR) is denormalized from `zones.name` for fast `GROUP BY zone` in analytics queries. The FK `firs.zone_id` is also maintained for joins. This is intentional — analytics performance wins over strict normalization here.

### 4. Soft Deletes
No `deleted_at` columns. Deleting FIRs is a serious operation that should be rare. Instead: set `status = 'CLOSED'` and log the action in `audit_logs`. Users can be soft-disabled via `users.is_active = FALSE`.

### 5. Sensitive Data Encryption
`firs.sensitive_notes_enc` stores `pgp_sym_encrypt(plaintext, DB_ENCRYPTION_KEY)` as BYTEA. The key is never in the DB — only in the application environment. Decryption happens in the application layer, never in SQL views or functions.

### 6. search_vector Auto-Maintenance
A BEFORE INSERT/UPDATE trigger automatically rebuilds `firs.search_vector` whenever `description`, `location_name`, `crime_type`, or `fir_no` changes. Weights: `crime_type` and `fir_no` = A (highest), `category` and `location_name` = B, `description` = C (lowest).

---

## Migration File Mapping

| Migration File | Tables Created / Modified |
|---|---|
| `20260217_01_init_schema.cjs` | `users`, `firs` (basic), PostGIS extension |
| `20260217_02_zones.cjs` | `zones` |
| `20260218_01_feature_expansion.cjs` | `crime_classifications`, pgcrypto, `firs` columns expansion, `audit_logs`, `irad_accidents`, `patrol_routes`, `patrol_route_stops`, `patrol_units` |
| `20260420_01_refresh_tokens.cjs` | `refresh_tokens` |
| `20260420_02_performance_indexes.cjs` | Composite indexes on `firs` |
| `20260420_03_fir_fulltext.cjs` | `firs.search_vector` + GIN index + trigger |
| `20260420_04_account_lockout.cjs` | `users.failed_login_attempts`, `locked_until`, `last_failed_login` |
| `20260420_05_geo_fences.cjs` | `geo_fences` |
| `20260420_06_fir_attachments.cjs` | `fir_attachments` |
| `20260420_07_patrol_logs.cjs` | `patrol_logs`, `patrol_routes.assigned_unit`, `patrol_routes.total_distance_km` |

---

## Common Queries

**FIRs in a zone last 30 days:**
```sql
SELECT * FROM fir_summary
WHERE zone = 'Patna'
  AND occurred_at >= NOW() - INTERVAL '30 days'
ORDER BY occurred_at DESC;
```

**Hotspot input for ML service:**
```sql
SELECT latitude, longitude, severity, crime_type
FROM hotspot_candidates
WHERE zone = 'Muzaffarpur';
```

**Full-text search:**
```sql
SELECT fir_no, crime_type, zone, occurred_at,
       ts_rank(search_vector, query) AS rank
FROM firs, plainto_tsquery('english', 'vehicle theft NH-28') query
WHERE search_vector @@ query
ORDER BY rank DESC;
```

**Geo-fence alert check:**
```sql
SELECT name, type FROM geo_fences
WHERE active = TRUE
  AND ST_DWithin(
    boundary::geography,
    ST_MakePoint(85.1376, 25.5941)::geography,
    alert_radius_m
  );
```

**Zone crime stats for dashboard:**
```sql
SELECT * FROM zone_crime_stats
ORDER BY firs_last_30_days DESC
LIMIT 10;
```

**Nearest available patrol unit to a crime location:**
```sql
SELECT unit_code, officer_name,
       ST_Distance(last_location, ST_MakePoint(85.14, 25.59)::geography) AS distance_m
FROM patrol_units
WHERE status = 'AVAILABLE'
  AND last_location IS NOT NULL
ORDER BY distance_m ASC
LIMIT 3;
```

---

*For the runnable SQL: see [schema.sql](schema.sql)*  
*For implementation tasks: see [AI_IMPLEMENTATION_PLAN.md](AI_IMPLEMENTATION_PLAN.md)*
