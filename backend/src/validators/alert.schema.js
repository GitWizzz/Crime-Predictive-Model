import { z } from "zod";

const queryBooleanSchema = z.preprocess((value) => {
  if (typeof value === "string") {
    return value.toLowerCase() === "true";
  }
  return value;
}, z.boolean());

export const alertQuerySchema = z.object({
  zone: z.coerce.string().optional(),
  severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  unreadOnly: queryBooleanSchema.optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(100).optional(),
});

export const alertIdParamSchema = z.object({
  id: z.coerce.string().uuid(),
});
