import { pool } from "../config/db.js";

export const listAuditLogs = async ({ userId, action, fromDate, toDate, page = 1, limit = 50 }) => {
  const safeLimit = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);
  const safePage = Math.max(parseInt(page, 10) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const values = [];
  let paramIndex = 1;
  let filters = "";

  if (userId) {
    filters += ` AND a.user_id = $${paramIndex++}`;
    values.push(userId);
  }
  if (action) {
    filters += ` AND a.action = $${paramIndex++}`;
    values.push(action);
  }
  if (fromDate) {
    filters += ` AND a.created_at >= $${paramIndex++}`;
    values.push(fromDate);
  }
  if (toDate) {
    filters += ` AND a.created_at <= $${paramIndex++}`;
    values.push(toDate);
  }

  const result = await pool.query(
    `
      SELECT
        a.id,
        a.user_id,
        u.name AS user_name,
        a.action,
        a.entity AS resource,
        a.entity_id AS resource_id,
        a.metadata,
        a.ip_address AS ip,
        a.created_at,
        COUNT(*) OVER() AS total_count
      FROM audit_logs a
      LEFT JOIN users u ON u.id = a.user_id
      WHERE 1=1
      ${filters}
      ORDER BY a.created_at DESC
      LIMIT $${paramIndex++} OFFSET $${paramIndex++};
    `,
    [...values, safeLimit, offset]
  );

  const total = result.rows[0]?.total_count ? parseInt(result.rows[0].total_count, 10) : 0;
  return {
    entries: result.rows.map(({ total_count, ...entry }) => entry),
    pagination: {
      page: safePage,
      limit: safeLimit,
      total,
      total_pages: Math.ceil(total / safeLimit),
    },
  };
};
