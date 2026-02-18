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
