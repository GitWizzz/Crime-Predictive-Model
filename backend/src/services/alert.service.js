import { getAlertById, getAlerts, markAlertRead } from "../models/alert.model.js";
import { findUserById } from "../models/user.model.js";

const mapAlert = (row) => ({
  id: row.id,
  zone: row.zone,
  crimeType: row.crime_type,
  count: row.incident_count,
  zScore: row.z_score === null ? null : Number(row.z_score),
  severity: row.severity,
  message: row.message,
  anomalyDetails: row.anomaly_details,
  isRead: row.is_read,
  receivedAt: row.created_at,
});

export const fetchAlerts = async ({ user, filters }) => {
  const profile = filters.zone ? null : await findUserById(user.id);
  const zone = filters.zone || profile?.zone || null;
  const result = await getAlerts({
    userId: user.id,
    zone,
    severity: filters.severity,
    unreadOnly: filters.unreadOnly,
    page: filters.page,
    limit: filters.limit,
  });

  return {
    alerts: result.rows.map(mapAlert),
    unreadCount: result.unreadCount,
    pagination: {
      page: result.page,
      limit: result.limit,
      total: result.total,
    },
  };
};

export const fetchAlertDetailAndMarkRead = async ({ id, userId }) => {
  const alert = await getAlertById({ id, userId });
  if (!alert) {
    throw new Error("Alert not found");
  }
  await markAlertRead({ id, userId });
  return { ...mapAlert(alert), isRead: true };
};

export const markAlertAsRead = async ({ id, userId }) => {
  const result = await markAlertRead({ id, userId });
  if (!result) {
    throw new Error("Alert not found");
  }
  return { message: "Alert marked as read" };
};
