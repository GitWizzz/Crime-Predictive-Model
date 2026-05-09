exports.up = (pgm) => {
  pgm.addColumns("users", {
    police_station: { type: "varchar(100)" },
    zone: { type: "varchar(100)" },
    fcm_token: { type: "text" },
    fcm_token_updated_at: { type: "timestamp with time zone" },
  });

  pgm.createIndex("users", "police_station", { name: "users_police_station_idx" });
  pgm.createIndex("users", "zone", { name: "users_zone_idx" });

  pgm.createTable("crime_alerts", {
    id: { type: "uuid", primaryKey: true, default: pgm.func("gen_random_uuid()") },
    zone: { type: "varchar(100)", notNull: true },
    crime_type: { type: "varchar(100)" },
    incident_count: { type: "int", notNull: true, default: 0 },
    z_score: { type: "numeric(8,2)" },
    severity: { type: "varchar(20)", notNull: true, default: "'MEDIUM'" },
    message: { type: "text", notNull: true },
    anomaly_details: { type: "jsonb", notNull: true, default: pgm.func("'{}'::jsonb") },
    created_at: { type: "timestamp with time zone", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.addConstraint(
    "crime_alerts",
    "crime_alerts_severity_check",
    "CHECK (severity IN ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL'))"
  );

  pgm.createIndex("crime_alerts", "zone", { name: "crime_alerts_zone_idx" });
  pgm.createIndex("crime_alerts", "severity", { name: "crime_alerts_severity_idx" });
  pgm.createIndex("crime_alerts", "created_at", { name: "crime_alerts_created_at_idx" });

  pgm.createTable("crime_alert_reads", {
    alert_id: { type: "uuid", references: "crime_alerts", onDelete: "cascade", notNull: true },
    user_id: { type: "int", references: "users", onDelete: "cascade", notNull: true },
    read_at: { type: "timestamp with time zone", notNull: true, default: pgm.func("current_timestamp") },
  });

  pgm.addConstraint("crime_alert_reads", "crime_alert_reads_pk", "PRIMARY KEY (alert_id, user_id)");
  pgm.createIndex("crime_alert_reads", "user_id", { name: "crime_alert_reads_user_id_idx" });
};

exports.down = (pgm) => {
  pgm.dropTable("crime_alert_reads", { ifExists: true });
  pgm.dropTable("crime_alerts", { ifExists: true });
  pgm.dropColumns("users", [
    "police_station",
    "zone",
    "fcm_token",
    "fcm_token_updated_at",
  ]);
};
