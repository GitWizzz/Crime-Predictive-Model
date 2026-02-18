exports.up = (pgm) => {
  pgm.createExtension("postgis", { ifNotExists: true });

  pgm.createTable("users", {
    id: "id",
    name: { type: "varchar(255)", notNull: true },
    email: { type: "varchar(255)", notNull: true, unique: true },
    password_hash: { type: "text", notNull: true },
    role: { type: "varchar(50)", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.addConstraint(
    "users",
    "users_role_check",
    "CHECK (role IN ('ADMIN', 'OFFICER', 'ANALYST'))"
  );

  pgm.createTable("firs", {
    id: "id",
    fir_no: { type: "varchar(50)", notNull: true, unique: true },
    crime_type: { type: "varchar(100)", notNull: true },
    section: { type: "varchar(100)" },
    date_time: { type: "timestamp with time zone", notNull: true },
    location: { type: "geography(Point, 4326)" },
    police_station: { type: "varchar(100)" },
    zone: { type: "varchar(100)" },
    status: { type: "varchar(50)", default: "'PENDING'" },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });
};

exports.down = (pgm) => {
  pgm.dropTable("firs", { ifExists: true });
  pgm.dropTable("users", { ifExists: true });
  pgm.dropExtension("postgis", { ifExists: true });
};
