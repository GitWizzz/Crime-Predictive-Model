import { z } from "zod";

export const createFIRSchema = z.object({
  fir_no: z.coerce.string().min(1),
  crime_type: z.coerce.string().min(1),
  section: z.coerce.string().optional(),
  act_type: z.coerce.string().optional(),
  section_code: z.coerce.string().optional(),
  severity: z.coerce.number().int().min(1).max(5).optional(),
  category: z.coerce.string().optional(),
  classification_id: z.coerce.number().int().optional(),
  victim_gender: z.coerce.string().optional(),
  victim_age: z.coerce.number().int().min(0).max(120).optional(),
  sensitive_notes: z.coerce.string().optional(),
  date_time: z.coerce.string().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  police_station: z.coerce.string().optional(),
  zone: z.coerce.string().optional(),
});

export const bulkFIRSchema = z.object({
  items: z.array(createFIRSchema).min(1).max(500),
});

export const cctnsFIRSchema = z.object({
  fir_no: z.coerce.string().min(1),
  crime_type: z.coerce.string().min(1),
  act_type: z.coerce.string().optional(),
  sections: z.union([z.coerce.string(), z.array(z.coerce.string())]).optional(),
  category: z.coerce.string().optional(),
  severity: z.coerce.number().int().min(1).max(5).optional(),
  occurred_at: z.coerce.string().min(1),
  latitude: z.coerce.number().min(-90).max(90),
  longitude: z.coerce.number().min(-180).max(180),
  police_station: z.coerce.string().optional(),
  zone: z.coerce.string().optional(),
  victim_gender: z.coerce.string().optional(),
  victim_age: z.coerce.number().int().min(0).max(120).optional(),
});

export const firQuerySchema = z.object({
  crime_type: z.coerce.string().optional(),
  act_type: z.coerce.string().optional(),
  section_code: z.coerce.string().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  zone: z.coerce.string().optional(),
  police_station: z.coerce.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const firIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
