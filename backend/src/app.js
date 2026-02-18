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


const app = express();

app.use(express.json());
const windowMs = env.rateLimitWindowMs ? Number(env.rateLimitWindowMs) : 60_000;
const max = env.rateLimitMax ? Number(env.rateLimitMax) : 200;
app.use(rateLimit({ windowMs, max }));
app.use(
  cors({
    origin: env.corsOrigin || "http://localhost:3000",
    credentials: true,
  })
);
app.use(auditMiddleware);

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/fir", firRoutes);
app.use("/api/hotspots", hotspotRoutes);
app.use("/api/ml", mlRoutes);
app.use("/api/zones", zoneRoutes);
app.use("/api/classifications", classificationRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/irad", iradRoutes);
app.use("/api/patrol", patrolRoutes);
app.use("/api/events", eventsRoutes);

app.use(errorHandler);

export default app;
