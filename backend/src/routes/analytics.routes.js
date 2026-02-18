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
} from "../validators/analytics.schema.js";
import {
  getZoneAnalyticsHandler,
  getSeasonalTrendsHandler,
  getForecastHandler,
  postBehavioralHandler,
  getWomenSafetyHandler,
  getRiskHandler,
} from "../controllers/analytics.controller.js";

const router = express.Router();

router.get("/zones", protect, validateQuery(zoneAnalyticsQuerySchema), getZoneAnalyticsHandler);
router.get("/seasonal", protect, validateQuery(seasonalQuerySchema), getSeasonalTrendsHandler);
router.get("/forecast", protect, validateQuery(forecastQuerySchema), getForecastHandler);
router.post("/behavioral", protect, validate(behavioralBodySchema), postBehavioralHandler);
router.get("/women-safety", protect, validateQuery(womenSafetyQuerySchema), getWomenSafetyHandler);
router.get("/risk", protect, validateQuery(riskQuerySchema), getRiskHandler);

export default router;
