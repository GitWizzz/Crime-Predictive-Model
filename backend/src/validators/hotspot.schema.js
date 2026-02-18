import { z } from "zod";

export const hotspotQuerySchema = z.object({
  fromDate: z.coerce.string().optional(),
  toDate: z.coerce.string().optional(),
  crimeType: z.coerce.string().optional(),
  zone: z.coerce.string().optional(),
});