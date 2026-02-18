import pkg from "pg";
import { env } from "../utils/env.js";

const { Pool } = pkg;

const connectionString = process.env.DATABASE_URL;

export const pool = new Pool({
  connectionString: connectionString || undefined,
  host: connectionString ? undefined : env.dbHost,
  port: connectionString ? undefined : env.dbPort,
  user: connectionString ? undefined : env.dbUser,
  password: connectionString ? undefined : env.dbPassword,
  database: connectionString ? undefined : env.dbName,
  ssl: env.dbSsl === "true" ? { rejectUnauthorized: false } : undefined,
});

export const connectDB = async () => {
  try {
    await pool.query("SELECT 1");
    console.log("✅ PostgreSQL connected");
  } catch (error) {
    console.error("❌ PostgreSQL connection failed", error);
    process.exit(1);
  }
};
