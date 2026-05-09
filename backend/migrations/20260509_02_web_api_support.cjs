exports.up = (pgm) => {
  pgm.sql(`
    ALTER TABLE users
      ADD COLUMN IF NOT EXISTS is_active boolean NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS failed_login_attempts int NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS locked_until timestamp with time zone,
      ADD COLUMN IF NOT EXISTS last_failed_login timestamp with time zone,
      ADD COLUMN IF NOT EXISTS last_login_at timestamp with time zone;

    ALTER TABLE firs
      ADD COLUMN IF NOT EXISTS victim_count int NOT NULL DEFAULT 1,
      ADD COLUMN IF NOT EXISTS location_name varchar(255),
      ADD COLUMN IF NOT EXISTS description text,
      ADD COLUMN IF NOT EXISTS source varchar(50) NOT NULL DEFAULT 'MANUAL';

    CREATE INDEX IF NOT EXISTS firs_zone_date_type_idx
      ON firs(zone, date_time DESC, crime_type);
    CREATE INDEX IF NOT EXISTS firs_police_station_idx
      ON firs(police_station);
    CREATE INDEX IF NOT EXISTS firs_status_idx
      ON firs(status);
    CREATE INDEX IF NOT EXISTS firs_act_type_zone_idx
      ON firs(act_type, zone);
  `);

  pgm.createTable("geo_fences", {
    id: "id",
    name: { type: "text", notNull: true },
    type: { type: "text", notNull: true },
    boundary: { type: "geometry(Polygon, 4326)", notNull: true },
    alert_radius_m: { type: "int", notNull: true, default: 500 },
    notify_roles: { type: "text[]", notNull: true, default: pgm.func("ARRAY['ADMIN','OFFICER']") },
    active: { type: "boolean", notNull: true, default: true },
    created_by: { type: "int", references: "users", onDelete: "set null" },
    created_at: { type: "timestamp with time zone", notNull: true, default: pgm.func("current_timestamp") },
  }, { ifNotExists: true });

  pgm.addConstraint(
    "geo_fences",
    "geo_fences_type_check",
    "CHECK (type IN ('SCHOOL', 'HOSPITAL', 'GOVERNMENT', 'RELIGIOUS', 'BORDER', 'CUSTOM'))"
  );
  pgm.createIndex("geo_fences", "boundary", {
    method: "gist",
    name: "geo_fences_boundary_gix",
    ifNotExists: true,
  });
  pgm.createIndex("geo_fences", "active", { name: "geo_fences_active_idx", ifNotExists: true });

  pgm.sql(`
    ALTER TABLE patrol_routes
      ADD COLUMN IF NOT EXISTS zone varchar(100),
      ADD COLUMN IF NOT EXISTS assigned_unit int REFERENCES patrol_units(id) ON DELETE SET NULL,
      ADD COLUMN IF NOT EXISTS total_distance_km numeric(8,3),
      ADD COLUMN IF NOT EXISTS estimated_duration_min int;

    ALTER TABLE patrol_route_stops
      ADD COLUMN IF NOT EXISTS stop_name text,
      ADD COLUMN IF NOT EXISTS risk_score numeric(6,2),
      ADD COLUMN IF NOT EXISTS dwell_time_min int;
  `);

  pgm.createTable("patrol_logs", {
    id: "id",
    route_id: { type: "int", references: "patrol_routes", onDelete: "cascade" },
    unit_id: { type: "int", references: "patrol_units", onDelete: "set null" },
    officer_id: { type: "int", references: "users", onDelete: "set null" },
    started_at: { type: "timestamp with time zone" },
    completed_at: { type: "timestamp with time zone" },
    coverage_pct: { type: "numeric(5,2)" },
    stops_visited: { type: "int" },
    stops_planned: { type: "int" },
    distance_km_actual: { type: "numeric(8,3)" },
    incidents_encountered: { type: "int", notNull: true, default: 0 },
    created_at: { type: "timestamp with time zone", notNull: true, default: pgm.func("current_timestamp") },
  }, { ifNotExists: true });
};

exports.down = (pgm) => {
  pgm.dropTable("patrol_logs", { ifExists: true });
  pgm.dropColumns("patrol_route_stops", ["stop_name", "risk_score", "dwell_time_min"], { ifExists: true });
  pgm.dropColumns("patrol_routes", ["zone", "assigned_unit", "total_distance_km", "estimated_duration_min"], { ifExists: true });
  pgm.dropTable("geo_fences", { ifExists: true });
  pgm.dropColumns("firs", ["victim_count", "location_name", "description", "source"], { ifExists: true });
  pgm.dropColumns("users", [
    "is_active",
    "failed_login_attempts",
    "locked_until",
    "last_failed_login",
    "last_login_at",
  ], { ifExists: true });
};
