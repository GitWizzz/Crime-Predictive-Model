import jwt from "jsonwebtoken";
import { env } from "./env.js";

export const generateToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role },
    env.jwtSecret,
    { expiresIn: "8h" }
  );
};
