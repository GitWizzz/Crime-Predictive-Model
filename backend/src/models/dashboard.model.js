import { pool } from "../config/db.js";

export const getMobileDashboardSummary = async ({ zone }) => {
  const values = [];
  let zoneFilter = "";

  if (zone) {
    values.push(zone);
    zoneFilter = "WHERE zone = $1";
  }

  const query = `
    WITH scoped_firs AS (
      SELECT *
      FROM firs
      ${zoneFilter}
    ),
    top_crime AS (
      SELECT crime_type
      FROM scoped_firs
      GROUP BY crime_type
      ORDER BY COUNT(*) DESC
      LIMIT 1
    ),
    high_risk AS (
      SELECT zone
      FROM scoped_firs
      WHERE zone IS NOT NULL
        AND date_time >= NOW() - INTERVAL '30 days'
      GROUP BY zone
      HAVING COUNT(*) >= 5
      ORDER BY COUNT(*) DESC
      LIMIT 5
    )
    SELECT
      COUNT(*) FILTER (WHERE date_time >= NOW() - INTERVAL '30 days')::int AS active_hotspots,
      COUNT(DISTINCT police_station) FILTER (WHERE police_station IS NOT NULL)::int AS stations_covered,
      COALESCE(
        ROUND(
          100 * COUNT(*) FILTER (WHERE date_time >= NOW() - INTERVAL '30 days')::numeric
          / NULLIF(COUNT(*)::numeric, 0)
        )::int,
        0
      ) AS forecast_confidence,
      COUNT(*) FILTER (WHERE status = 'PENDING')::int AS pending_firs,
      COUNT(*) FILTER (WHERE date_time >= NOW() - INTERVAL '24 hours')::int AS firs_last_24h,
      COUNT(*) FILTER (WHERE date_time >= NOW() - INTERVAL '7 days')::int AS firs_last_7d,
      COALESCE((SELECT crime_type FROM top_crime), 'N/A') AS top_crime_type,
      COALESCE((SELECT json_agg(zone) FROM high_risk), '[]'::json) AS high_risk_zones
    FROM scoped_firs;
  `;

  const result = await pool.query(query, values);
  return result.rows[0];
};
