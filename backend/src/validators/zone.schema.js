import { z } from "zod";

export const zoneQuerySchema = z.object({
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  type: z.coerce.string().optional(),
});