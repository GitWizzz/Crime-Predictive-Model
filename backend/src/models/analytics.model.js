import { pool } from "../config/db.js";

export const getZoneAnalytics = async ({ type = "DISTRICT", startDate, endDate }) => {
  const values = [type];
  let paramIndex = 2;
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
    WITH zone_base AS (
      SELECT
        z.id,
        z.name,
        z.type,
        z.boundary,
        CASE
          WHEN z.type = 'DISTRICT' THEN z.name
          ELSE d.name
        END AS district_name
      FROM zones z
      LEFT JOIN zones d
        ON d.type = 'DISTRICT'
        AND ST_Contains(d.boundary, ST_PointOnSurface(z.boundary))
      WHERE z.type = $1
    ),
    filtered_firs AS (
      SELECT f.*, COALESCE(f.category, c.category) AS resolved_category
      FROM firs f
      LEFT JOIN crime_classifications c
        ON c.id = f.classification_id
        OR (c.act_type = f.act_type AND c.section_code = f.section_code)
      WHERE 1=1
      ${dateFilter}
    ),
    zone_counts AS (
      SELECT
        z.id,
        z.name,
        z.type,
        z.district_name,
        f.crime_type,
        f.resolved_category as category,
        COUNT(f.id)::int AS cnt
      FROM zone_base z
      LEFT JOIN filtered_firs f
        ON ST_Contains(z.boundary, f.location::geometry)
      GROUP BY z.id, z.name, z.type, z.district_name, f.crime_type, f.resolved_category
    ),
    zone_totals AS (
      SELECT
        id,
        name,
        type,
        district_name,
        SUM(cnt)::int AS total,
        COALESCE(json_object_agg(crime_type, cnt) FILTER (WHERE crime_type IS NOT NULL), '{}'::json) AS crime_breakdown,
        COALESCE(json_object_agg(category, cnt) FILTER (WHERE category IS NOT NULL), '{}'::json) AS category_breakdown
      FROM zone_counts
      GROUP BY id, name, type, district_name
    ),
    dominant_crime AS (
      SELECT DISTINCT ON (id)
        id,
        crime_type AS dominant_crime_type,
        cnt AS dominant_crime_count
      FROM zone_counts
      WHERE crime_type IS NOT NULL
      ORDER BY id, cnt DESC
    ),
    dominant_category AS (
      SELECT DISTINCT ON (id)
        id,
        category AS dominant_category,
        cnt AS dominant_category_count
      FROM zone_counts
      WHERE category IS NOT NULL
      ORDER BY id, cnt DESC
    )
    SELECT
      z.*,
      dc.dominant_crime_type,
      dc.dominant_crime_count,
      dcat.dominant_category,
      dcat.dominant_category_count
    FROM zone_totals z
    LEFT JOIN dominant_crime dc ON dc.id = z.id
    LEFT JOIN dominant_category dcat ON dcat.id = z.id
    ORDER BY z.total DESC;
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

export const getSeasonalTrends = async ({ granularity = "month", startDate, endDate }) => {
  const values = [];
  let paramIndex = 1;
  let dateFilter = "";

  if (startDate) {
    dateFilter += ` AND date_time >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND date_time <= $${paramIndex++}`;
    values.push(endDate);
  }

  let labelExpr = "to_char(date_time, 'Mon')";
  let orderExpr = "extract(month from date_time)";
  if (granularity === "weekday") {
    labelExpr = "to_char(date_time, 'Dy')";
    orderExpr = "extract(dow from date_time)";
  }
  if (granularity === "hour") {
    labelExpr = "lpad(extract(hour from date_time)::text, 2, '0')";
    orderExpr = "extract(hour from date_time)";
  }

  const query = `
    SELECT
      ${labelExpr} AS label,
      ${orderExpr} AS order_key,
      COUNT(*)::int AS total
    FROM firs
    WHERE 1=1
    ${dateFilter}
    GROUP BY label, order_key
    ORDER BY order_key ASC;
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

export const getTimeSeriesCounts = async ({ interval = "day", startDate, endDate }) => {
  const values = [];
  let paramIndex = 1;
  let dateFilter = "";

  if (startDate) {
    dateFilter += ` AND date_time >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND date_time <= $${paramIndex++}`;
    values.push(endDate);
  }

  const bucket =
    interval === "month"
      ? "date_trunc('month', date_time)"
      : interval === "week"
        ? "date_trunc('week', date_time)"
        : "date_trunc('day', date_time)";

  const query = `
    SELECT
      ${bucket} AS bucket,
      COUNT(*)::int AS total
    FROM firs
    WHERE 1=1
    ${dateFilter}
    GROUP BY bucket
    ORDER BY bucket ASC;
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

export const getBehavioralIncidents = async ({ startDate, endDate }) => {
  const values = [];
  let paramIndex = 1;
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
    SELECT
      f.id,
      ST_Y(f.location::geometry) AS latitude,
      ST_X(f.location::geometry) AS longitude,
      f.date_time,
      f.crime_type,
      COALESCE(f.severity, c.severity, 1)::float AS severity
    FROM firs f
    LEFT JOIN crime_classifications c
      ON c.id = f.classification_id
      OR (c.act_type = f.act_type AND c.section_code = f.section_code)
    WHERE f.location IS NOT NULL
    ${dateFilter};
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

export const getWomenSafetyIncidents = async ({ startDate, endDate }) => {
  const values = [];
  let paramIndex = 1;
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
    SELECT
      f.id,
      ST_Y(f.location::geometry) AS latitude,
      ST_X(f.location::geometry) AS longitude,
      f.date_time,
      f.crime_type,
      COALESCE(f.severity, c.severity, 1)::float AS severity
    FROM firs f
    LEFT JOIN crime_classifications c
      ON c.id = f.classification_id
      OR (c.act_type = f.act_type AND c.section_code = f.section_code)
    WHERE f.location IS NOT NULL
      AND (c.is_women_safety = true OR f.category = 'WomenSafety')
    ${dateFilter};
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

export const getRiskInputs = async ({ startDate, endDate, type = "DISTRICT" }) => {
  const values = [type];
  let paramIndex = 2;
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
    WITH zone_base AS (
      SELECT
        z.id,
        z.name,
        z.type,
        z.boundary
      FROM zones z
      WHERE z.type = $1
    ),
    filtered_firs AS (
      SELECT f.*, COALESCE(f.severity, c.severity, 1)::float AS resolved_severity
      FROM firs f
      LEFT JOIN crime_classifications c
        ON c.id = f.classification_id
        OR (c.act_type = f.act_type AND c.section_code = f.section_code)
      WHERE 1=1
      ${dateFilter}
    ),
    zone_stats AS (
      SELECT
        z.id,
        z.name,
        COUNT(f.id)::float AS frequency,
        AVG(f.resolved_severity)::float AS avg_severity,
        MAX(f.date_time) AS last_incident,
        COUNT(DISTINCT f.crime_type)::float AS distinct_crimes,
        ST_Area(z.boundary::geography)::float AS area_m2
      FROM zone_base z
      LEFT JOIN filtered_firs f
        ON ST_Contains(z.boundary, f.location::geometry)
      GROUP BY z.id, z.name, z.boundary
    )
    SELECT
      id,
      name,
      frequency,
      COALESCE(avg_severity, 1) AS avg_severity,
      COALESCE(DATE_PART('day', NOW() - last_incident), 365)::float AS recency_days,
      CASE WHEN area_m2 > 0 THEN frequency / area_m2 ELSE 0 END AS density,
      CASE WHEN distinct_crimes > 0 THEN frequency / distinct_crimes ELSE frequency END AS repeat_rate
    FROM zone_stats;
  `;

  const result = await pool.query(query, values);
  return result.rows;
};
