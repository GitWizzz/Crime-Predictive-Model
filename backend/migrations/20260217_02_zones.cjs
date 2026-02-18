exports.up = (pgm) => {
  pgm.createTable("zones", {
    id: "id",
    name: { type: "varchar(255)", notNull: true },
    type: { type: "varchar(50)", notNull: true, default: "'DISTRICT'" },
    boundary: { type: "geometry(MultiPolygon, 4326)", notNull: true },
    created_at: { type: "timestamp", default: pgm.func("current_timestamp") },
  });

  pgm.createIndex("zones", "boundary", {
    method: "gist",
    name: "zones_boundary_gix",
  });

  pgm.createIndex("zones", ["name", "type"], {
    unique: true,
    name: "zones_name_type_uniq",
  });
};

exports.down = (pgm) => {
  pgm.dropTable("zones", { ifExists: true });
};