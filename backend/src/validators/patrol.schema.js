import { z } from "zod";

export const patrolGenerateSchema = z.object({
  type: z.coerce.string().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  num_vehicles: z.coerce.number().int().positive().optional(),
  max_stops: z.coerce.number().int().positive().optional(),
});

export const patrolIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const patrolLogSchema = z.object({
  route_id: z.coerce.number().int().positive(),
  unit_id: z.coerce.number().int().positive().optional(),
  started_at: z.coerce.string().optional(),
  completed_at: z.coerce.string().optional(),
  coverage_pct: z.coerce.number().min(0).max(100).optional(),
  stops_visited: z.coerce.number().int().min(0).optional(),
  stops_planned: z.coerce.number().int().min(0).optional(),
  distance_km_actual: z.coerce.number().min(0).optional(),
  incidents_encountered: z.coerce.number().int().min(0).optional(),
});
