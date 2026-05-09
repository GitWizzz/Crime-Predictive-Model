import { getMobileDashboardSummary } from "../models/dashboard.model.js";
import { findUserById } from "../models/user.model.js";

const mapSummary = (row) => ({
  activeHotspots: row.active_hotspots || 0,
  stationsCovered: row.stations_covered || 0,
  forecastConfidence: row.forecast_confidence || 0,
  pendingFirs: row.pending_firs || 0,
  firsLast24h: row.firs_last_24h || 0,
  firsLast7d: row.firs_last_7d || 0,
  highRiskZones: row.high_risk_zones || [],
  topCrimeType: row.top_crime_type || "N/A",
  generatedAt: new Date().toISOString(),
});

export const fetchMobileDashboardSummary = async ({ requestedZone, user }) => {
  const profile = requestedZone ? null : await findUserById(user.id);
  const zone = requestedZone || profile?.zone || null;
  const row = await getMobileDashboardSummary({ zone });
  return mapSummary(row || {});
};
