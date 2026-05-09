-- =============================================================================
-- CRIME PREDICTIVE HOTSPOT MAPPING SYSTEM
-- Complete Database Schema
-- =============================================================================
-- Authoritative source of truth. Last updated: 2026-05-09
--
-- Environment note:
--   Production target: PostgreSQL 15 + PostGIS 3.4 (GEOGRAPHY types, GIST indexes)
--   Local dev:         PostgreSQL 18 — PostGIS not yet available for PG18.
--                      Location fields use JSONB { "lat": ..., "lon": ... } instead.
--                      The migration files in /backend/migrations handle this automatically.
--
-- Database name: crime_hotspot_db  (local dev)  |  crime_db  (production target)
--
-- Run order: extensions → tables → indexes → triggers → views → seed
--
-- To apply fresh (local dev, no PostGIS):
--   psql -U postgres -d crime_hotspot_db -f schema.sql
--
-- To apply via migrations (recommended — handles PG18 differences):
--   npm run migrate:up  (in /backend)
-- =============================================================================


-- =============================================================================
-- EXTENSIONS
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS postgis;      -- Spatial types: GEOGRAPHY, GEOMETRY, ST_* functions
CREATE EXTENSION IF NOT EXISTS pgcrypto;     -- pgp_sym_encrypt / pgp_sym_decrypt for sensitive fields
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";  -- uuid_generate_v4() for token tables
CREATE EXTENSION IF NOT EXISTS pg_trgm;      -- Trigram indexes for LIKE-based fuzzy search fallback


-- =============================================================================
-- CUSTOM TYPES / ENUMS
-- =============================================================================

DO $$ BEGIN
  CREATE TYPE user_role          AS ENUM ('ADMIN', 'OFFICER', 'ANALYST');
  CREATE TYPE fir_status         AS ENUM ('PENDING', 'UNDER_INVESTIGATION', 'CHARGESHEETED', 'CLOSED', 'REFERRED');
  CREATE TYPE zone_type          AS ENUM ('DISTRICT', 'STATION');
  CREATE TYPE patrol_status      AS ENUM ('PLANNED', 'ACTIVE', 'COMPLETED', 'CANCELLED');
  CREATE TYPE unit_status        AS ENUM ('AVAILABLE', 'ON_PATROL', 'OFF_DUTY', 'MAINTENANCE');
  CREATE TYPE accident_severity  AS ENUM ('MINOR', 'SERIOUS', 'FATAL');
  CREATE TYPE geo_fence_type     AS ENUM ('SCHOOL', 'HOSPITAL', 'GOVERNMENT', 'RELIGIOUS', 'BORDER', 'CUSTOM');
  CREATE TYPE attachment_type    AS ENUM ('IMAGE', 'PDF', 'VIDEO', 'AUDIO', 'OTHER');
EXCEPTION
  WHEN duplicate_object THEN NULL;  -- Ignore if already exists (idempotent re-runs)
END $$;


-- =============================================================================
-- TABLE 1: users
-- Who can log in and what they can do.
-- Roles: ADMIN (full access), OFFICER (field data entry), ANALYST (read-only analysis)
-- =============================================================================

CREATE TABLE IF NOT EXISTS users (
  id                     SERIAL PRIMARY KEY,
  name                   VARCHAR(255)  NOT NULL,
  email                  VARCHAR(255)  NOT NULL UNIQUE,
  password_hash          TEXT          NOT NULL,             -- bcrypt hash, rounds=12 minimum
  role                   VARCHAR(20)   NOT NULL DEFAULT 'OFFICER' CHECK (role IN ('ADMIN','OFFICER','ANALYST')),
  police_station         VARCHAR(100),                      -- Officer's home station
  zone                   VARCHAR(100),                      -- Officer's assigned zone/district
  -- Account lockout
  failed_login_attempts  INTEGER       NOT NULL DEFAULT 0,
  locked_until           TIMESTAMPTZ,                        -- NULL = not locked
  last_failed_login      TIMESTAMPTZ,
  -- Mobile push notifications
  fcm_token              TEXT,                               -- Firebase FCM device token
  fcm_token_updated_at   TIMESTAMPTZ,
  -- Metadata
  is_active              BOOLEAN       NOT NULL DEFAULT TRUE,
  last_login_at          TIMESTAMPTZ,
  created_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at             TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  users                        IS 'System users — police officers, analysts, administrators';
COMMENT ON COLUMN users.password_hash          IS 'bcrypt hash with cost factor 12 minimum. Never store plaintext.';
COMMENT ON COLUMN users.failed_login_attempts  IS 'Resets to 0 on successful login. Increments on failure.';
COMMENT ON COLUMN users.locked_until           IS 'If set and in future, login is blocked. NULL = account not locked.';
COMMENT ON COLUMN users.is_active              IS 'Set FALSE to disable login without deleting the record.';

CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_role       ON users(role);
CREATE INDEX IF NOT EXISTS idx_users_is_active  ON users(is_active);


-- =============================================================================
-- TABLE 2: refresh_tokens
-- Stores hashed refresh tokens for the JWT refresh flow.
-- Access tokens: 15 min lifetime (in-memory).
-- Refresh tokens: 7 day lifetime (stored here as SHA-256 hash).
-- =============================================================================

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id          UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     INTEGER     NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash  TEXT        NOT NULL UNIQUE,    -- SHA-256(raw_token). Raw token given to client only once.
  expires_at  TIMESTAMPTZ NOT NULL,
  revoked     BOOLEAN     NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ip_address  VARCHAR(64),                   -- IP that created this token (for audit)
  user_agent  TEXT                           -- Browser/device for display in "active sessions"
);

