import { pool } from "../config/db.js";
import { getSpatialCapabilities } from "../utils/spatial.util.js";

export const getZoneAnalytics = async ({ type = "DISTRICT", startDate, endDate }) => {
  const capabilities = await getSpatialCapabilities();
  const usePostgis = capabilities.zoneBoundarySpatial && capabilities.firLocationSpatial;
  const values = [type];
  let paramIndex = 2;
  let dateFilter = "";

  if (startDate) {
    dateFilter += ` AND f.occurred_at >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND f.occurred_at <= $${paramIndex++}`;
    values.push(endDate);
  }

  if (!usePostgis) {
    const joinClause =
      type === "STATION"
        ? "f.police_station = z.name"
        : "f.zone = z.name";

    const fallbackQuery = `
      WITH zone_base AS (
        SELECT
          z.id,
          z.name,
          z.type,
          CASE WHEN z.type = 'DISTRICT' THEN z.name ELSE NULL END AS district_name
        FROM zones z
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
          ON ${joinClause}
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

    const result = await pool.query(fallbackQuery, values);
    return result.rows;
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
    dateFilter += ` AND occurred_at >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND occurred_at <= $${paramIndex++}`;
    values.push(endDate);
  }

  let labelExpr = "to_char(occurred_at, 'Mon')";
  let orderExpr = "extract(month from occurred_at)";
  if (granularity === "weekday") {
    labelExpr = "to_char(occurred_at, 'Dy')";
    orderExpr = "extract(dow from occurred_at)";
  }
  if (granularity === "hour") {
    labelExpr = "lpad(extract(hour from occurred_at)::text, 2, '0')";
    orderExpr = "extract(hour from occurred_at)";
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
    dateFilter += ` AND occurred_at >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND occurred_at <= $${paramIndex++}`;
    values.push(endDate);
  }

  const bucket =
    interval === "month"
      ? "date_trunc('month', occurred_at)"
      : interval === "week"
        ? "date_trunc('week', occurred_at)"
        : "date_trunc('day', occurred_at)";

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
  const capabilities = await getSpatialCapabilities();
  const usePostgis = capabilities.firLocationSpatial;
  const values = [];
  let paramIndex = 1;
  let dateFilter = "";

  if (startDate) {
    dateFilter += ` AND f.occurred_at >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND f.occurred_at <= $${paramIndex++}`;
    values.push(endDate);
  }

  const latExpr = usePostgis
    ? "ST_Y(f.location::geometry)"
    : "(f.location->>'lat')::double precision";
  const lonExpr = usePostgis
    ? "ST_X(f.location::geometry)"
    : "(f.location->>'lon')::double precision";
  const locationFilter = usePostgis
    ? "f.location IS NOT NULL"
    : "f.location IS NOT NULL AND f.location ? 'lat' AND f.location ? 'lon'";

  const query = `
    SELECT
      f.id,
      ${latExpr} AS latitude,
      ${lonExpr} AS longitude,
      f.occurred_at AS date_time,
      f.crime_type,
      COALESCE(f.severity, c.severity, 1)::float AS severity
    FROM firs f
    LEFT JOIN crime_classifications c
      ON c.id = f.classification_id
      OR (c.act_type = f.act_type AND c.section_code = f.section_code)
    WHERE ${locationFilter}
    ${dateFilter};
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

export const getWomenSafetyIncidents = async ({ zone, startDate, endDate }) => {
  const capabilities = await getSpatialCapabilities();
  const usePostgis = capabilities.firLocationSpatial;
  const values = [];
  let paramIndex = 1;
  let dateFilter = "";

  if (startDate) {
    dateFilter += ` AND f.occurred_at >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND f.occurred_at <= $${paramIndex++}`;
    values.push(endDate);
  }
  if (zone) {
    dateFilter += ` AND f.zone = $${paramIndex++}`;
    values.push(zone);
  }

  const latExpr = usePostgis
    ? "ST_Y(f.location::geometry)"
    : "(f.location->>'lat')::double precision";
  const lonExpr = usePostgis
    ? "ST_X(f.location::geometry)"
    : "(f.location->>'lon')::double precision";
  const locationFilter = usePostgis
    ? "f.location IS NOT NULL"
    : "f.location IS NOT NULL AND f.location ? 'lat' AND f.location ? 'lon'";

  const query = `
    SELECT
      f.id,
      ${latExpr} AS latitude,
      ${lonExpr} AS longitude,
      f.occurred_at AS date_time,
      f.crime_type,
      COALESCE(f.severity, c.severity, 1)::float AS severity
    FROM firs f
    LEFT JOIN crime_classifications c
      ON c.id = f.classification_id
      OR (c.act_type = f.act_type AND c.section_code = f.section_code)
    WHERE ${locationFilter}
      AND (c.is_women_safety = true OR f.category = 'WomenSafety')
    ${dateFilter};
  `;

  const result = await pool.query(query, values);
  return result.rows;
};

export const getWomenSafetyFIRs = async ({ zone, startDate, endDate, page = 1, limit = 50 }) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const capabilities = await getSpatialCapabilities();
  const usePostgis = capabilities.firLocationSpatial;
  const lonExpr = usePostgis
    ? "ST_X(f.location::geometry)"
    : "(f.location->>'lon')::double precision";
  const latExpr = usePostgis
    ? "ST_Y(f.location::geometry)"
    : "(f.location->>'lat')::double precision";

  const values = [];
  let paramIndex = 1;
  let filters = "";
  if (zone) {
    filters += ` AND f.zone = $${paramIndex++}`;
    values.push(zone);
  }
  if (startDate) {
    filters += ` AND f.occurred_at >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    filters += ` AND f.occurred_at <= $${paramIndex++}`;
    values.push(endDate);
  }

  const query = `
    SELECT
      f.id, f.fir_no, f.crime_type, f.section, f.act_type, f.section_code,
      COALESCE(f.severity, c.severity, 1) AS severity,
      COALESCE(f.category, c.category) AS category,
      f.victim_gender, f.victim_age, f.victim_count, f.occurred_at,
      f.occurred_at AS date_time,
      ${lonExpr} AS longitude,
      ${latExpr} AS latitude,
      f.police_station, f.zone, f.location_name, f.status, f.description,
      COUNT(*) OVER() AS total_count
    FROM firs f
    LEFT JOIN crime_classifications c
      ON c.id = f.classification_id
      OR (c.act_type = f.act_type AND c.section_code = f.section_code)
    WHERE (c.is_women_safety = true OR f.category IN ('WomenSafety', 'Women Safety'))
    ${filters}
    ORDER BY f.occurred_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++};
  `;
  values.push(safeLimit, offset);
  const result = await pool.query(query, values);
  const total = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count, 10) : 0;
  const items = result.rows.map(({ total_count, ...row }) => row);
  return {
    items,
    firs: items,
    total,
    page: safePage,
    limit: safeLimit,
    total_pages: Math.ceil(total / safeLimit),
  };
};

export const getZoneComparison = async ({ zones, crimeType, year }) => {
  const zoneList = zones.split(",").map((item) => item.trim()).filter(Boolean).slice(0, 4);
  const selectedYear = year || new Date().getFullYear();
  const result = await pool.query(
    `
      SELECT
        zone,
        to_char(date_trunc('month', occurred_at), 'YYYY-MM') AS month,
        COUNT(*)::int AS count,
        SUM(CASE WHEN COALESCE(severity, 1) >= 3 THEN 1 ELSE 0 END)::int AS serious_count
      FROM firs
      WHERE zone = ANY($1::text[])
        AND ($2::text IS NULL OR crime_type = $2)
        AND EXTRACT(YEAR FROM occurred_at) = $3
      GROUP BY zone, month
      ORDER BY zone, month;
    `,
    [zoneList, crimeType || null, selectedYear]
  );

  return result.rows.reduce((acc, row) => {
    acc[row.zone] = acc[row.zone] || [];
    acc[row.zone].push({
      month: row.month,
      count: row.count,
      serious_count: row.serious_count,
    });
    return acc;
  }, {});
};

export const getHeatmapTimelineBuckets = async ({ zone, crimeType, startDate, endDate }) => {
  const capabilities = await getSpatialCapabilities();
  const usePostgis = capabilities.firLocationSpatial;
  const latExpr = usePostgis
    ? "ST_Y(location::geometry)"
    : "(location->>'lat')::double precision";
  const lonExpr = usePostgis
    ? "ST_X(location::geometry)"
    : "(location->>'lon')::double precision";
  const locationFilter = usePostgis
    ? "location IS NOT NULL"
    : "location IS NOT NULL AND location ? 'lat' AND location ? 'lon'";

  const values = [];
  let paramIndex = 1;
  let filters = "";
  if (zone) {
    filters += ` AND zone = $${paramIndex++}`;
    values.push(zone);
  }
  if (crimeType) {
    filters += ` AND crime_type = $${paramIndex++}`;
    values.push(crimeType);
  }
  if (startDate) {
    filters += ` AND occurred_at >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    filters += ` AND occurred_at <= $${paramIndex++}`;
    values.push(endDate);
  }

  const result = await pool.query(
    `
      SELECT
        to_char(date_trunc('month', occurred_at), 'YYYY-MM') AS bucket,
        ${latExpr} AS lat,
        ${lonExpr} AS lon,
        COALESCE(severity, 1)::float AS intensity
      FROM firs
      WHERE ${locationFilter}
      ${filters}
      ORDER BY bucket ASC, occurred_at ASC;
    `,
    values
  );

  const maxIntensity = Math.max(1, ...result.rows.map((row) => Number(row.intensity) || 1));
  const buckets = new Map();
  for (const row of result.rows) {
    if (!buckets.has(row.bucket)) buckets.set(row.bucket, []);
    buckets.get(row.bucket).push({
      lat: Number(row.lat),
      lon: Number(row.lon),
      intensity: (Number(row.intensity) || 1) / maxIntensity,
    });
  }

  return {
    buckets: Array.from(buckets.entries()).map(([bucket, heat_points]) => ({
      bucket,
      heat_points,
    })),
  };
};

