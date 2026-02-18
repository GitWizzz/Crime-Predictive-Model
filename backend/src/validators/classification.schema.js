import { z } from "zod";

export const createClassificationSchema = z.object({
  act_type: z.coerce.string().min(1),
  section_code: z.coerce.string().min(1),
  title: z.coerce.string().optional(),
  description: z.coerce.string().optional(),
  category: z.coerce.string().min(1),
  severity: z.coerce.number().int().min(1).max(5).optional(),
  is_women_safety: z.coerce.boolean().optional(),
  is_accident_related: z.coerce.boolean().optional(),
});

export const lookupClassificationSchema = z.object({
  act_type: z.coerce.string().min(1),
  section_code: z.coerce.string().min(1),
});
