import { z } from "zod";

export const signupSchema = z.object({
  name: z.coerce.string().min(1),
  email: z.coerce.string().email(),
  password: z.coerce.string().min(6),
  role: z.enum(["ADMIN", "OFFICER", "ANALYST"]),
});

export const loginSchema = z.object({
  email: z.coerce.string().email(),
  password: z.coerce.string().min(6),
});