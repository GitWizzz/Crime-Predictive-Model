import { pool } from "../config/db.js";

const selectAlertFields = `
  a.id,
  a.zone,
  a.crime_type,
  a.incident_count,
  a.z_score,
  a.severity,
  a.message,
  a.anomaly_details,
  a.created_at,
  (r.alert_id IS NOT NULL) AS is_read
`;

export const getAlerts = async ({ userId, zone, severity, unreadOnly, page = 1, limit = 20 }) => {
  const safeLimit = Math.min(Math.max(Number(limit) || 20, 1), 100);
  const safePage = Math.max(Number(page) || 1, 1);
  const offset = (safePage - 1) * safeLimit;
  const values = [userId];
  let paramIndex = 2;
  let filters = "";

  if (zone) {
    filters += ` AND a.zone = $${paramIndex++}`;
    values.push(zone);
  }

  if (severity) {
    filters += ` AND a.severity = $${paramIndex++}`;
    values.push(severity);
  }

  if (unreadOnly) {
    filters += " AND r.alert_id IS NULL";
  }

  const listQuery = `
    SELECT ${selectAlertFields},
           COUNT(*) OVER()::int AS total_count
    FROM crime_alerts a
    LEFT JOIN crime_alert_reads r
      ON r.alert_id = a.id
      AND r.user_id = $1
    WHERE 1=1
    ${filters}
    ORDER BY a.created_at DESC
    LIMIT $${paramIndex++} OFFSET $${paramIndex++};
  `;

  const countQuery = `
    SELECT COUNT(*)::int AS unread_count
    FROM crime_alerts a
    LEFT JOIN crime_alert_reads r
      ON r.alert_id = a.id
      AND r.user_id = $1
    WHERE r.alert_id IS NULL
    ${zone ? "AND a.zone = $2" : ""};
  `;

  const listValues = [...values, safeLimit, offset];
  const [listResult, countResult] = await Promise.all([
    pool.query(listQuery, listValues),
    pool.query(countQuery, zone ? [userId, zone] : [userId]),
  ]);

  return {
    rows: listResult.rows,
    total: listResult.rows[0]?.total_count || 0,
    unreadCount: countResult.rows[0]?.unread_count || 0,
    page: safePage,
    limit: safeLimit,
  };
};

export const getAlertById = async ({ id, userId }) => {
  const result = await pool.query(
    `SELECT ${selectAlertFields}
     FROM crime_alerts a
     LEFT JOIN crime_alert_reads r
       ON r.alert_id = a.id
       AND r.user_id = $2
     WHERE a.id = $1`,
    [id, userId]
  );
  return result.rows[0];
};

export const markAlertRead = async ({ id, userId }) => {
  const result = await pool.query(
    `INSERT INTO crime_alert_reads (alert_id, user_id)
     SELECT id, $2
     FROM crime_alerts
     WHERE id = $1
     ON CONFLICT (alert_id, user_id)
     DO UPDATE SET read_at = current_timestamp
     RETURNING alert_id`,
    [id, userId]
  );
  return result.rows[0];
};
