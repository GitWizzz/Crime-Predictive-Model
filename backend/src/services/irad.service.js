import { insertAccidents, listAccidents, getAccidentIncidents } from "../models/irad.model.js";
import { kdeHotspots } from "./ml.service.js";

export const ingestAccidents = async (items) => {
  if (!Array.isArray(items) || items.length === 0) {
    throw new Error("No accident items provided");
  }
  return await insertAccidents(items);
};

export const fetchAccidents = async (filters) => {
  return await listAccidents(filters);
};

export const getAccidentHotspots = async (filters) => {
  const incidents = await getAccidentIncidents(filters);
  if (!incidents.length) {
    return { heat_points: [] };
  }
  const payload = {
    incidents: incidents.map((row) => ({
      id: row.id,
      lat: row.latitude,
      lon: row.longitude,
      occurred_at: row.date_time,
      severity: row.severity,
    })),
    bandwidth_meters: filters.bandwidth_meters || 600,
    grid_size: filters.grid_size || 30,
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