COMMENT ON TABLE  refresh_tokens             IS 'Long-lived refresh tokens for JWT silent renewal. Never store raw token.';
COMMENT ON COLUMN refresh_tokens.token_hash  IS 'SHA-256 of the random 64-byte token sent to the client.';
COMMENT ON COLUMN refresh_tokens.revoked     IS 'TRUE = token explicitly invalidated (logout, security event).';

CREATE INDEX IF NOT EXISTS idx_refresh_tokens_user_id    ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_token_hash ON refresh_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_refresh_tokens_expires_at ON refresh_tokens(expires_at);


-- =============================================================================
-- TABLE 3: crime_classifications
-- Master lookup for Indian Penal Code / special acts.
-- Each row = one section of one act (e.g., IPC § 302 = Murder).
-- Used to auto-populate FIR fields on section selection.
-- =============================================================================

CREATE TABLE IF NOT EXISTS crime_classifications (
  id                   SERIAL        PRIMARY KEY,
  act_type             VARCHAR(50)   NOT NULL,   -- e.g. 'IPC', 'POCSO', 'SC_ST', 'NDPS', 'IT_ACT'
  section_code         VARCHAR(50)   NOT NULL,   -- e.g. '302', '376', '420'
  title                VARCHAR(255),              -- Short title: 'Murder', 'Rape', 'Cheating'
  description          TEXT,                      -- Full legal description of the offence
  category             VARCHAR(100)  NOT NULL,   -- Grouping: 'Violent', 'Property', 'Cyber', etc.
  severity             INTEGER       NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  is_women_safety      BOOLEAN       NOT NULL DEFAULT FALSE,  -- Used to weight women-safety KDE layer
  is_accident_related  BOOLEAN       NOT NULL DEFAULT FALSE,  -- Used to populate IRAD overlap analysis
  is_cognizable        BOOLEAN       NOT NULL DEFAULT TRUE,   -- Whether FIR can be filed without magistrate order
  bailable             BOOLEAN,                               -- NULL = depends on court discretion
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  UNIQUE (act_type, section_code)
);

COMMENT ON TABLE  crime_classifications                IS 'IPC / special act section master. One row per chargeable section.';
COMMENT ON COLUMN crime_classifications.severity       IS '1=Minor, 2=Low, 3=Moderate, 4=Serious, 5=Heinous';
COMMENT ON COLUMN crime_classifications.is_women_safety IS 'TRUE = used to weight the women-safety KDE heatmap layer';

CREATE INDEX IF NOT EXISTS idx_cc_act_type  ON crime_classifications(act_type);
CREATE INDEX IF NOT EXISTS idx_cc_category  ON crime_classifications(category);
CREATE INDEX IF NOT EXISTS idx_cc_severity  ON crime_classifications(severity);


-- =============================================================================
-- TABLE 4: zones
-- Administrative and policing boundary polygons.
-- type=DISTRICT → Bihar district boundaries (38 districts)
-- type=STATION  → Individual police station jurisdictions
-- Boundaries stored as GEOMETRY (not GEOGRAPHY) for containment/intersection queries.
-- =============================================================================

CREATE TABLE IF NOT EXISTS zones (
  id           SERIAL          PRIMARY KEY,
  name         VARCHAR(255)    NOT NULL,
  type         VARCHAR(20)     NOT NULL DEFAULT 'DISTRICT' CHECK (type IN ('DISTRICT','STATION')),
  -- Production (PostGIS): GEOMETRY(MultiPolygon, 4326)
  -- Local dev (PG18): JSONB GeoJSON object
  boundary     JSONB,
  parent_id    INTEGER         REFERENCES zones(id) ON DELETE SET NULL,
  district     VARCHAR(100),
  area_km2     NUMERIC(10,4),
  created_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  updated_at   TIMESTAMPTZ     NOT NULL DEFAULT NOW(),
  UNIQUE (name, type)
);

COMMENT ON TABLE  zones           IS 'Bihar district and police station boundary polygons. Source: OpenStreetMap / state GIS.';
COMMENT ON COLUMN zones.boundary  IS 'GEOMETRY (not GEOGRAPHY) for spatial containment queries (ST_Within, ST_Intersects).';
COMMENT ON COLUMN zones.parent_id IS 'Police station zones reference their parent district zone.';
COMMENT ON COLUMN zones.area_km2  IS 'Pre-computed for PAI (Predictive Accuracy Index) calculations.';

