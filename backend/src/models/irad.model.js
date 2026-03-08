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
      item.date_time,
      item.severity ?? 1,
      item.latitude,
      item.longitude,
      item.road_name || null,
      item.district || null
    );
    const locationExpr = usePostgis
      ? `ST_SetSRID(ST_MakePoint($${base + 5}, $${base + 4}), 4326)`
      : `jsonb_build_object('type','Point','coordinates',jsonb_build_array($${base + 5},$${base + 4}),'latitude',$${base + 4},'longitude',$${base + 5})`;
    return `($${base + 1}, $${base + 2}, $${base + 3}, ${locationExpr}, $${base + 6}, $${base + 7})`;
  });

  const lonExpr = usePostgis
    ? "ST_X(location::geometry)"
    : "(location->>'longitude')::double precision";
  const latExpr = usePostgis
    ? "ST_Y(location::geometry)"
    : "(location->>'latitude')::double precision";

  const query = `
    INSERT INTO irad_accidents (
      accident_id, date_time, severity, location, road_name, district
    )
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (accident_id) DO NOTHING
    RETURNING id, accident_id, date_time, severity,
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
    filter += ` AND date_time >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    filter += ` AND date_time <= $${paramIndex++}`;
    values.push(endDate);
  }

  const lonExpr = usePostgis
    ? "ST_X(location::geometry)"
    : "(location->>'longitude')::double precision";
  const latExpr = usePostgis
    ? "ST_Y(location::geometry)"
    : "(location->>'latitude')::double precision";

  const query = `
    SELECT id, accident_id, date_time, severity,
           ${lonExpr} as longitude,
           ${latExpr} as latitude,
           road_name, district
    FROM irad_accidents
    WHERE 1=1
    ${filter}
    ORDER BY date_time DESC;
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
    filter += ` AND date_time >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    filter += ` AND date_time <= $${paramIndex++}`;
    values.push(endDate);
  }

  const latExpr = usePostgis
    ? "ST_Y(location::geometry)"
    : "(location->>'latitude')::double precision";
  const lonExpr = usePostgis
    ? "ST_X(location::geometry)"
    : "(location->>'longitude')::double precision";
  const locationFilter = usePostgis
    ? "location IS NOT NULL"
    : "location IS NOT NULL AND location ? 'latitude' AND location ? 'longitude'";

  const query = `
    SELECT id,
      ${latExpr} AS latitude,
      ${lonExpr} AS longitude,
      date_time,
      severity
    FROM irad_accidents
    WHERE ${locationFilter}
    ${filter};
  `;
  const result = await pool.query(query, values);
  return result.rows;
};
