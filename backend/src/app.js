import express from "express";
import cors from "cors";
import { env } from "./utils/env.js";
import { rateLimit } from "./middlewares/rateLimit.middleware.js";
import { auditMiddleware } from "./middlewares/audit.middleware.js";
import { errorHandler } from "./middlewares/error.middleware.js";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import firRoutes from "./routes/fir.routes.js";
import hotspotRoutes from "./routes/hotspot.routes.js";
import mlRoutes from "./routes/ml.routes.js";
import zoneRoutes from "./routes/zone.routes.js";
import classificationRoutes from "./routes/classification.routes.js";
import analyticsRoutes from "./routes/analytics.routes.js";
import iradRoutes from "./routes/irad.routes.js";
import patrolRoutes from "./routes/patrol.routes.js";
import eventsRoutes from "./routes/events.routes.js";
import userRoutes from "./routes/user.routes.js";
import dashboardRoutes from "./routes/dashboard.routes.js";
import alertRoutes from "./routes/alert.routes.js";
import auditRoutes from "./routes/audit.routes.js";
import geoFenceRoutes from "./routes/geoFence.routes.js";


const app = express();

app.use(express.json());
const windowMs = env.rateLimitWindowMs ? Number(env.rateLimitWindowMs) : 60_000;
const max = env.rateLimitMax ? Number(env.rateLimitMax) : 200;
app.use(rateLimit({ windowMs, max }));
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow all localhost origins (3000, 3001, etc.) + specific env origin
      const allowedOrigins = [
        "http://localhost:3000",
        "http://localhost:3001",
        "http://127.0.0.1:3000",
        "http://127.0.0.1:3001",
      ];
      
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    credentials: true,
  })
);
app.use(auditMiddleware);

const mountApiRoutes = (prefix) => {
  app.use(`${prefix}/health`, healthRoutes);
  app.use(`${prefix}/auth`, authRoutes);
  app.use(`${prefix}/fir`, firRoutes);
  app.use(`${prefix}/firs`, firRoutes);
  app.use(`${prefix}/hotspots`, hotspotRoutes);
  app.use(`${prefix}/ml`, mlRoutes);
  app.use(`${prefix}/zones`, zoneRoutes);
  app.use(`${prefix}/classifications`, classificationRoutes);
  app.use(`${prefix}/analytics`, analyticsRoutes);
  app.use(`${prefix}/irad`, iradRoutes);
  app.use(`${prefix}/patrol`, patrolRoutes);
  app.use(`${prefix}/events`, eventsRoutes);
  app.use(`${prefix}/users`, userRoutes);
  app.use(`${prefix}/dashboard`, dashboardRoutes);
  app.use(`${prefix}/alerts`, alertRoutes);
  app.use(`${prefix}/audit`, auditRoutes);
  app.use(`${prefix}/geo-fences`, geoFenceRoutes);
};

mountApiRoutes("/api/v1");
mountApiRoutes("/api");

app.use(errorHandler);

export default app;
