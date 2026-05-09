import { pool } from "../config/db.js";
import { getSpatialCapabilities } from "../utils/spatial.util.js";

const centroidFromGeometry = (geometry) => {
  if (!geometry || typeof geometry !== "object") return { lat: null, lon: null };

  if (geometry.type === "Point" && Array.isArray(geometry.coordinates)) {
    const [lon, lat] = geometry.coordinates;
    return { lat: Number(lat), lon: Number(lon) };
  }

  let coords = [];
  if (geometry.type === "Polygon") {
    coords = geometry.coordinates?.[0] || [];
  } else if (geometry.type === "MultiPolygon") {
    coords = geometry.coordinates?.[0]?.[0] || [];
  }

  if (!coords.length) return { lat: null, lon: null };

  let sumLat = 0;
  let sumLon = 0;
  let count = 0;
  for (const pair of coords) {
    if (!Array.isArray(pair) || pair.length < 2) continue;
    sumLon += Number(pair[0]);
    sumLat += Number(pair[1]);
    count += 1;
  }

  if (!count) return { lat: null, lon: null };
  return { lat: sumLat / count, lon: sumLon / count };
};

export const getZoneCentroids = async (ids) => {
  if (!ids.length) return [];
  const capabilities = await getSpatialCapabilities();
  const usePostgis = capabilities.zoneBoundarySpatial;
  const placeholders = ids.map((_, idx) => `$${idx + 1}`).join(",");

  if (usePostgis) {
    const query = `
      SELECT id, name,
        ST_Y(ST_Centroid(boundary)) AS lat,
        ST_X(ST_Centroid(boundary)) AS lon
      FROM zones
      WHERE id IN (${placeholders});
    `;
    const result = await pool.query(query, ids);
    return result.rows;
  }

  const fallbackQuery = `
    SELECT id, name, boundary
    FROM zones
    WHERE id IN (${placeholders});
  `;
  const result = await pool.query(fallbackQuery, ids);
  return result.rows.map((row) => {
    const { lat, lon } = centroidFromGeometry(row.boundary);
    return { id: row.id, name: row.name, lat, lon };
  });
};

export const createPatrolRoute = async ({ name, created_by, status, risk_score, scheduled_for, stops }) => {
  const result = await pool.query(
    `INSERT INTO patrol_routes (name, created_by, status, risk_score, scheduled_for)
     VALUES ($1, $2, $3, $4, $5)
     RETURNING id, name, status, risk_score, scheduled_for, created_at`,
    [name, created_by || null, status || "PLANNED", risk_score || 0, scheduled_for || null]
  );
  const route = result.rows[0];

  if (stops?.length) {
    const values = [];
    const placeholders = stops.map((stop, idx) => {
      const base = idx * 5;
      values.push(route.id, stop.sequence, stop.latitude, stop.longitude, stop.zone_name || null);
      return `($${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5})`;
    });
    await pool.query(
      `INSERT INTO patrol_route_stops (route_id, sequence, latitude, longitude, zone_name)
       VALUES ${placeholders.join(", ")}`,
      values
    );
  }

  return route;
};

export const listPatrolRoutes = async () => {
  const result = await pool.query(
    `SELECT id, name, status, risk_score, scheduled_for, created_at
     FROM patrol_routes
     ORDER BY created_at DESC`
  );
  return result.rows;
};

export const getPatrolRouteById = async (id) => {
  const routeRes = await pool.query(
    `SELECT id, name, status, risk_score, scheduled_for, created_at
     FROM patrol_routes
     WHERE id = $1`,
    [id]
  );
  if (!routeRes.rows[0]) return null;

  const stopsRes = await pool.query(
    `SELECT id, route_id, sequence, latitude, longitude, zone_name
     FROM patrol_route_stops
     WHERE route_id = $1
     ORDER BY sequence ASC`,
    [id]
  );

  return { ...routeRes.rows[0], stops: stopsRes.rows };
};

export const createPatrolLog = async ({
  route_id,
  unit_id,
  officer_id,
  started_at,
  completed_at,
  coverage_pct,
  stops_visited,
  stops_planned,
  distance_km_actual,
  incidents_encountered,
}) => {
  const result = await pool.query(
    `INSERT INTO patrol_logs (
       route_id, unit_id, officer_id, started_at, completed_at, coverage_pct,
       stops_visited, stops_planned, distance_km_actual, incidents_encountered
     )
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
     RETURNING id, route_id, unit_id, officer_id, started_at, completed_at,
               coverage_pct, stops_visited, stops_planned, distance_km_actual,
               incidents_encountered, created_at`,
    [
      route_id,
      unit_id || null,
      officer_id || null,
      started_at || null,
      completed_at || null,
      coverage_pct || null,
      stops_visited || null,
      stops_planned || null,
      distance_km_actual || null,
      incidents_encountered || 0,
    ]
  );
  return result.rows[0];
};
