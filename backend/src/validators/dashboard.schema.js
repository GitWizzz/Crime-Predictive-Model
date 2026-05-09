import { z } from "zod";

export const dashboardSummaryQuerySchema = z.object({
  zone: z.coerce.string().optional(),
});
