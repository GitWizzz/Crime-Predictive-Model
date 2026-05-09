import express from "express";
import { getHotspots } from "../controllers/hotspot.controller.js";
import { hotspotsKDE } from "../controllers/ml.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate, validateQuery } from "../middlewares/validate.middleware.js";
import { hotspotQuerySchema } from "../validators/hotspot.schema.js";
import { kdeSchema } from "../validators/ml.schema.js";

const router = express.Router();


router.get("/", protect, validateQuery(hotspotQuerySchema), getHotspots);
router.post("/kde", protect, validate(kdeSchema), hotspotsKDE);

export default router;
