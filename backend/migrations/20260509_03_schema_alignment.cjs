/**
 * Migration: Schema Alignment + New Tables
 * Applied: 2026-05-09
 *
 * Brings local DB (crime_hotspot_db) up to match the authoritative schema.sql.
 * Also adds new tables required by stub pages and mobile app:
 *   - alerts         (for /api/v1/alerts endpoints)
 *   - user_preferences (for /dashboard/settings page)
 *   - refresh_tokens, fir_attachments, geo_fences, patrol_logs, schema_versions
 *
 * Note: PostGIS is NOT available on PostgreSQL 18 in this environment.
 *       Location fields remain as JSONB { lat, lon } instead of GEOGRAPHY(Point).
 *       The gist index on firs.location from migration 02 is dropped — GIST on
 *       JSONB is not supported. A functional index on (location->>'lat') is added
 *       for basic lat/lon filtering.
 */

exports.up = (pgm) => {

  // ---------------------------------------------------------------------------
  // EXTENSIONS (safe to add; pgcrypto already present)
  // ---------------------------------------------------------------------------
  pgm.createExtension("uuid-ossp", { ifNotExists: true });
  pgm.createExtension("pg_trgm",   { ifNotExists: true });

  // Drop the broken GIST index on JSONB location from previous migration
  pgm.sql(`DROP INDEX IF EXISTS firs_location_gix;`);
  pgm.sql(`DROP INDEX IF EXISTS irad_location_gix;`);

  // ---------------------------------------------------------------------------
  // TABLE: users — add missing columns (using raw SQL for IF NOT EXISTS safety)
  // ---------------------------------------------------------------------------
  pgm.sql(`
    ALTER TABLE users 
      ADD COLUMN IF NOT EXISTS failed_login_attempts integer NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone,
      ADD COLUMN IF NOT EXISTS last_failed_login timestamp with time zone,
      ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone,
      ADD COLUMN IF NOT EXISTS fcm_token text,
      ADD COLUMN IF NOT EXISTS fcm_token_updated_at timestamp with time zone,
      ADD COLUMN IF NOT EXISTS police_station varchar(100),
      ADD COLUMN IF NOT EXISTS zone varchar(100),
      ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();
  `);

  pgm.createIndex("users", "is_active",      { name: "idx_users_is_active" });
  pgm.createIndex("users", "role",           { name: "idx_users_role" });
  pgm.createIndex("users", "police_station", { name: "idx_users_police_station" });

  // ---------------------------------------------------------------------------
  // TABLE: firs — rename date_time → occurred_at + add missing columns
  // ---------------------------------------------------------------------------
  pgm.renameColumn("firs", "date_time", "occurred_at");

  pgm.sql(`
    ALTER TABLE firs
      ADD COLUMN IF NOT EXISTS location_name varchar(255),
      ADD COLUMN IF NOT EXISTS zone_id integer REFERENCES zones(id) ON DELETE set null,
      ADD COLUMN IF NOT EXISTS victim_count integer NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS source varchar(50) NOT NULL DEFAULT 'MANUAL',
      ADD COLUMN IF NOT EXISTS registered_by integer REFERENCES users(id) ON DELETE set null,
      ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();
  `);

  // Drop old date_time index (now renamed) and recreate
  pgm.sql(`DROP INDEX IF EXISTS firs_date_time_idx;`);
  pgm.createIndex("firs", "occurred_at",                { name: "idx_firs_occurred_at" });
  pgm.createIndex("firs", ["zone", "occurred_at", "crime_type"], { name: "idx_firs_zone_date_type" });
  pgm.createIndex("firs", "police_station",             { name: "idx_firs_police_station" });
  pgm.createIndex("firs", "status",                     { name: "idx_firs_status" });
  pgm.createIndex("firs", "severity",                   { name: "idx_firs_severity" });
  pgm.createIndex("firs", "registered_by",              { name: "idx_firs_registered_by" });
  pgm.createIndex("firs", "zone_id",                    { name: "idx_firs_zone_id" });
  // Functional index for lat/lon filtering on JSONB location
  pgm.sql(`
    CREATE INDEX IF NOT EXISTS idx_firs_location_lat
      ON firs (((location->>'lat')::float));
  `);

  // ---------------------------------------------------------------------------
  // TABLE: zones — add missing columns
  // ---------------------------------------------------------------------------
  pgm.addColumns("zones", {
    parent_id: { type: "integer", references: "zones", onDelete: "set null" },
    district:  { type: "varchar(100)" },
    area_km2:  { type: "numeric(10,4)" },
    updated_at: {
      type: "timestamp with time zone",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
  pgm.createIndex("zones", "type",     { name: "idx_zones_type" });
  pgm.createIndex("zones", "district", { name: "idx_zones_district" });

  // ---------------------------------------------------------------------------
  // TABLE: crime_classifications — add missing columns
  // ---------------------------------------------------------------------------
  pgm.addColumns("crime_classifications", {
    is_cognizable: { type: "boolean", notNull: true, default: true },
    bailable:      { type: "boolean" },
  });

  // ---------------------------------------------------------------------------
  // TABLE: irad_accidents — rename date_time → occurred_at + add missing cols
  // ---------------------------------------------------------------------------
  pgm.renameColumn("irad_accidents", "date_time", "occurred_at");

  pgm.addColumns("irad_accidents", {
    location_name:      { type: "varchar(255)" },
    road_type:          { type: "varchar(50)" },     // 'NH', 'SH', 'MDR', 'ODR', 'VR'
    police_station:     { type: "varchar(100)" },
    vehicles_involved:  { type: "integer", default: 1 },
    casualties:         { type: "integer", notNull: true, default: 0 },
    injuries:           { type: "integer", notNull: true, default: 0 },
    weather_condition:  { type: "varchar(50)" },     // 'CLEAR', 'RAIN', 'FOG', 'DUST'
    light_condition:    { type: "varchar(50)" },     // 'DAYLIGHT', 'DUSK', 'DARK_LIT', 'DARK_UNLIT'
  });

  pgm.sql(`DROP INDEX IF EXISTS irad_accidents_date_idx;`);
  pgm.createIndex("irad_accidents", "occurred_at",   { name: "idx_irad_occurred_at" });
  pgm.createIndex("irad_accidents", "district",      { name: "idx_irad_district" });
  pgm.createIndex("irad_accidents", "severity",      { name: "idx_irad_severity" });
  pgm.createIndex("irad_accidents", "police_station",{ name: "idx_irad_police_station" });

  // ---------------------------------------------------------------------------
  // TABLE: audit_logs — add missing columns
  // ---------------------------------------------------------------------------
  pgm.addColumns("audit_logs", {
    user_agent: { type: "text" },
  });
  pgm.createIndex("audit_logs", "action",     { name: "idx_audit_logs_action" });
  pgm.createIndex("audit_logs", "entity",     { name: "idx_audit_logs_entity" });
  pgm.createIndex("audit_logs", "created_at", { name: "idx_audit_logs_created_at" });
  pgm.createIndex("audit_logs", "user_id",    { name: "idx_audit_logs_user_id" });

  // ---------------------------------------------------------------------------
  // TABLE: patrol_routes — add missing columns
  // ---------------------------------------------------------------------------
  pgm.sql(`
    ALTER TABLE patrol_routes
      ADD COLUMN IF NOT EXISTS zone varchar(100),
      ADD COLUMN IF NOT EXISTS assigned_unit integer REFERENCES patrol_units(id) ON DELETE set null,
      ADD COLUMN IF NOT EXISTS total_distance_km numeric(8,3),
      ADD COLUMN IF NOT EXISTS estimated_duration_min integer,
      ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone NOT NULL DEFAULT now();
  `);
  pgm.createIndex("patrol_routes", "status",        { name: "idx_patrol_routes_status" });
  pgm.createIndex("patrol_routes", "scheduled_for", { name: "idx_patrol_routes_scheduled_for" });
  pgm.createIndex("patrol_routes", "zone",          { name: "idx_patrol_routes_zone" });

  // ---------------------------------------------------------------------------
  // TABLE: patrol_route_stops — add missing columns
  // ---------------------------------------------------------------------------
  pgm.sql(`
    ALTER TABLE patrol_route_stops
      ADD COLUMN IF NOT EXISTS stop_name text,
      ADD COLUMN IF NOT EXISTS risk_score numeric(6,2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS dwell_time_min integer NOT NULL DEFAULT 5;
  `);

  // ---------------------------------------------------------------------------
  // TABLE: patrol_units — add missing columns
  // ---------------------------------------------------------------------------
  pgm.addColumns("patrol_units", {
    unit_type:    { type: "varchar(50)", notNull: true, default: "'VEHICLE'" },
    officer_name: { type: "varchar(255)" },
    officer_badge:{ type: "varchar(50)" },
    station:      { type: "varchar(100)" },
    updated_at: {
      type: "timestamp with time zone",
      notNull: true,
      default: pgm.func("now()"),
    },
  });
  pgm.createIndex("patrol_units", "status",          { name: "idx_patrol_units_status" });
  pgm.createIndex("patrol_units", "assigned_route_id",{ name: "idx_patrol_units_assigned_route" });

  // ---------------------------------------------------------------------------
  // NEW TABLE: refresh_tokens
  // ---------------------------------------------------------------------------
  pgm.createTable("refresh_tokens", {
    id:         { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    user_id:    { type: "integer", notNull: true, references: "users", onDelete: "cascade" },
    token_hash: { type: "text", notNull: true, unique: true },
    expires_at: { type: "timestamp with time zone", notNull: true },
    revoked:    { type: "boolean", notNull: true, default: false },
    ip_address: { type: "varchar(64)" },
    user_agent: { type: "text" },
    created_at: { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("refresh_tokens", "user_id",    { name: "idx_refresh_tokens_user_id" });
  pgm.createIndex("refresh_tokens", "token_hash", { name: "idx_refresh_tokens_token_hash" });
  pgm.createIndex("refresh_tokens", "expires_at", { name: "idx_refresh_tokens_expires_at" });

  // ---------------------------------------------------------------------------
  // NEW TABLE: fir_attachments
  // ---------------------------------------------------------------------------
  pgm.createTable("fir_attachments", {
    id:              { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    fir_id:          { type: "integer", notNull: true, references: "firs", onDelete: "cascade" },
    filename:        { type: "text", notNull: true },
    original_name:   { type: "text", notNull: true },
    mime_type:       { type: "text", notNull: true },
    size_bytes:      { type: "integer", notNull: true },
    storage_key:     { type: "text", notNull: true, unique: true },
    attachment_type: { type: "varchar(20)", notNull: true, default: "'OTHER'" },
    uploaded_by:     { type: "integer", references: "users", onDelete: "set null" },
    uploaded_at:     { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("fir_attachments", "fir_id", { name: "idx_fir_attachments_fir_id" });

  // ---------------------------------------------------------------------------
  // NEW TABLE: geo_fences
  // ---------------------------------------------------------------------------
  pgm.createTable("geo_fences", {
    id:             { type: "serial", primaryKey: true },
    name:           { type: "text", notNull: true },
    type:           { type: "varchar(50)", notNull: true, default: "'CUSTOM'" },
    boundary:       { type: "jsonb", notNull: true },
    bbox:           { type: "jsonb" },
    alert_radius_m: { type: "integer", notNull: true, default: 500 },
    notify_roles:   { type: "text[]", notNull: true, default: pgm.func("ARRAY['ADMIN','OFFICER']") },
    description:    { type: "text" },
    active:         { type: "boolean", notNull: true, default: true },
    created_by:     { type: "integer", references: "users", onDelete: "set null" },
    created_at:     { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
    updated_at:     { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
  }, { ifNotExists: true });
  pgm.createIndex("geo_fences", "active", { name: "idx_geo_fences_active" });
  pgm.createIndex("geo_fences", "type",   { name: "idx_geo_fences_type" });

  // ---------------------------------------------------------------------------
  // NEW TABLE: patrol_logs
  // ---------------------------------------------------------------------------
  pgm.createTable("patrol_logs", {
    id:                   { type: "serial", primaryKey: true },
    route_id:             { type: "integer", notNull: true, references: "patrol_routes", onDelete: "cascade" },
    unit_id:              { type: "integer", references: "patrol_units", onDelete: "set null" },
    officer_id:           { type: "integer", references: "users", onDelete: "set null" },
    started_at:           { type: "timestamp with time zone" },
    completed_at:         { type: "timestamp with time zone" },
    coverage_pct:         { type: "numeric(5,2)" },
    stops_visited:        { type: "integer", notNull: true, default: 0 },
    stops_planned:        { type: "integer", notNull: true, default: 0 },
    distance_km_actual:   { type: "numeric(8,3)" },
    incidents_encountered:{ type: "integer", notNull: true, default: 0 },
    notes:                { type: "text" },
    created_at:           { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
  }, { ifNotExists: true });
  pgm.createIndex("patrol_logs", "route_id",   { name: "idx_patrol_logs_route_id" });
  pgm.createIndex("patrol_logs", "unit_id",    { name: "idx_patrol_logs_unit_id" });
  pgm.createIndex("patrol_logs", "officer_id", { name: "idx_patrol_logs_officer_id" });
  pgm.createIndex("patrol_logs", "started_at", { name: "idx_patrol_logs_started_at" });

  // ---------------------------------------------------------------------------
  // NEW TABLE: alerts  (crime spike alerts — feeds /api/v1/alerts)
  // ---------------------------------------------------------------------------
  pgm.createTable("alerts", {
    id:          { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    zone:        { type: "varchar(100)", notNull: true },
    crime_type:  { type: "varchar(100)" },
    count:       { type: "integer", notNull: true },
    z_score:     { type: "numeric(6,3)", notNull: true },
    // severity: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL'
    severity:    { type: "varchar(20)", notNull: true, default: "'MEDIUM'" },
    message:     { type: "text", notNull: true },
    // JSONB snapshot: { expected, actual, stdDev, windowDays }
    anomaly_details: { type: "jsonb" },
    // Which users have read this alert (array of user IDs for targeted reads)
    read_by:     { type: "integer[]", notNull: true, default: pgm.func("ARRAY[]::integer[]") },
    // Source: 'ANOMALY_DETECTION' | 'MANUAL' | 'GEO_FENCE'
    source:      { type: "varchar(50)", notNull: true, default: "'ANOMALY_DETECTION'" },
    created_at:  { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
  });
  pgm.createIndex("alerts", "zone",       { name: "idx_alerts_zone" });
  pgm.createIndex("alerts", "severity",   { name: "idx_alerts_severity" });
  pgm.createIndex("alerts", "created_at", { name: "idx_alerts_created_at" });

  // ---------------------------------------------------------------------------
  // NEW TABLE: user_preferences  (per-user settings — feeds /dashboard/settings)
  // ---------------------------------------------------------------------------
  pgm.createTable("user_preferences", {
    user_id:               { type: "integer", primaryKey: true, references: "users", onDelete: "cascade" },
    default_zone:          { type: "varchar(100)" },
    theme:                 { type: "varchar(20)", notNull: true, default: "'dark'" },
    language:              { type: "varchar(10)", notNull: true, default: "'en'" },
    notification_enabled:  { type: "boolean", notNull: true, default: true },
    email_alerts_enabled:  { type: "boolean", notNull: true, default: false },
    map_default_layer:     { type: "varchar(20)", notNull: true, default: "'clusters'" },
    // Flexible column for future settings without schema changes
    extras:                { type: "jsonb", notNull: true, default: pgm.func("'{}'::jsonb") },
    updated_at:            { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
  });

  // ---------------------------------------------------------------------------
  // NEW TABLE: schema_versions (track applied schema changes)
  // ---------------------------------------------------------------------------
  pgm.createTable("schema_versions", {
    version:    { type: "text", primaryKey: true },
    description:{ type: "text" },
    applied_at: { type: "timestamp with time zone", notNull: true, default: pgm.func("now()") },
  });
  pgm.sql(`
    INSERT INTO schema_versions (version, description)
    VALUES ('2026-05-09-v3', 'Schema alignment: missing columns, new tables (refresh_tokens, fir_attachments, geo_fences, patrol_logs, alerts, user_preferences), 3 views, indexes')
    ON CONFLICT (version) DO NOTHING;
  `);

  // ---------------------------------------------------------------------------
  // TRIGGERS: updated_at auto-maintenance
  // ---------------------------------------------------------------------------
  pgm.sql(`
    CREATE OR REPLACE FUNCTION set_updated_at() RETURNS TRIGGER AS $$
    BEGIN
      NEW.updated_at := NOW();
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;
  `);

  const tablesWithUpdatedAt = [
    "users", "zones", "firs", "patrol_routes", "patrol_units",
    "geo_fences", "user_preferences"
  ];
  tablesWithUpdatedAt.forEach((t) => {
    pgm.sql(`
      DROP TRIGGER IF EXISTS trg_${t}_updated_at ON ${t};
      CREATE TRIGGER trg_${t}_updated_at
        BEFORE UPDATE ON ${t}
        FOR EACH ROW EXECUTE FUNCTION set_updated_at();
    `);
  });

  // ---------------------------------------------------------------------------
  // VIEWS
  // ---------------------------------------------------------------------------

  // View: fir_summary
  pgm.sql(`
    CREATE OR REPLACE VIEW fir_summary AS
    SELECT
      f.id,
      f.fir_no,
      f.crime_type,
      f.category,
      f.act_type,
      f.section_code,
      cc.title                                            AS section_title,
      cc.severity                                         AS classification_severity,
      cc.is_women_safety,
      f.severity                                          AS fir_severity,
      f.occurred_at,
      EXTRACT(YEAR  FROM f.occurred_at)::INT             AS year,
      EXTRACT(MONTH FROM f.occurred_at)::INT             AS month,
      EXTRACT(DOW   FROM f.occurred_at)::INT             AS day_of_week,
      EXTRACT(HOUR  FROM f.occurred_at)::INT             AS hour_of_day,
      f.zone,
      f.police_station,
      f.location_name,
      (f.location->>'lat')::float                        AS latitude,
      (f.location->>'lon')::float                        AS longitude,
      f.victim_gender,
      f.victim_age,
      f.victim_count,
      f.status,
      f.source,
      f.registered_by,
      u.name                                             AS registered_by_name
    FROM firs f
    LEFT JOIN crime_classifications cc ON f.classification_id = cc.id
    LEFT JOIN users u                  ON f.registered_by = u.id;
  `);

  // View: zone_crime_stats
  pgm.sql(`
    CREATE OR REPLACE VIEW zone_crime_stats AS
    SELECT
      zone,
      COUNT(*)                                                          AS total_firs,
      COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days') AS firs_last_7_days,
      COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '30 days')AS firs_last_30_days,
      COUNT(*) FILTER (WHERE status = 'PENDING')                        AS pending_firs,
      MAX(severity)                                                     AS max_severity,
      ROUND(AVG(severity), 2)                                           AS avg_severity,
      MODE() WITHIN GROUP (ORDER BY crime_type)                         AS dominant_crime_type,
      MIN(occurred_at)                                                   AS first_fir_date,
      MAX(occurred_at)                                                   AS latest_fir_date
    FROM firs
    WHERE zone IS NOT NULL
    GROUP BY zone;
  `);

  // View: hotspot_candidates (past 90 days, non-closed, has location)
  pgm.sql(`
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
  `);

  // View: dashboard_summary (used by GET /api/v1/dashboard/summary)
  pgm.sql(`
    CREATE OR REPLACE VIEW dashboard_summary AS
    SELECT
      COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '24 hours') AS firs_last_24h,
      COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '7 days')   AS firs_last_7d,
      COUNT(*) FILTER (WHERE occurred_at >= NOW() - INTERVAL '30 days')  AS firs_last_30d,
      COUNT(*) FILTER (WHERE status = 'PENDING')                          AS pending_firs,
      MODE() WITHIN GROUP (ORDER BY crime_type)                           AS top_crime_type,
      NOW()                                                               AS generated_at
    FROM firs;
  `);
};

exports.down = (pgm) => {
  pgm.sql(`DROP VIEW IF EXISTS dashboard_summary;`);
  pgm.sql(`DROP VIEW IF EXISTS hotspot_candidates;`);
  pgm.sql(`DROP VIEW IF EXISTS zone_crime_stats;`);
  pgm.sql(`DROP VIEW IF EXISTS fir_summary;`);

  pgm.dropTable("schema_versions",  { ifExists: true });
  pgm.dropTable("user_preferences", { ifExists: true });
  pgm.dropTable("alerts",           { ifExists: true });
  pgm.dropTable("patrol_logs",      { ifExists: true });
  pgm.dropTable("geo_fences",       { ifExists: true });
  pgm.dropTable("fir_attachments",  { ifExists: true });
  pgm.dropTable("refresh_tokens",   { ifExists: true });
};
