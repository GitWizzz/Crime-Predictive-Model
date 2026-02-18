import {
  getZoneAnalytics,
  getSeasonalTrends,
  getTimeSeriesCounts,
  getBehavioralIncidents,
  getWomenSafetyIncidents,
  getRiskInputs,
} from "../models/analytics.model.js";
import { clusterIncidents, forecastSeries, kdeHotspots, riskScore } from "./ml.service.js";

const buildPatternTags = (incident) => {
  const tags = [];
  const date = incident.date_time ? new Date(incident.date_time) : null;
  if (date) {
    const hour = date.getHours();
    const day = date.getDay();
    if (hour >= 20 || hour <= 5) tags.push("NightTime");
    if (hour >= 6 && hour <= 11) tags.push("Morning");
    if (hour >= 12 && hour <= 17) tags.push("Afternoon");
    if (hour >= 18 && hour <= 19) tags.push("Evening");
    if (day === 0 || day === 6) tags.push("Weekend");
  }
  if (incident.severity >= 4) tags.push("HighSeverity");
  return tags;
};

export const fetchZoneAnalytics = async (filters) => {
  return await getZoneAnalytics(filters);
};

export const fetchSeasonalTrends = async (filters) => {
  return await getSeasonalTrends(filters);
};

export const buildForecast = async (filters) => {
  const rows = await getTimeSeriesCounts(filters);
  const series = rows.map((row) => ({
    ds: row.bucket,
    y: row.total,
  }));
  if (series.length < 2) {
    return { points: [] };
  }
  return await forecastSeries({
    series,
    periods: filters.periods || 30,
    freq: filters.freq || "D",
  });
};

export const runBehavioralClustering = async (filters) => {
  const incidents = await getBehavioralIncidents(filters);
  if (!incidents.length) {
    return { clusters: { clusters: [], noise_ids: [] }, incidents: [] };
  }
  const payload = {
    incidents: incidents.map((row) => ({
      id: row.id,
      lat: row.latitude,
      lon: row.longitude,
      occurred_at: row.date_time,
      crime_type: row.crime_type,
      severity: row.severity,
    })),
    eps_meters: filters.eps_meters || 300,
    min_samples: filters.min_samples || 4,
  };
  const clusters = await clusterIncidents(payload);
  const tagged = incidents.map((incident) => ({
    ...incident,
    tags: buildPatternTags(incident),
  }));
  return { clusters, incidents: tagged };
};

export const runWomenSafetyHotspots = async (filters) => {
  const incidents = await getWomenSafetyIncidents(filters);
  if (!incidents.length) {
    return { heat_points: [] };
  }
  return await kdeHotspots({
    incidents: incidents.map((row) => ({
      id: row.id,
      lat: row.latitude,
      lon: row.longitude,
      occurred_at: row.date_time,
      crime_type: row.crime_type,
      severity: row.severity,
    })),
    bandwidth_meters: filters.bandwidth_meters || 500,
    grid_size: filters.grid_size || 35,
    weights: incidents.map((row) => row.severity || 1),
  });
};

export const runRiskScoring = async (filters) => {
  const items = await getRiskInputs(filters);
  const payload = {
    items: items.map((row) => ({
      id: row.id,
      frequency: row.frequency,
      severity: row.avg_severity,
      recency_days: row.recency_days,
      hotspot_density: row.density,
      repeat_rate: row.repeat_rate,
    })),
  };
  const scores = await riskScore(payload);
  return { items, scores: scores.scores };
};
