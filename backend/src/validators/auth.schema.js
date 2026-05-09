import { z } from "zod";

export const signupSchema = z.object({
  name: z.coerce.string().min(1),
  email: z.coerce.string().email(),
  password: z.coerce.string().min(6),
  role: z.enum(["ADMIN", "OFFICER", "ANALYST"]),
  police_station: z.coerce.string().optional(),
  zone: z.coerce.string().optional(),
});

export const loginSchema = z.object({
  email: z.coerce.string().email(),
  password: z.coerce.string().min(6),
});

export const refreshSchema = z.object({
  refreshToken: z.coerce.string().min(1),
});
