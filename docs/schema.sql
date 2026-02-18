

CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role VARCHAR(50) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS crime_classifications (
  id SERIAL PRIMARY KEY,
  act_type VARCHAR(50) NOT NULL,
  section_code VARCHAR(50) NOT NULL,
  title VARCHAR(255),
  description TEXT,
  category VARCHAR(100) NOT NULL,
  severity INT NOT NULL DEFAULT 1,
  is_women_safety BOOLEAN NOT NULL DEFAULT FALSE,
  is_accident_related BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (act_type, section_code)
);

CREATE TABLE IF NOT EXISTS firs (
  id SERIAL PRIMARY KEY,
  fir_no VARCHAR(50) NOT NULL UNIQUE,
  crime_type VARCHAR(100) NOT NULL,
  section VARCHAR(100),
  act_type VARCHAR(50),
  section_code VARCHAR(50),
  severity INT DEFAULT 1,
  category VARCHAR(100),
  classification_id INT REFERENCES crime_classifications(id) ON DELETE SET NULL,
  victim_gender VARCHAR(20),
  victim_age INT,
  sensitive_notes_enc BYTEA,
  date_time TIMESTAMPTZ NOT NULL,
  location GEOGRAPHY(Point, 4326),
  police_station VARCHAR(100),
  zone VARCHAR(100),
  status VARCHAR(50) DEFAULT 'PENDING',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS zones (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(50) NOT NULL DEFAULT 'DISTRICT',
  boundary GEOMETRY(MultiPolygon, 4326) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (name, type)
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id SERIAL PRIMARY KEY,
  user_id INT REFERENCES users(id) ON DELETE SET NULL,
  action VARCHAR(100) NOT NULL,
  entity VARCHAR(100) NOT NULL,
  entity_id VARCHAR(100),
  metadata JSONB DEFAULT '{}'::jsonb,
  ip_address VARCHAR(64),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS irad_accidents (
  id SERIAL PRIMARY KEY,
  accident_id VARCHAR(100) NOT NULL UNIQUE,
  date_time TIMESTAMPTZ NOT NULL,
  severity INT NOT NULL DEFAULT 1,
  location GEOGRAPHY(Point, 4326) NOT NULL,
  road_name VARCHAR(255),
  district VARCHAR(100),
  description TEXT,
  source VARCHAR(100) DEFAULT 'IRAD',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patrol_routes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  created_by INT REFERENCES users(id) ON DELETE SET NULL,
  status VARCHAR(50) DEFAULT 'PLANNED',
  risk_score NUMERIC(6,2) DEFAULT 0,
  scheduled_for TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patrol_route_stops (
  id SERIAL PRIMARY KEY,
  route_id INT REFERENCES patrol_routes(id) ON DELETE CASCADE,
  sequence INT NOT NULL,
  latitude NUMERIC(10,6) NOT NULL,
  longitude NUMERIC(10,6) NOT NULL,
  zone_name VARCHAR(255),
  crime_count INT DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS patrol_units (
  id SERIAL PRIMARY KEY,
  unit_code VARCHAR(50) NOT NULL UNIQUE,
  status VARCHAR(50) DEFAULT 'AVAILABLE',
  last_lat NUMERIC(10,6),
  last_lon NUMERIC(10,6),
  last_seen TIMESTAMPTZ,
  assigned_route_id INT REFERENCES patrol_routes(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS firs_location_gix ON firs USING GIST (location);
CREATE INDEX IF NOT EXISTS zones_boundary_gix ON zones USING GIST (boundary);
