import { z } from "zod";

export const auditQuerySchema = z.object({
  userId: z.coerce.number().int().positive().optional(),
  action: z.coerce.string().optional(),
  fromDate: z.coerce.string().optional(),
  toDate: z.coerce.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