CREATE INDEX IF NOT EXISTS idx_zones_boundary_gix ON zones USING GIST(boundary);  -- Required for spatial queries
CREATE INDEX IF NOT EXISTS idx_zones_type         ON zones(type);
CREATE INDEX IF NOT EXISTS idx_zones_district     ON zones(district);


-- =============================================================================
-- TABLE 5: firs
-- Central fact table — one row per First Information Report.
-- location is GEOGRAPHY(Point) for accurate haversine distance calculations.
-- Full-text search via tsvector search_vector column (auto-updated by trigger).
-- =============================================================================

CREATE TABLE IF NOT EXISTS firs (
  id                   SERIAL        PRIMARY KEY,
  fir_no               VARCHAR(50)   NOT NULL UNIQUE,          -- e.g. '123/2025' or 'PS-PAT-2025-0042'
  -- Classification
  crime_type           VARCHAR(100)  NOT NULL,                  -- Human-readable: 'Theft', 'Murder'
  act_type             VARCHAR(50),                             -- 'IPC', 'POCSO', etc.
  section              VARCHAR(100),                            -- Raw section string from FIR form
  section_code         VARCHAR(50),                             -- Normalized code for FK lookup
  classification_id    INTEGER       REFERENCES crime_classifications(id) ON DELETE SET NULL,
  category             VARCHAR(100),                            -- Denormalized from classification
  severity             INTEGER       NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 5),
  -- Time
  occurred_at          TIMESTAMPTZ   NOT NULL,                  -- When crime occurred (not FIR registration time)
  -- Location
  -- Production (PostGIS): GEOGRAPHY(Point, 4326)
  -- Local dev (PG18, no PostGIS): JSONB { "lat": 25.61, "lon": 85.14 }
  location             JSONB,
  location_name        VARCHAR(255),                            -- Human-readable address/landmark
  police_station       VARCHAR(100),                            -- Police station jurisdiction
  zone                 VARCHAR(100),                            -- District name (denormalized for GROUP BY)
  zone_id              INTEGER       REFERENCES zones(id) ON DELETE SET NULL,
  -- Victim info
  victim_gender        VARCHAR(20)   CHECK (victim_gender IN ('MALE', 'FEMALE', 'TRANSGENDER', 'UNKNOWN')),
  victim_age           INTEGER       CHECK (victim_age BETWEEN 0 AND 120),
  victim_count         INTEGER       NOT NULL DEFAULT 1,
  -- Encrypted sensitive data
  sensitive_notes_enc  BYTEA,                                   -- pgp_sym_encrypt(notes, DB_ENCRYPTION_KEY)
  -- FIR lifecycle
  status               VARCHAR(30)   NOT NULL DEFAULT 'PENDING'
                       CHECK (status IN ('PENDING','UNDER_INVESTIGATION','CHARGESHEETED','CLOSED','REFERRED')),
  description          TEXT,                                    -- Free-text FIR narrative
  -- Metadata
  registered_by        INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  source               VARCHAR(50)   NOT NULL DEFAULT 'MANUAL',
  created_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at           TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  firs                      IS 'First Information Report — primary crime incident record. One row per FIR.';
COMMENT ON COLUMN firs.occurred_at          IS 'Timestamp of the crime event, not the FIR registration time.';
COMMENT ON COLUMN firs.location             IS 'GEOGRAPHY type for accurate ST_DWithin distance queries (haversine).';
COMMENT ON COLUMN firs.sensitive_notes_enc  IS 'PGP symmetric encryption via pgcrypto. Key in DB_ENCRYPTION_KEY env var.';
COMMENT ON COLUMN firs.search_vector        IS 'Auto-updated tsvector for full-text search across description + location_name + crime_type.';
COMMENT ON COLUMN firs.source               IS 'How the FIR entered the system: manual entry, bulk CSV, CCTNS import, or API.';

