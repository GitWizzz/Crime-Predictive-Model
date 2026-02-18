import { getZonesWithCounts } from "../models/zone.model.js";

export const fetchZones = async (filters) => {
  return await getZonesWithCounts(filters);
};