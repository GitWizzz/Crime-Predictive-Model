import { pool } from "../config/db.js";

const selectFields = `
  id,
  name,
  type,
  ST_AsGeoJSON(boundary)::json AS boundary,
  alert_radius_m,
  notify_roles,
  active,
  created_by,
  created_at
`;

export const createGeoFence = async ({ name, type, boundary, alert_radius_m, notify_roles, created_by }) => {
  const result = await pool.query(
    `INSERT INTO geo_fences (name, type, boundary, alert_radius_m, notify_roles, created_by)
     VALUES ($1, $2, ST_SetSRID(ST_GeomFromGeoJSON($3), 4326), $4, $5, $6)
     RETURNING ${selectFields}`,
    [
      name,
      type,
      JSON.stringify(boundary),
      alert_radius_m || 500,
      notify_roles || ["ADMIN", "OFFICER"],
      created_by || null,
    ]
  );
  return result.rows[0];
};

export const listGeoFences = async ({ type, active }) => {
  const values = [];
  let paramIndex = 1;
  let filters = "";
  if (type) {
    filters += ` AND type = $${paramIndex++}`;
    values.push(type);
  }
  if (active !== undefined) {
    filters += ` AND active = $${paramIndex++}`;
    values.push(active === true || active === "true");
  }

  const result = await pool.query(
    `SELECT ${selectFields}
     FROM geo_fences
     WHERE 1=1
     ${filters}
     ORDER BY created_at DESC`,
    values
  );
  return result.rows;
};

export const updateGeoFence = async ({ id, name, type, boundary, alert_radius_m, notify_roles, active }) => {
  const result = await pool.query(
    `UPDATE geo_fences
     SET name = COALESCE($2, name),
         type = COALESCE($3, type),
         boundary = CASE WHEN $4::text IS NULL THEN boundary ELSE ST_SetSRID(ST_GeomFromGeoJSON($4), 4326) END,
         alert_radius_m = COALESCE($5, alert_radius_m),
         notify_roles = COALESCE($6, notify_roles),
         active = COALESCE($7, active)
     WHERE id = $1
     RETURNING ${selectFields}`,
    [
      id,
      name || null,
      type || null,
      boundary ? JSON.stringify(boundary) : null,
      alert_radius_m || null,
      notify_roles || null,
      typeof active === "boolean" ? active : null,
    ]
  );
  return result.rows[0];
};

export const deleteGeoFence = async (id) => {
  const result = await pool.query(
    `UPDATE geo_fences
     SET active = false
     WHERE id = $1
     RETURNING ${selectFields}`,
    [id]
  );
  return result.rows[0];
};