-- Spatial index (required for ST_DWithin hotspot queries)
CREATE INDEX IF NOT EXISTS idx_firs_location_gix       ON firs USING GIST(location);
-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_firs_search_vector_gin  ON firs USING GIN(search_vector);
-- Composite index for most common dashboard query: filter by zone + date range + crime type
CREATE INDEX IF NOT EXISTS idx_firs_zone_date_type     ON firs(zone, occurred_at DESC, crime_type);
-- Individual column indexes for flexible filtering
CREATE INDEX IF NOT EXISTS idx_firs_occurred_at        ON firs(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_firs_police_station     ON firs(police_station);
CREATE INDEX IF NOT EXISTS idx_firs_status             ON firs(status);
CREATE INDEX IF NOT EXISTS idx_firs_act_type_zone      ON firs(act_type, zone);
CREATE INDEX IF NOT EXISTS idx_firs_severity           ON firs(severity);
CREATE INDEX IF NOT EXISTS idx_firs_classification_id  ON firs(classification_id);
CREATE INDEX IF NOT EXISTS idx_firs_registered_by      ON firs(registered_by);


-- =============================================================================
-- TRIGGER: auto-update firs.search_vector on insert / update
-- Combines: description + location_name + crime_type + act_type
-- =============================================================================

CREATE OR REPLACE FUNCTION firs_search_vector_update() RETURNS TRIGGER AS $$
BEGIN
  NEW.search_vector :=
    setweight(to_tsvector('english', coalesce(NEW.crime_type, '')),   'A') ||  -- Highest weight
    setweight(to_tsvector('english', coalesce(NEW.category, '')),     'B') ||
    setweight(to_tsvector('english', coalesce(NEW.location_name, '')), 'B') ||
    setweight(to_tsvector('english', coalesce(NEW.description, '')),  'C') ||  -- Lowest weight
    setweight(to_tsvector('english', coalesce(NEW.fir_no, '')),       'A');
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS firs_search_vector_trigger ON firs;
CREATE TRIGGER firs_search_vector_trigger
  BEFORE INSERT OR UPDATE ON firs
  FOR EACH ROW EXECUTE FUNCTION firs_search_vector_update();


-- =============================================================================
-- TABLE 6: fir_attachments
-- Photos, PDFs, audio recordings attached to FIR records.
-- Files are stored in object storage (MinIO / S3). This table holds metadata only.
-- =============================================================================

CREATE TABLE IF NOT EXISTS fir_attachments (
  id             UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  fir_id         INTEGER       NOT NULL REFERENCES firs(id) ON DELETE CASCADE,
  filename       TEXT          NOT NULL,   -- UUID-based storage key filename
  original_name  TEXT          NOT NULL,   -- Original filename from upload
  mime_type      TEXT          NOT NULL,   -- e.g. 'image/jpeg', 'application/pdf'
  size_bytes     INTEGER       NOT NULL,
  storage_key    TEXT          NOT NULL UNIQUE,  -- Full object storage path: 'fir-attachments/{fir_id}/{uuid}.jpg'
  attachment_type attachment_type NOT NULL DEFAULT 'OTHER',
  uploaded_by    INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  uploaded_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  fir_attachments              IS 'Metadata for files attached to FIRs. Actual files in MinIO/S3.';
COMMENT ON COLUMN fir_attachments.storage_key  IS 'Object storage key. Use presigned URL API for download, never serve directly.';

CREATE INDEX IF NOT EXISTS idx_fir_attachments_fir_id ON fir_attachments(fir_id);


-- =============================================================================
-- TABLE 7: audit_logs
-- Immutable log of all create / update / delete actions.
-- Append-only — never update or delete rows here.
-- =============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
  id          SERIAL        PRIMARY KEY,
  user_id     INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  action      VARCHAR(100)  NOT NULL,    -- 'FIR_CREATE', 'FIR_UPDATE', 'USER_LOGIN', 'BULK_IMPORT', etc.
  entity      VARCHAR(100)  NOT NULL,    -- Table name: 'firs', 'users', 'patrol_routes'
  entity_id   VARCHAR(100),              -- PK of the affected row
  metadata    JSONB         NOT NULL DEFAULT '{}'::jsonb,  -- Diff, import stats, extra context
  ip_address  VARCHAR(64),
  user_agent  TEXT,
  created_at  TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  audit_logs           IS 'Append-only audit trail. Never UPDATE or DELETE rows here.';
COMMENT ON COLUMN audit_logs.action    IS 'Verb describing what happened: FIR_CREATE, USER_LOGIN, BULK_IMPORT, etc.';
COMMENT ON COLUMN audit_logs.metadata  IS 'JSONB for flexible context: {before: {...}, after: {...}} or {count: 42}';

CREATE INDEX IF NOT EXISTS idx_audit_logs_user_id    ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action      ON audit_logs(action);
CREATE INDEX IF NOT EXISTS idx_audit_logs_entity      ON audit_logs(entity, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at  ON audit_logs(created_at DESC);


-- =============================================================================
-- TABLE 8: irad_accidents
-- Integrated Road Accident Database incidents.
-- Separate from FIRs — IRAD has its own numbering and source system.
-- Used for the IRAD hotspot layer on the map (accidents ≠ crimes).
-- =============================================================================

CREATE TABLE IF NOT EXISTS irad_accidents (
  id                SERIAL        PRIMARY KEY,
  accident_id       VARCHAR(100)  NOT NULL UNIQUE,
  occurred_at       TIMESTAMPTZ   NOT NULL,
  severity          INTEGER       NOT NULL DEFAULT 1 CHECK (severity BETWEEN 1 AND 3),
  -- Production: GEOGRAPHY(Point, 4326) | Local dev: JSONB { "lat": ..., "lon": ... }
  location          JSONB,
  location_name     VARCHAR(255),
  road_name         VARCHAR(255),
  road_type         VARCHAR(50),               -- 'NH', 'SH', 'MDR', 'ODR', 'VR'
  district          VARCHAR(100),
  police_station    VARCHAR(100),
  vehicles_involved INTEGER       DEFAULT 1,
  casualties        INTEGER       NOT NULL DEFAULT 0,
  injuries          INTEGER       NOT NULL DEFAULT 0,
  description       TEXT,
  weather_condition VARCHAR(50),               -- 'CLEAR', 'RAIN', 'FOG', 'DUST'
  light_condition   VARCHAR(50),               -- 'DAYLIGHT', 'DUSK', 'DARK_LIT', 'DARK_UNLIT'
  source            VARCHAR(100)  NOT NULL DEFAULT 'IRAD',
  created_at        TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  irad_accidents          IS 'Road accident records from IRAD system. Separate from FIRs.';
COMMENT ON COLUMN irad_accidents.severity IS '1=Minor injury, 2=Serious injury, 3=Fatal';

CREATE INDEX IF NOT EXISTS idx_irad_location_gix  ON irad_accidents USING GIST(location);
CREATE INDEX IF NOT EXISTS idx_irad_occurred_at   ON irad_accidents(occurred_at DESC);
CREATE INDEX IF NOT EXISTS idx_irad_district      ON irad_accidents(district);
CREATE INDEX IF NOT EXISTS idx_irad_severity      ON irad_accidents(severity);


-- =============================================================================
-- TABLE 9: geo_fences
-- Designated sensitive area polygons that trigger alerts when crimes occur inside.
-- Examples: schools, hospitals, government buildings, religious sites, border areas.
-- =============================================================================

CREATE TABLE IF NOT EXISTS geo_fences (
  id              SERIAL        PRIMARY KEY,
  name            TEXT          NOT NULL,
  type            VARCHAR(30)   NOT NULL DEFAULT 'CUSTOM'
                  CHECK (type IN ('SCHOOL','HOSPITAL','GOVERNMENT','RELIGIOUS','BORDER','CUSTOM')),
  -- GeoJSON Polygon object: { "type": "Polygon", "coordinates": [...] }
  boundary        JSONB         NOT NULL,
  -- Bounding box for fast pre-filter before precise containment check
  bbox            JSONB,        -- { "minLat": ..., "maxLat": ..., "minLon": ..., "maxLon": ... }
  alert_radius_m  INTEGER       NOT NULL DEFAULT 500,
  notify_roles    TEXT[]        NOT NULL DEFAULT ARRAY['ADMIN','OFFICER'],
  description     TEXT,
  active          BOOLEAN       NOT NULL DEFAULT TRUE,
  created_by      INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  geo_fences                IS 'Sensitive area polygons. Crimes within alert_radius trigger SSE alerts.';
COMMENT ON COLUMN geo_fences.boundary       IS 'GEOMETRY Polygon. Officers draw these on the Leaflet map using Leaflet.draw.';
COMMENT ON COLUMN geo_fences.alert_radius_m IS 'Additional buffer beyond polygon boundary for proximity alerts.';
COMMENT ON COLUMN geo_fences.notify_roles   IS 'Which roles receive the real-time SSE alert when triggered.';

CREATE INDEX IF NOT EXISTS idx_geo_fences_boundary_gix ON geo_fences USING GIST(boundary);
CREATE INDEX IF NOT EXISTS idx_geo_fences_active       ON geo_fences(active);


-- =============================================================================
-- TABLE 10: patrol_routes
-- An optimized patrol route generated by OR-Tools VRP solver.
-- One route = one planned shift for one or more patrol units.
-- =============================================================================

CREATE TABLE IF NOT EXISTS patrol_routes (
  id             SERIAL        PRIMARY KEY,
  name           VARCHAR(255)  NOT NULL,
  zone           VARCHAR(100),                  -- Which zone this route covers
  created_by     INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  assigned_unit  INTEGER       REFERENCES patrol_units(id) ON DELETE SET NULL,
  status         patrol_status NOT NULL DEFAULT 'PLANNED',
  risk_score     NUMERIC(6,2)  NOT NULL DEFAULT 0,   -- Aggregate risk of stops on this route
  total_distance_km NUMERIC(8,3),                    -- OR-Tools computed total distance
  scheduled_for  TIMESTAMPTZ,
  estimated_duration_min INTEGER,
  notes          TEXT,
  created_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at     TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  patrol_routes                   IS 'Patrol routes generated by OR-Tools VRP optimization.';
COMMENT ON COLUMN patrol_routes.risk_score        IS 'Aggregate risk score of all stops — used to prioritize which routes to action first.';
COMMENT ON COLUMN patrol_routes.total_distance_km IS 'Pre-computed by OR-Tools. Used to estimate fuel and time.';

CREATE INDEX IF NOT EXISTS idx_patrol_routes_status        ON patrol_routes(status);
CREATE INDEX IF NOT EXISTS idx_patrol_routes_scheduled_for ON patrol_routes(scheduled_for);
CREATE INDEX IF NOT EXISTS idx_patrol_routes_assigned_unit ON patrol_routes(assigned_unit);
CREATE INDEX IF NOT EXISTS idx_patrol_routes_zone          ON patrol_routes(zone);


-- =============================================================================
-- TABLE 11: patrol_route_stops
-- Ordered waypoints within a patrol route.
-- Each stop is a lat/lon point with associated crime statistics.
-- =============================================================================

CREATE TABLE IF NOT EXISTS patrol_route_stops (
  id           SERIAL        PRIMARY KEY,
  route_id     INTEGER       NOT NULL REFERENCES patrol_routes(id) ON DELETE CASCADE,
  sequence     INTEGER       NOT NULL,              -- 1-based ordering within the route
  latitude     NUMERIC(10,6) NOT NULL,
  longitude    NUMERIC(10,6) NOT NULL,
  location     GEOGRAPHY(Point, 4326)               -- Computed from lat/lon for spatial queries
    GENERATED ALWAYS AS (ST_MakePoint(longitude, latitude)::geography) STORED,
  zone_name    VARCHAR(255),
  stop_name    TEXT,                                -- Landmark or address description
  crime_count  INTEGER       NOT NULL DEFAULT 0,    -- Recent crimes near this stop (radius 300m)
  risk_score   NUMERIC(6,2)  NOT NULL DEFAULT 0,    -- Individual stop risk
  dwell_time_min INTEGER     NOT NULL DEFAULT 5,    -- Recommended time to spend at this stop
  created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  patrol_route_stops          IS 'Ordered waypoints for a patrol route. Sequence is 1-based.';
COMMENT ON COLUMN patrol_route_stops.location IS 'Generated column — auto-computed PostGIS point from lat/lon.';

CREATE INDEX IF NOT EXISTS idx_patrol_stops_route_id ON patrol_route_stops(route_id);
CREATE INDEX IF NOT EXISTS idx_patrol_stops_location_gix ON patrol_route_stops USING GIST(location);


-- =============================================================================
-- TABLE 12: patrol_units
-- Police vehicles / foot patrol units. Tracks live location and assignment.
-- =============================================================================

CREATE TABLE IF NOT EXISTS patrol_units (
  id                 SERIAL        PRIMARY KEY,
  unit_code          VARCHAR(50)   NOT NULL UNIQUE,   -- e.g. 'PATROL-PAT-01', 'PCR-001'
  unit_type          VARCHAR(50)   NOT NULL DEFAULT 'VEHICLE',  -- 'VEHICLE', 'MOTORCYCLE', 'FOOT'
  officer_name       VARCHAR(255),
  officer_badge      VARCHAR(50),
  status             unit_status   NOT NULL DEFAULT 'AVAILABLE',
  last_lat           NUMERIC(10,6),
  last_lon           NUMERIC(10,6),
  last_location      GEOGRAPHY(Point, 4326),          -- For spatial proximity queries
  last_seen          TIMESTAMPTZ,
  assigned_route_id  INTEGER       REFERENCES patrol_routes(id) ON DELETE SET NULL,
  station            VARCHAR(100),                    -- Home police station
  created_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW(),
  updated_at         TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  patrol_units              IS 'Police patrol units (vehicles/motorcycles/foot patrols). Tracks live status and location.';
COMMENT ON COLUMN patrol_units.last_location IS 'Updated in real-time via WebSocket. Used to find nearest unit to a crime.';

CREATE INDEX IF NOT EXISTS idx_patrol_units_status          ON patrol_units(status);
CREATE INDEX IF NOT EXISTS idx_patrol_units_last_location   ON patrol_units USING GIST(last_location);
CREATE INDEX IF NOT EXISTS idx_patrol_units_assigned_route  ON patrol_units(assigned_route_id);


-- =============================================================================
-- TABLE 13: patrol_logs
-- Execution records for patrol routes — tracks what actually happened vs. planned.
-- Used for the officer performance dashboard.
-- =============================================================================

CREATE TABLE IF NOT EXISTS patrol_logs (
  id               SERIAL        PRIMARY KEY,
  route_id         INTEGER       NOT NULL REFERENCES patrol_routes(id) ON DELETE CASCADE,
  unit_id          INTEGER       REFERENCES patrol_units(id) ON DELETE SET NULL,
  officer_id       INTEGER       REFERENCES users(id) ON DELETE SET NULL,
  started_at       TIMESTAMPTZ,
  completed_at     TIMESTAMPTZ,
  coverage_pct     NUMERIC(5,2)  CHECK (coverage_pct BETWEEN 0 AND 100),  -- % of stops actually visited
  stops_visited    INTEGER       NOT NULL DEFAULT 0,
  stops_planned    INTEGER       NOT NULL DEFAULT 0,
  distance_km_actual NUMERIC(8,3),
  incidents_encountered INTEGER  NOT NULL DEFAULT 0,  -- FIRs registered during this patrol
  notes            TEXT,
  created_at       TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  patrol_logs               IS 'Execution records for each patrol. Compares planned vs. actual coverage.';
COMMENT ON COLUMN patrol_logs.coverage_pct  IS 'Percentage of planned stops actually visited. Feeds officer performance dashboard.';

CREATE INDEX IF NOT EXISTS idx_patrol_logs_route_id   ON patrol_logs(route_id);
CREATE INDEX IF NOT EXISTS idx_patrol_logs_unit_id    ON patrol_logs(unit_id);
CREATE INDEX IF NOT EXISTS idx_patrol_logs_officer_id ON patrol_logs(officer_id);
CREATE INDEX IF NOT EXISTS idx_patrol_logs_started_at ON patrol_logs(started_at DESC);


-- =============================================================================
-- TRIGGERS: updated_at auto-maintenance
-- Automatically sets updated_at = NOW() on any UPDATE.
-- =============================================================================

CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables with updated_at column:
DO $$ DECLARE
  t TEXT;
BEGIN
  FOREACH t IN ARRAY ARRAY['users', 'zones', 'firs', 'patrol_routes', 'patrol_units', 'geo_fences'] LOOP
    EXECUTE format('
      DROP TRIGGER IF EXISTS trg_%I_updated_at ON %I;
      CREATE TRIGGER trg_%I_updated_at
        BEFORE UPDATE ON %I
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    ', t, t, t, t);
  END LOOP;
END $$;


-- =============================================================================
-- USEFUL VIEWS
-- Pre-joined queries used frequently by the analytics service.
-- =============================================================================

-- View: fir_summary
-- Joins FIRs with classification details. Used for analytics and exports.
-- Production (PostGIS): replace (f.location->>'lat')::float with ST_Y(f.location::geometry)
CREATE OR REPLACE VIEW fir_summary AS
SELECT
  f.id,
  f.fir_no,
  f.crime_type,
  f.category,
  f.act_type,
  f.section_code,
  cc.title                                          AS section_title,
  cc.severity                                       AS classification_severity,
  cc.is_women_safety,
  f.severity                                        AS fir_severity,
  f.occurred_at,
  EXTRACT(YEAR  FROM f.occurred_at)::INT           AS year,
  EXTRACT(MONTH FROM f.occurred_at)::INT           AS month,
  EXTRACT(DOW   FROM f.occurred_at)::INT           AS day_of_week,
  EXTRACT(HOUR  FROM f.occurred_at)::INT           AS hour_of_day,
  f.zone,
  f.police_station,
  f.location_name,
  (f.location->>'lat')::float                      AS latitude,
  (f.location->>'lon')::float                      AS longitude,
  f.victim_gender,
  f.victim_age,
  f.victim_count,
  f.status,
  f.source,
  f.registered_by,
  u.name                                           AS registered_by_name
FROM firs f
LEFT JOIN crime_classifications cc ON f.classification_id = cc.id
LEFT JOIN users u                  ON f.registered_by = u.id;

COMMENT ON VIEW fir_summary IS 'Pre-joined FIR view with classification details. Used by analytics endpoints.';


-- View: zone_crime_stats
-- Aggregated crime counts per zone for the dashboard summary cards.
CREATE OR REPLACE VIEW zone_crime_stats AS
SELECT
  zone,
  COUNT(*)                                                      AS total_firs,
  COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days')  AS firs_last_7_days,
  COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '30 days') AS firs_last_30_days,
  COUNT(*) FILTER (WHERE status = 'PENDING')                    AS pending_firs,
  MAX(severity)                                                 AS max_severity,
  ROUND(AVG(severity), 2)                                       AS avg_severity,
  MODE() WITHIN GROUP (ORDER BY crime_type)                     AS dominant_crime_type,
  MIN(occurred_at)                                              AS first_fir_date,
  MAX(occurred_at)                                              AS latest_fir_date
FROM firs
WHERE zone IS NOT NULL
GROUP BY zone;

COMMENT ON VIEW zone_crime_stats IS 'Aggregated per-zone crime statistics. Refreshed on query — consider MATERIALIZED VIEW for production.';


-- View: hotspot_candidates
-- Recent high-severity crimes in the past 90 days for ML clustering.
-- The hotspot service pulls from this view instead of raw firs table.
-- Production (PostGIS): replace JSONB casts with ST_Y/ST_X(location::geometry)
CREATE OR REPLACE VIEW hotspot_candidates AS
SELECT
  id,
  fir_no,
  zone,
  police_station,
  crime_type,
  category,
  severity,
  occurred_at,
  (location->>'lat')::float AS latitude,
  (location->>'lon')::float AS longitude
FROM firs
WHERE location IS NOT NULL
  AND location->>'lat' IS NOT NULL
  AND occurred_at >= NOW() - INTERVAL '90 days'
  AND status != 'CLOSED';


-- View: dashboard_summary (used by GET /api/v1/dashboard/summary — mobile + web)
CREATE OR REPLACE VIEW dashboard_summary AS
SELECT
  COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '24 hours') AS firs_last_24h,
  COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days')   AS firs_last_7d,
  COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '30 days')  AS firs_last_30d,
  COUNT(*) FILTER (WHERE status = 'PENDING')                          AS pending_firs,
  MODE() WITHIN GROUP (ORDER BY crime_type)                           AS top_crime_type,
  NOW()                                                               AS generated_at
FROM firs;

COMMENT ON VIEW hotspot_candidates IS 'Recent non-closed FIRs with location data. Input dataset for DBSCAN and KDE.';


-- =============================================================================
-- TABLE 14: alerts
-- Crime spike alerts generated by anomaly detection pipeline.
-- Feeds the /api/v1/alerts endpoints (web + mobile).
-- =============================================================================

CREATE TABLE IF NOT EXISTS alerts (
  id              UUID          PRIMARY KEY DEFAULT gen_random_uuid(),
  zone            VARCHAR(100)  NOT NULL,
  crime_type      VARCHAR(100),
  count           INTEGER       NOT NULL,
  z_score         NUMERIC(6,3)  NOT NULL,
  severity        VARCHAR(20)   NOT NULL DEFAULT 'MEDIUM'
                  CHECK (severity IN ('LOW','MEDIUM','HIGH','CRITICAL')),
  message         TEXT          NOT NULL,
  -- Snapshot of anomaly stats: { expected, actual, stdDev, windowDays }
  anomaly_details JSONB,
  -- Array of user IDs who have read this alert
  read_by         INTEGER[]     NOT NULL DEFAULT ARRAY[]::INTEGER[],
  source          VARCHAR(50)   NOT NULL DEFAULT 'ANOMALY_DETECTION',
  created_at      TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  alerts          IS 'Crime spike alerts from anomaly detection. Append-only — never update existing alerts.';
COMMENT ON COLUMN alerts.read_by  IS 'Array of user IDs. Check with = ANY(read_by) in queries.';

CREATE INDEX IF NOT EXISTS idx_alerts_zone       ON alerts(zone);
CREATE INDEX IF NOT EXISTS idx_alerts_severity   ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_alerts_created_at ON alerts(created_at DESC);


-- =============================================================================
-- TABLE 15: user_preferences
-- Per-user dashboard and notification settings.
-- Feeds the /dashboard/settings page and mobile ProfileScreen.
-- =============================================================================

CREATE TABLE IF NOT EXISTS user_preferences (
  user_id               INTEGER       PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  default_zone          VARCHAR(100),                      -- Pre-selected zone on dashboard load
  theme                 VARCHAR(20)   NOT NULL DEFAULT 'dark',
  language              VARCHAR(10)   NOT NULL DEFAULT 'en',
  notification_enabled  BOOLEAN       NOT NULL DEFAULT TRUE,
  email_alerts_enabled  BOOLEAN       NOT NULL DEFAULT FALSE,
  map_default_layer     VARCHAR(20)   NOT NULL DEFAULT 'clusters',  -- 'clusters'|'heatmap'|'both'
  extras                JSONB         NOT NULL DEFAULT '{}'::JSONB, -- For future settings without migration
  updated_at            TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE  user_preferences         IS 'One row per user. Auto-created on first settings access.';
COMMENT ON COLUMN user_preferences.extras  IS 'Flexible JSONB bucket for new settings that do not need their own column.';


-- =============================================================================
-- SEED DATA: Default admin user (change password immediately after first login)
-- Password: Admin@1234  →  bcrypt hash with 12 rounds
-- Generate fresh hash: node -e "const b=require('bcrypt');b.hash('Admin@1234',12).then(console.log)"
-- =============================================================================

INSERT INTO users (name, email, password_hash, role)
VALUES (
  'System Administrator',
  'admin@crimemap.bihar.gov.in',
  '$2b$12$PLACEHOLDER_REPLACE_WITH_REAL_BCRYPT_HASH_DO_NOT_USE_THIS',
  'ADMIN'
)
ON CONFLICT (email) DO NOTHING;


-- =============================================================================
-- SCHEMA VERSION TRACKING
-- Simple table to record which schema version is applied.
-- =============================================================================

CREATE TABLE IF NOT EXISTS schema_versions (
  version      TEXT        NOT NULL PRIMARY KEY,
  description  TEXT,
  applied_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

INSERT INTO schema_versions (version, description)
VALUES ('2026-04-20-v2', 'Full schema: users, firs, zones, classifications, audit, irad, patrol, geo_fences, attachments')
ON CONFLICT (version) DO NOTHING;

INSERT INTO schema_versions (version, description)
VALUES ('2026-05-09-v3', 'Schema alignment: JSONB locations for PG18, missing columns on all tables, new tables (refresh_tokens, fir_attachments, geo_fences, patrol_logs, alerts, user_preferences), 4 views, fcm_token on users')
ON CONFLICT (version) DO NOTHING;


-- =============================================================================
-- END OF SCHEMA
-- =============================================================================
