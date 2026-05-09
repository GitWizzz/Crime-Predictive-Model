import { z } from "zod";

export const createFIRSchema = z.object({
  fir_no: z.string().min(1),
  crime_type: z.string().min(1),
  section: z.coerce.string().optional(),
  act_type: z.coerce.string().optional(),
  section_code: z.coerce.string().optional(),
  severity: z.coerce.number().int().min(1).max(5).optional(),
  category: z.coerce.string().optional(),
  classification_id: z.coerce.number().int().optional(),
  victim_gender: z.coerce.string().optional(),
  victim_age: z.coerce.number().int().min(0).max(120).optional(),
  victim_count: z.coerce.number().int().min(0).optional(),
  sensitive_notes: z.coerce.string().optional(),
  date_time: z.coerce.string().optional(),
  occurred_at: z.coerce.string().optional(),
  latitude: z.coerce.number().min(-90).max(90).optional(),
  longitude: z.coerce.number().min(-180).max(180).optional(),
  location_name: z.coerce.string().optional(),
  police_station: z.coerce.string().optional(),
  zone: z.coerce.string().optional(),
  status: z.coerce.string().optional(),
  description: z.coerce.string().optional(),
  source: z.coerce.string().optional(),
}).refine((data) => data.date_time || data.occurred_at, {
  message: "date_time or occurred_at is required",
  path: ["date_time"],
});

const bulkPayloadSchema = z.object({
  items: z.array(createFIRSchema).min(1).max(500),
});

export const bulkFIRSchema = z.union([
  bulkPayloadSchema,
  z.object({ firs: z.array(createFIRSchema).min(1).max(500) }),
]);

export const cctnsFIRSchema = z.object({
  fir_no: z.string().min(1),
  crime_type: z.string().min(1),
  act_type: z.string().optional(),
  sections: z.union([z.string(), z.array(z.string())]).optional(),
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
  crimeType: z.coerce.string().optional(),
  act_type: z.coerce.string().optional(),
  section_code: z.coerce.string().optional(),
  startDate: z.coerce.string().optional(),
  endDate: z.coerce.string().optional(),
  fromDate: z.coerce.string().optional(),
  toDate: z.coerce.string().optional(),
  zone: z.coerce.string().optional(),
  police_station: z.coerce.string().optional(),
  status: z.coerce.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const firIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const firSearchQuerySchema = z.object({
  q: z.coerce.string().min(1),
  zone: z.coerce.string().optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});
