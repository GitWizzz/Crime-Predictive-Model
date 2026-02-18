import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import {
  clusterSchema,
  kdeSchema,
  forecastSchema,
  routeSchema,
  riskSchema,
} from "../validators/ml.schema.js";
import {
  cluster,
  hotspotsKDE,
  forecast,
  optimize,
  risk,
} from "../controllers/ml.controller.js";

const router = express.Router();

router.post("/cluster", protect, validate(clusterSchema), cluster);
router.post("/hotspots/kde", protect, validate(kdeSchema), hotspotsKDE);
router.post("/forecast", protect, validate(forecastSchema), forecast);
router.post("/routes/optimize", protect, validate(routeSchema), optimize);
router.post("/risk-score", protect, validate(riskSchema), risk);

export default router;
