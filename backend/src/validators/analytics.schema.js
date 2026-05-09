import { z } from "zod";

export const zoneAnalyticsQuerySchema = z.object({
  type: z.coerce.string().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  fromDate: z.coerce.string().optional(),
  toDate: z.coerce.string().optional(),
});

export const seasonalQuerySchema = z.object({
  granularity: z.coerce.string().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  fromDate: z.coerce.string().optional(),
  toDate: z.coerce.string().optional(),
});

export const forecastQuerySchema = z.object({
  interval: z.coerce.string().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  fromDate: z.coerce.string().optional(),
  toDate: z.coerce.string().optional(),
  periods: z.coerce.number().int().positive().optional(),
  freq: z.coerce.string().optional(),
});

export const behavioralBodySchema = z.object({
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  eps_meters: z.coerce.number().positive().optional(),
  min_samples: z.coerce.number().int().positive().optional(),
});

export const womenSafetyQuerySchema = z.object({
  zone: z.coerce.string().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  fromDate: z.coerce.string().optional(),
  toDate: z.coerce.string().optional(),
  bandwidth_meters: z.coerce.number().positive().optional(),
  grid_size: z.coerce.number().int().positive().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const riskQuerySchema = z.object({
  type: z.coerce.string().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  fromDate: z.coerce.string().optional(),
  toDate: z.coerce.string().optional(),
});

export const compareQuerySchema = z.object({
  zones: z.coerce.string().min(1),
  crimeType: z.coerce.string().optional(),
  year: z.coerce.number().int().optional(),
});

export const exportQuerySchema = z.object({
  zone: z.coerce.string().optional(),
  crimeType: z.coerce.string().optional(),
  status: z.coerce.string().optional(),
  fromDate: z.coerce.string().optional(),
  toDate: z.coerce.string().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
});

export const heatmapTimelineQuerySchema = z.object({
  zone: z.coerce.string().optional(),
  crimeType: z.coerce.string().optional(),
  fromDate: z.coerce.string().optional(),
  toDate: z.coerce.string().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
});
