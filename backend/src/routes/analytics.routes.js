import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { validateQuery, validate } from "../middlewares/validate.middleware.js";
import {
  zoneAnalyticsQuerySchema,
  seasonalQuerySchema,
  forecastQuerySchema,
  behavioralBodySchema,
  womenSafetyQuerySchema,
  riskQuerySchema,
  compareQuerySchema,
  exportQuerySchema,
  heatmapTimelineQuerySchema,
} from "../validators/analytics.schema.js";
import {
  getZoneAnalyticsHandler,
  getSeasonalTrendsHandler,
  getForecastHandler,
  postBehavioralHandler,
  getWomenSafetyHandler,
  getRiskHandler,
  getWomenSafetyFIRsHandler,
  getCompareHandler,
  getHeatmapTimelineHandler,
  exportCsvHandler,
} from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/zones", protect, validateQuery(zoneAnalyticsQuerySchema), getZoneAnalyticsHandler);
router.get("/seasonal", protect, validateQuery(seasonalQuerySchema), getSeasonalTrendsHandler);
router.get("/forecast", protect, validateQuery(forecastQuerySchema), getForecastHandler);
router.post("/behavioral", protect, validate(behavioralBodySchema), postBehavioralHandler);
router.get("/compare", protect, validateQuery(compareQuerySchema), getCompareHandler);
router.get("/export/csv", protect, validateQuery(exportQuerySchema), exportCsvHandler);
router.get("/heatmap-timeline", protect, validateQuery(heatmapTimelineQuerySchema), getHeatmapTimelineHandler);
router.get("/women-safety/firs", protect, validateQuery(womenSafetyQuerySchema), getWomenSafetyFIRsHandler);
router.get("/women-safety", protect, validateQuery(womenSafetyQuerySchema), getWomenSafetyHandler);
router.get("/risk", protect, validateQuery(riskQuerySchema), getRiskHandler);

export default router;
