import { z } from "zod";

export const iradIngestSchema = z.object({
  items: z.array(
    z.object({
      accident_id: z.coerce.string().min(1),
      date_time: z.coerce.string().min(1),
      severity: z.coerce.number().int().min(1).max(5).optional(),
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
      road_name: z.coerce.string().optional(),
      district: z.coerce.string().optional(),
    })
  ).min(1),
});

export const iradQuerySchema = z.object({
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  bandwidth_meters: z.coerce.number().positive().optional(),
  grid_size: z.coerce.number().int().positive().optional(),
});
