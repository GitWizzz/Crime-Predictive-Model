import { pool } from "../config/db.js";

export const findUserByEmail = async (email) => {
  const result = await pool.query(
    "SELECT * FROM users WHERE email = $1",
    [email]
  );
  return result.rows[0];
};

export const findUserById = async (id) => {
  const result = await pool.query(
    `SELECT id, name, email, role, police_station, zone, created_at
     FROM users
     WHERE id = $1`,
    [id]
  );
  return result.rows[0];
};

export const createUser = async ({ name, email, passwordHash, role, police_station, zone }) => {
  const result = await pool.query(
    `INSERT INTO users (name, email, password_hash, role, police_station, zone)
     VALUES ($1, $2, $3, $4, $5, $6)
     RETURNING id, name, email, role, police_station, zone, created_at`,
    [name, email, passwordHash, role, police_station || null, zone || null]
  );
  return result.rows[0];
};

export const updateUserFcmToken = async ({ id, fcmToken }) => {
  const result = await pool.query(
    `UPDATE users
     SET fcm_token = $2,
         fcm_token_updated_at = current_timestamp
     WHERE id = $1
     RETURNING id`,
    [id, fcmToken]
  );
  return result.rows[0];
};

export const listUsers = async ({ role, page = 1, limit = 25 }) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 25, 1), 200);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const values = [];
  let paramIndex = 1;
  let filters = "";

  if (role) {
    filters += ` AND role = $${paramIndex++}`;
    values.push(role);
  }

  const result = await pool.query(
    `SELECT id, name, email, role, police_station, zone, is_active, created_at,
            COUNT(*) OVER() AS total_count
     FROM users
     WHERE 1=1
     ${filters}
     ORDER BY created_at DESC
     LIMIT $${paramIndex++} OFFSET $${paramIndex++}`,
    [...values, safeLimit, offset]
  );
  const total = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count, 10) : 0;
  return {
    users: result.rows.map(({ total_count, ...user }) => user),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: Math.ceil(total / safeLimit),
    },
  };
};

export const updateUserById = async ({ id, role, is_active, police_station, zone }) => {
  const result = await pool.query(
    `UPDATE users
     SET role = COALESCE($2, role),
         is_active = COALESCE($3, is_active),
         police_station = COALESCE($4, police_station),
         zone = COALESCE($5, zone)
     WHERE id = $1
     RETURNING id, name, email, role, police_station, zone, is_active, created_at`,
    [id, role || null, typeof is_active === "boolean" ? is_active : null, police_station || null, zone || null]
  );
  return result.rows[0];
};

export const deactivateUserById = async (id) => {
  const result = await pool.query(
    `UPDATE users
     SET is_active = false
     WHERE id = $1
     RETURNING id, name, email, role, police_station, zone, is_active, created_at`,
    [id]
  );
  return result.rows[0];
};
