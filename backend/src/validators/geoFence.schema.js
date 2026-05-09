import { z } from "zod";

const geometrySchema = z.object({
  type: z.enum(["Polygon", "MultiPolygon"]),
  coordinates: z.array(z.any()).min(1),
});

export const geoFenceCreateSchema = z.object({
  name: z.coerce.string().min(1),
  type: z.enum(["SCHOOL", "HOSPITAL", "GOVERNMENT", "RELIGIOUS", "BORDER", "CUSTOM"]),
  boundary: geometrySchema,
  alert_radius_m: z.coerce.number().int().positive().optional(),
  notify_roles: z.array(z.enum(["ADMIN", "OFFICER", "ANALYST"])).optional(),
});

export const geoFenceUpdateSchema = geoFenceCreateSchema.partial().extend({
  active: z.coerce.boolean().optional(),
});

export const geoFenceQuerySchema = z.object({
  type: z.coerce.string().optional(),
  active: z.coerce.boolean().optional(),
});

export const geoFenceIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});
