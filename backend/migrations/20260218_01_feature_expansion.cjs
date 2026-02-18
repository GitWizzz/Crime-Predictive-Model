exports.up = (pgm) => {
  pgm.createExtension("pgcrypto", { ifNotExists: true });

  pgm.createTable("crime_classifications", {
    id: "id",
    act_type: { type: "varchar(50)", notNull: true },
    section_code: { type: "varchar(50)", notNull: true },
    title: { type: "varchar(255)" },
    description: { type: "text" },
    category: { type: "varchar(100)", notNull: true },
    severity: { type: "int", notNull: true, default: 1 },
    is_women_safety: { type: "boolean", notNull: true, default: false },
    is_accident_related: { type: "boolean", notNull: true, default: false },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createIndex("crime_classifications", ["act_type", "section_code"], {
    unique: true,
    name: "crime_classifications_act_section_uniq",
  });
  pgm.createIndex("crime_classifications", "category", {
    name: "crime_classifications_category_idx",
  });

  pgm.addColumns("firs", {
    act_type: { type: "varchar(50)" },
    section_code: { type: "varchar(50)" },
    severity: { type: "int", default: 1 },
    category: { type: "varchar(100)" },
    classification_id: { type: "int", references: "crime_classifications", onDelete: "set null" },
    victim_gender: { type: "varchar(20)" },
    victim_age: { type: "int" },
    sensitive_notes_enc: { type: "bytea" },
  });

  pgm.createIndex("firs", "act_type", { name: "firs_act_type_idx" });
  pgm.createIndex("firs", "section_code", { name: "firs_section_code_idx" });
  pgm.createIndex("firs", "category", { name: "firs_category_idx" });
  pgm.createIndex("firs", "date_time", { name: "firs_date_time_idx" });
  pgm.createIndex("firs", "location", {
    method: "gist",
    name: "firs_location_gix",
  });

  pgm.createTable("audit_logs", {
    id: "id",
    user_id: { type: "int", references: "users", onDelete: "set null" },
    action: { type: "varchar(100)", notNull: true },
    entity: { type: "varchar(100)", notNull: true },
    entity_id: { type: "varchar(100)" },
    metadata: { type: "jsonb", default: pgm.func("'{}'::jsonb") },
    ip_address: { type: "varchar(64)" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createTable("irad_accidents", {
    id: "id",
    accident_id: { type: "varchar(100)", notNull: true },
    date_time: { type: "timestamp with time zone", notNull: true },
    severity: { type: "int", notNull: true, default: 1 },
    location: { type: "geography(Point, 4326)", notNull: true },
    road_name: { type: "varchar(255)" },
    district: { type: "varchar(100)" },
    description: { type: "text" },
    source: { type: "varchar(100)", default: "'IRAD'" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createIndex("irad_accidents", "accident_id", {
    unique: true,
    name: "irad_accidents_accident_id_uniq",
  });

  pgm.createIndex("irad_accidents", "date_time", { name: "irad_accidents_date_idx" });
  pgm.createIndex("irad_accidents", "location", {
    method: "gist",
    name: "irad_accidents_location_gix",
  });

  pgm.createTable("patrol_routes", {
    id: "id",
    name: { type: "varchar(255)", notNull: true },
    created_by: { type: "int", references: "users", onDelete: "set null" },
    status: { type: "varchar(50)", default: "'PLANNED'" },
    risk_score: { type: "numeric(6,2)", default: 0 },
    scheduled_for: { type: "timestamp with time zone" },
    notes: { type: "text" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createTable("patrol_route_stops", {
    id: "id",
    route_id: { type: "int", references: "patrol_routes", onDelete: "cascade" },
    sequence: { type: "int", notNull: true },
    latitude: { type: "numeric(10,6)", notNull: true },
    longitude: { type: "numeric(10,6)", notNull: true },
    zone_name: { type: "varchar(255)" },
    crime_count: { type: "int", default: 0 },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createTable("patrol_units", {
    id: "id",
    unit_code: { type: "varchar(50)", notNull: true, unique: true },
    status: { type: "varchar(50)", default: "'AVAILABLE'" },
    last_lat: { type: "numeric(10,6)" },
    last_lon: { type: "numeric(10,6)" },
    last_seen: { type: "timestamp with time zone" },
    assigned_route_id: { type: "int", references: "patrol_routes", onDelete: "set null" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("patrol_units", { ifExists: true });
  pgm.dropTable("patrol_route_stops", { ifExists: true });
  pgm.dropTable("patrol_routes", { ifExists: true });
  pgm.dropTable("irad_accidents", { ifExists: true });
  pgm.dropTable("audit_logs", { ifExists: true });
  pgm.dropColumns("firs", [
    "act_type",
    "section_code",
    "severity",
    "category",
    "classification_id",
    "victim_gender",
    "victim_age",
    "sensitive_notes_enc",
  ]);
  pgm.dropTable("crime_classifications", { ifExists: true });
  pgm.dropExtension("pgcrypto", { ifExists: true });
};
