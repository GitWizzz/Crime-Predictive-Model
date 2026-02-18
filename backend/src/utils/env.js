import dotenv from "dotenv";
dotenv.config();

export const env = {
  port: process.env.PORT,
  nodeEnv: process.env.NODE_ENV,

  dbHost: process.env.DB_HOST,
  dbPort: process.env.DB_PORT,
  dbUser: process.env.DB_USER,
  dbPassword: process.env.DB_PASSWORD,
  dbName: process.env.DB_NAME,
  dbSsl: process.env.DB_SSL,
  dbEncryptionKey: process.env.DB_ENCRYPTION_KEY,

  jwtSecret: process.env.JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN,

  mlServiceUrl: process.env.ML_SERVICE_URL,
  initDbOnStart: process.env.INIT_DB_ON_START,
  corsOrigin: process.env.CORS_ORIGIN,
  rateLimitWindowMs: process.env.RATE_LIMIT_WINDOW_MS,
  rateLimitMax: process.env.RATE_LIMIT_MAX,
};
