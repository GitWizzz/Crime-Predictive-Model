import { pool } from "../config/db.js";

export const createAuditLog = async ({ user_id, action, entity, entity_id, metadata, ip_address }) => {
  await pool.query(
    `INSERT INTO audit_logs (user_id, action, entity, entity_id, metadata, ip_address)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      user_id || null,
      action,
      entity,
      entity_id || null,
      metadata || {},
      ip_address || null,
    ]
  );
};
