import { pool } from "../config/db.js";

export const getZonesWithCounts = async ({ startDate, endDate, type }) => {
  const values = [];
  let paramIndex = 1;

  let filter = "";
  if (type) {
    filter += ` AND z.type = $${paramIndex++}`;
    values.push(type);
  }

  let dateFilter = "";
  if (startDate) {
    dateFilter += ` AND f.date_time >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND f.date_time <= $${paramIndex++}`;
    values.push(endDate);
  }

  const query = `
    WITH zone_counts AS (
      SELECT
        z.id,
        z.name,
        z.type,
        z.boundary,
        CASE
          WHEN z.type = 'DISTRICT' THEN z.name
          ELSE d.name
        END AS district_name,
        COUNT(f.id)::int AS crime_count
      FROM zones z
      LEFT JOIN zones d
        ON d.type = 'DISTRICT'
        AND ST_Contains(d.boundary, ST_PointOnSurface(z.boundary))
      LEFT JOIN firs f
        ON ST_Contains(z.boundary, f.location::geometry)
        ${dateFilter}
      WHERE 1=1
        ${filter}
      GROUP BY z.id, d.name
    )
    SELECT
      json_build_object(
        'type', 'FeatureCollection',
        'features', COALESCE(json_agg(
          json_build_object(
            'type', 'Feature',
            'geometry', ST_AsGeoJSON(boundary)::json,
            'properties', json_build_object(
              'id', id,
              'name', name,
              'type', type,
              'district_name', district_name,
              'crime_count', crime_count
            )
          )
        ), '[]'::json)
      ) AS geojson,
      COALESCE(json_agg(
        json_build_object(
          'id', id,
          'name', name,
          'type', type,
          'district_name', district_name,
          'crime_count', crime_count
        ) ORDER BY crime_count DESC
      ), '[]'::json) AS totals
    FROM zone_counts;
  `;

  const result = await pool.query(query, values);
  const response = {
    geojson: result.rows[0]?.geojson || { type: "FeatureCollection", features: [] },
    totals: result.rows[0]?.totals || [],
  };

  if (!type || type === "DISTRICT") {
    const boundaryRes = await pool.query(`
      SELECT json_build_object(
        'type', 'Feature',
        'geometry', ST_AsGeoJSON(ST_Union(boundary))::json,
        'properties', json_build_object('name', 'Bihar')
      ) AS feature
      FROM zones
      WHERE type = 'DISTRICT';
    `);

    response.state_boundary = boundaryRes.rows[0]?.feature || null;
  }

  return response;
};
