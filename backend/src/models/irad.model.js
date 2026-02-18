import { pool } from "../config/db.js";

export const insertAccidents = async (items) => {
  if (!items.length) return [];

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
    return `($${base + 1}, $${base + 2}, $${base + 3}, ST_SetSRID(ST_MakePoint($${base + 5}, $${base + 4}), 4326), $${base + 6}, $${base + 7})`;
  });

  const query = `
    INSERT INTO irad_accidents (
      accident_id, date_time, severity, location, road_name, district
    )
    VALUES ${placeholders.join(", ")}
    ON CONFLICT (accident_id) DO NOTHING
    RETURNING id, accident_id, date_time, severity,
              ST_X(location::geometry) as longitude,
              ST_Y(location::geometry) as latitude,
              road_name, district;
  `;
  const result = await pool.query(query, values);
  return result.rows;
};

export const listAccidents = async ({ startDate, endDate }) => {
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

  const query = `
    SELECT id, accident_id, date_time, severity,
           ST_X(location::geometry) as longitude,
           ST_Y(location::geometry) as latitude,
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

  const query = `
    SELECT id,
      ST_Y(location::geometry) AS latitude,
      ST_X(location::geometry) AS longitude,
      date_time,
      severity
    FROM irad_accidents
    WHERE 1=1
    ${filter};
  `;
  const result = await pool.query(query, values);
  return result.rows;
};
