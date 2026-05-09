import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { validateQuery } from "../middlewares/validate.middleware.js";
import { getMobileDashboardSummaryHandler } from "../controllers/dashboard.controller.js";
import { dashboardSummaryQuerySchema } from "../validators/dashboard.schema.js";

const router = express.Router();

router.get(
  "/summary",
  protect,
  validateQuery(dashboardSummaryQuerySchema),
  getMobileDashboardSummaryHandler
);

export default router;
