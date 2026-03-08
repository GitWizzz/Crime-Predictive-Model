import { pool } from "../config/db.js";

let spatialCapabilitiesPromise = null;

const isSpatialType = (column) => {
  if (!column) return false;
  const udt = String(column.udt_name || "").toLowerCase();
  return udt === "geometry" || udt === "geography";
};

export const getSpatialCapabilities = async () => {
  if (spatialCapabilitiesPromise) {
    return spatialCapabilitiesPromise;
  }

  spatialCapabilitiesPromise = (async () => {
    const extensionRes = await pool.query(
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'postgis') AS has_postgis"
    );
    const hasPostgisExtension = Boolean(extensionRes.rows[0]?.has_postgis);

    const columnsRes = await pool.query(`
      SELECT table_name, column_name, udt_name
      FROM information_schema.columns
      WHERE table_schema = current_schema()
        AND (
          (table_name = 'firs' AND column_name = 'location')
          OR (table_name = 'zones' AND column_name = 'boundary')
          OR (table_name = 'irad_accidents' AND column_name = 'location')
        );
    `);

    const byKey = new Map(
      columnsRes.rows.map((row) => [`${row.table_name}.${row.column_name}`, row])
    );

    const firLocationSpatial = hasPostgisExtension && isSpatialType(byKey.get("firs.location"));
    const zoneBoundarySpatial = hasPostgisExtension && isSpatialType(byKey.get("zones.boundary"));
    const iradLocationSpatial =
      hasPostgisExtension && isSpatialType(byKey.get("irad_accidents.location"));

    return {
      hasPostgisExtension,
      firLocationSpatial,
      zoneBoundarySpatial,
      iradLocationSpatial,
    };
  })();

  return spatialCapabilitiesPromise;
};

