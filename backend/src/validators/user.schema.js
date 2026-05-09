import { z } from "zod";

export const fcmTokenSchema = z.object({
  fcmToken: z.coerce.string().min(10).max(4096),
});

export const userListQuerySchema = z.object({
  role: z.enum(["ADMIN", "OFFICER", "ANALYST"]).optional(),
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().max(200).optional(),
});

export const userIdParamSchema = z.object({
  id: z.coerce.number().int().positive(),
});

export const updateUserSchema = z.object({
  role: z.enum(["ADMIN", "OFFICER", "ANALYST"]).optional(),
  is_active: z.coerce.boolean().optional(),
  police_station: z.coerce.string().optional(),
  zone: z.coerce.string().optional(),
});
