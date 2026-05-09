import jwt from "jsonwebtoken";
import { env } from "./env.js";

export const generateToken = (user, expiresIn = "8h") => {
  return jwt.sign(
    { id: user.id, role: user.role, type: "access" },
    env.jwtSecret,
    { expiresIn }
  );
};

export const generateRefreshToken = (user) => {
  return jwt.sign(
    { id: user.id, role: user.role, type: "refresh" },
    env.jwtSecret,
    { expiresIn: "30d" }
  );
};

export const verifyRefreshToken = (token) => {
  const decoded = jwt.verify(token, env.jwtSecret);
  if (decoded.type !== "refresh") {
    throw new Error("Invalid refresh token");
  }
  return decoded;
};
