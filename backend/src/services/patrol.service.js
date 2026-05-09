import { getZoneCentroids, createPatrolRoute, listPatrolRoutes, getPatrolRouteById, createPatrolLog } from "../models/patrol.model.js";
import { runRiskScoring } from "./analytics.service.js";
import { optimizeRoutes } from "./ml.service.js";

export const generatePatrolRoute = async ({ type = "DISTRICT", startDate, endDate, num_vehicles = 1, max_stops = 8, userId }) => {
  const riskResult = await runRiskScoring({ type, startDate, endDate });
  const scores = riskResult.scores || [];
  const items = riskResult.items || [];

  const scoreMap = new Map(scores.map((s) => [s.id, s.score]));
  const ranked = items
    .map((item) => ({
      ...item,
      score: scoreMap.get(item.id) || 0,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, max_stops);

  const centroids = await getZoneCentroids(ranked.map((r) => r.id));
  const stops = centroids.map((c) => ({
    id: c.id,
    lat: parseFloat(c.lat),
    lon: parseFloat(c.lon),
    zone_name: c.name,
  }));

  if (!stops.length) {
    return { routes: [], risk_summary: ranked };
  }

  const depot = stops[0];
  const payload = {
    depot: { lat: depot.lat, lon: depot.lon },
    stops: stops.slice(1).map((s) => ({ lat: s.lat, lon: s.lon })),
    num_vehicles,
  };

  const optimized = await optimizeRoutes(payload);
  const created = [];

  for (const route of optimized.routes) {
    const stopOrder = route.stop_order || route.stops || [];
    const orderedStops = stopOrder.map((index, idx) => {
      const stop = stops[index + 1] || stops[index] || stops[idx + 1];
      if (!stop) return null;
      return {
        sequence: idx + 1,
        latitude: stop.lat,
        longitude: stop.lon,
        zone_name: stop.zone_name,
      };
    }).filter(Boolean);
    const vehicleId = route.vehicle_id ?? route.vehicle ?? 0;
    const routeName = `Route ${vehicleId + 1} (${type})`;
    const saved = await createPatrolRoute({
      name: routeName,
      created_by: userId,
      status: "PLANNED",
      risk_score: ranked.reduce((sum, r) => sum + (r.score || 0), 0) / Math.max(ranked.length, 1),
      stops: orderedStops,
    });
    created.push({ ...saved, distance_km: route.distance_km, stops: orderedStops });
  }

  return { routes: created, risk_summary: ranked };
};

export const fetchPatrolRoutes = async () => {
  return await listPatrolRoutes();
};

export const fetchPatrolRoute = async (id) => {
  const route = await getPatrolRouteById(id);
  if (!route) throw new Error("Patrol route not found");
  return route;
};

export const buildPatrolSchedule = async ({ type = "DISTRICT", startDate, endDate }) => {
  const riskResult = await runRiskScoring({ type, startDate, endDate });
  const scores = riskResult.scores || [];
  const items = riskResult.items || [];
  const scoreMap = new Map(scores.map((s) => [s.id, s.score]));

  const schedule = items
    .map((item) => {
      const score = scoreMap.get(item.id) || 0;
      const shift = score > 70 ? "Night" : score > 40 ? "Evening" : "Day";
      return {
        id: item.id,
        name: item.name,
        score,
        recommended_shift: shift,
        frequency: item.frequency,
      };
    })
    .sort((a, b) => b.score - a.score);

  return schedule;
};

export const recordPatrolLog = async ({ payload, officerId }) => {
  return await createPatrolLog({
    ...payload,
    officer_id: officerId,
  });
};
