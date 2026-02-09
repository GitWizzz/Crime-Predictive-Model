import express from "express";
import healthRoutes from "./routes/health.routes.js";
import authRoutes from "./routes/auth.routes.js";
import firRoutes from "./routes/fir.routes.js";
import hotspotRoutes from "./routes/hotspot.routes.js";


const app = express();

app.use(express.json());

app.use("/api/health", healthRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/fir", firRoutes);
app.use("/api/hotspots", hotspotRoutes);

export default app;
