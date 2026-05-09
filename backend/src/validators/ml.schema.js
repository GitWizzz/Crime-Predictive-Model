import { z } from "zod";

const pointSchema = z.object({
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
});

const incidentSchema = z.object({
  id: z.union([z.coerce.number(), z.coerce.string()]),
  lat: z.coerce.number().min(-90).max(90),
  lon: z.coerce.number().min(-180).max(180),
  occurred_at: z.coerce.string().optional(),
  crime_type: z.coerce.string().optional(),
  severity: z.coerce.number().optional(),
});

export const clusterSchema = z.object({
  incidents: z.array(incidentSchema).min(1),
  eps_meters: z.coerce.number().positive().default(300),
  min_samples: z.coerce.number().int().positive().default(4),
});

export const kdeSchema = z.object({
  incidents: z.array(incidentSchema).min(1),
  bandwidth_meters: z.coerce.number().positive().default(500),
  grid_size: z.coerce.number().int().min(5).max(200).default(30),
  boundary_geojson: z.any().optional(),
  weights: z.array(z.coerce.number()).optional(),
});

const seriesPointSchema = z.object({
  ds: z.coerce.string().min(1),
  y: z.coerce.number(),
});

export const forecastSchema = z.object({
  series: z.array(seriesPointSchema).min(2).optional(),
  time_series: z.array(seriesPointSchema).min(2).optional(),
  periods: z.coerce.number().int().min(1).max(365).default(30),
  freq: z.coerce.string().min(1).default("D"),
}).refine((data) => data.series || data.time_series, {
  message: "series or time_series is required",
  path: ["series"],
});

export const routeSchema = z.object({
  depot: pointSchema,
  stops: z.array(pointSchema).min(1),
  num_vehicles: z.coerce.number().int().min(1).max(20).default(1),
});

const riskItemSchema = z.object({
  id: z.union([z.coerce.number(), z.coerce.string()]),
  frequency: z.coerce.number().min(0),
  severity: z.coerce.number().min(0),
  recency_days: z.coerce.number().min(0),
  hotspot_density: z.coerce.number().min(0),
  repeat_rate: z.coerce.number().min(0),
});

export const riskSchema = z.object({
  items: z.array(riskItemSchema).min(1),
});
