import { pool } from "../config/db.js";
import { getSpatialCapabilities } from "../utils/spatial.util.js";

export const insertAccidents = async (items) => {
  if (!items.length) return [];
  const capabilities = await getSpatialCapabilities();
  const usePostgis = capabilities.iradLocationSpatial;

  const values = [];
  const placeholders = items.map((item, index) => {
    const base = index * 7;
    values.push(
      item.accident_id,
      item.occurred_at || item.date_time,
      item.severity ?? 1,
      item.latitude,
      item.longitude,
      item.road_name || null,
      item.district || null
    );
    const locationExpr = usePostgis
      ? `ST_SetSRID(ST_MakePoint($${base + 5}, $${base + 4}), 4326)`
      : `jsonb_build_object('lat',$${base + 4},'lon',$${base + 5})`;
    return `($${base + 1}, $${base + 2}, $${base + 3}, ${locationExpr}, $${base + 6}, $${base + 7})`;
  });

  const lonExpr = usePostgis
    ? "ST_X(location::geometry)"
    : "(location->>'lon')::double precision";
  const latExpr = usePostgis
    ? "ST_Y(location::geometry)"
    : "(location->>'lat')::double precision";

  const query = `
    INSERT INTO irad_accidents (
      accident_id, occurred_at, severity, location, road_name, district
    )
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (accident_id) DO NOTHING
    RETURNING id, accident_id, occurred_at, occurred_at AS date_time, severity,
              ${lonExpr} as longitude,
              ${latExpr} as latitude,
              road_name, district;
  `;
  const result = await pool.query(query, values);
  return result.rows;
};

export const listAccidents = async ({ startDate, endDate }) => {
  const capabilities = await getSpatialCapabilities();
  const usePostgis = capabilities.iradLocationSpatial;
  const values = [];
  let paramIndex = 1;
  let filter = "";

  if (startDate) {
    filter += ` AND occurred_at >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    filter += ` AND occurred_at <= $${paramIndex++}`;
    values.push(endDate);
  }

  const lonExpr = usePostgis
    ? "ST_X(location::geometry)"
    : "(location->>'lon')::double precision";
  const latExpr = usePostgis
    ? "ST_Y(location::geometry)"
    : "(location->>'lat')::double precision";

  const query = `
    SELECT id, accident_id, occurred_at, occurred_at AS date_time, severity,
           ${lonExpr} as longitude,
           ${latExpr} as latitude,
           road_name, district
    FROM irad_accidents
    WHERE 1=1
    ${filter}
    ORDER BY occurred_at DESC;
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

export const getAccidentIncidents = async ({ startDate, endDate }) => {
  const capabilities = await getSpatialCapabilities();
  const usePostgis = capabilities.iradLocationSpatial;
  const values = [];
  let paramIndex = 1;
  let filter = "";

  if (startDate) {
    filter += ` AND occurred_at >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    filter += ` AND occurred_at <= $${paramIndex++}`;
    values.push(endDate);
  }

  const latExpr = usePostgis
    ? "ST_Y(location::geometry)"
    : "(location->>'lat')::double precision";
  const lonExpr = usePostgis
    ? "ST_X(location::geometry)"
    : "(location->>'lon')::double precision";
  const locationFilter = usePostgis
    ? "location IS NOT NULL"
    : "location IS NOT NULL AND location ? 'lat' AND location ? 'lon'";

  const query = `
    SELECT id,
      ${latExpr} AS latitude,
      ${lonExpr} AS longitude,
      occurred_at,
      occurred_at AS date_time,
      severity
    FROM irad_accidents
    WHERE ${locationFilter}
    ${filter};
  `;
  const result = await pool.query(query, values);
  return result.rows;
};