export const getFIRExportRows = async ({ zone, crimeType, status, startDate, endDate }) => {
  const values = [];
  let paramIndex = 1;
  let filters = "";
  if (zone) {
    filters += ` AND zone = $${paramIndex++}`;
    values.push(zone);
  }
  if (crimeType) {
    filters += ` AND crime_type = $${paramIndex++}`;
    values.push(crimeType);
  }
  if (status) {
    filters += ` AND status = $${paramIndex++}`;
    values.push(status);
  }
  if (startDate) {
    filters += ` AND occurred_at >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    filters += ` AND occurred_at <= $${paramIndex++}`;
    values.push(endDate);
  }

  const result = await pool.query(
    `
      SELECT fir_no, crime_type, section_code, severity,
             occurred_at AS date_time,
             police_station, zone, status
      FROM firs
      WHERE 1=1
      ${filters}
      ORDER BY occurred_at DESC
      LIMIT 5000;
    `,
    values
  );
  return result.rows;
};

export const getRiskInputs = async ({ startDate, endDate, type = "DISTRICT" }) => {
  const capabilities = await getSpatialCapabilities();
  const usePostgis = capabilities.zoneBoundarySpatial && capabilities.firLocationSpatial;
  const values = [type];
  let paramIndex = 2;
  let dateFilter = "";

  if (startDate) {
    dateFilter += ` AND f.occurred_at >= $${paramIndex++}`;
    values.push(startDate);
  }
  if (endDate) {
    dateFilter += ` AND f.occurred_at <= $${paramIndex++}`;
    values.push(endDate);
  }

  if (!usePostgis) {
    const joinClause =
      type === "STATION"
        ? "f.police_station = z.name"
        : "f.zone = z.name";

    const fallbackQuery = `
      WITH zone_base AS (
        SELECT
          z.id,
          z.name,
          z.type
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
          MAX(f.occurred_at) AS last_incident,
          COUNT(DISTINCT f.crime_type)::float AS distinct_crimes,
          1.0::float AS area_m2
        FROM zone_base z
        LEFT JOIN filtered_firs f
          ON ${joinClause}
        GROUP BY z.id, z.name
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

    const result = await pool.query(fallbackQuery, values);
    return result.rows;
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
        MAX(f.occurred_at) AS last_incident,
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
