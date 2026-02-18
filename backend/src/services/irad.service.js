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
  return await kdeHotspots({
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
  });
};
