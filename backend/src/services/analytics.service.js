import {
  getZoneAnalytics,
  getSeasonalTrends,
  getTimeSeriesCounts,
  getBehavioralIncidents,
  getWomenSafetyIncidents,
  getWomenSafetyFIRs,
  getRiskInputs,
  getZoneComparison,
  getHeatmapTimelineBuckets,
  getFIRExportRows,
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
  try {
    return await forecastSeries({
      series,
      periods: filters.periods || 30,
      freq: filters.freq || "D",
    });
  } catch {
    const periods = Number(filters.periods || 30);
    const values = series.map((s) => Number(s.y) || 0);
    const avg =
      values.slice(-7).reduce((acc, v) => acc + v, 0) /
      Math.max(1, Math.min(7, values.length));
    const last = new Date(series[series.length - 1].ds);
    const points = [];
    for (let i = 1; i <= periods; i++) {
      const d = new Date(last);
      d.setDate(last.getDate() + i);
      points.push({
        ds: d.toISOString(),
        yhat: avg,
        yhat_lower: Math.max(0, avg * 0.85),
        yhat_upper: avg * 1.15,
      });
    }
    return { points };
  }
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
  let clusters;
  try {
    clusters = await clusterIncidents(payload);
  } catch {
    clusters = { clusters: [], noise_ids: incidents.map((i) => i.id) };
  }
  const tagged = incidents.map((incident) => ({
    ...incident,
    tags: buildPatternTags(incident),
  }));
  return { clusters, incidents: tagged };
};

export const runWomenSafetyHotspots = async (filters) => {
  const normalized = {
    ...filters,
    startDate: filters.startDate || filters.fromDate,
    endDate: filters.endDate || filters.toDate,
  };
  const incidents = await getWomenSafetyIncidents(normalized);
  if (!incidents.length) {
    return { heat_points: [] };
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
    bandwidth_meters: filters.bandwidth_meters || 500,
    grid_size: filters.grid_size || 35,
    weights: incidents.map((row) => row.severity || 1),
  };

  try {
    return await kdeHotspots(payload);
  } catch {
    const maxSeverity = Math.max(1, ...incidents.map((i) => Number(i.severity) || 1));
    return {
      heat_points: incidents.map((i) => ({
        lat: Number(i.latitude),
        lon: Number(i.longitude),
        intensity: (Number(i.severity) || 1) / maxSeverity,
      })),
    };
  }
};

export const fetchWomenSafetyFIRs = async (filters) => {
  return await getWomenSafetyFIRs({
    ...filters,
    startDate: filters.startDate || filters.fromDate,
    endDate: filters.endDate || filters.toDate,
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
  try {
    const scores = await riskScore(payload);
    return { items, scores: scores.scores };
  } catch {
    const scores = payload.items.map((item) => {
      const raw =
        (Number(item.frequency) || 0) * 0.35 +
        (Number(item.severity) || 1) * 0.25 +
        Math.max(0, 365 - (Number(item.recency_days) || 365)) / 365 * 20 +
        (Number(item.hotspot_density) || 0) * 0.1 +
        (Number(item.repeat_rate) || 0) * 0.2;
      return { id: item.id, score: Math.max(0, Math.min(100, raw)) };
    });
    return { items, scores };
  }
};

export const compareZones = async (filters) => {
  return await getZoneComparison(filters);
};

export const buildHeatmapTimeline = async (filters) => {
  return await getHeatmapTimelineBuckets({
    ...filters,
    startDate: filters.startDate || filters.fromDate,
    endDate: filters.endDate || filters.toDate,
  });
};

export const exportFIRsCsv = async (filters) => {
  const rows = await getFIRExportRows({
    ...filters,
    startDate: filters.startDate || filters.fromDate,
    endDate: filters.endDate || filters.toDate,
  });
  const headers = ["fir_no", "crime_type", "section_code", "severity", "date_time", "police_station", "zone", "status"];
  const escape = (value) => {
    if (value === null || value === undefined) return "";
    const text = String(value).replace(/"/g, '""');
    return `"${text}"`;
  };
  return [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => escape(row[header])).join(",")),
  ].join("\n");
};
