import { pool } from "../config/db.js";

export const getZoneCentroids = async (ids) => {
  if (!ids.length) return [];
  const placeholders = ids.map((_, idx) => `$${idx + 1}`).join(",");
  const query = `
    SELECT id, name,
      ST_Y(ST_Centroid(boundary)) AS lat,
      ST_X(ST_Centroid(boundary)) AS lon
    FROM zones
    WHERE id IN (${placeholders});
  `;
  const result = await pool.query(query, ids);
  return result.rows;
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
