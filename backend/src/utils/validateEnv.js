import { env } from "./env.js";

export const validateEnv = () => {
  const required = ["JWT_SECRET", "DB_NAME"];
  const missing = [];

  if (!env.jwtSecret) missing.push("JWT_SECRET");
  if (!env.dbName && !process.env.DATABASE_URL) missing.push("DB_NAME or DATABASE_URL");

  if (missing.length && env.nodeEnv === "production") {
    throw new Error(`Missing required env vars: ${missing.join(", ")}`);
  }
};
