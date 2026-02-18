import express from "express";
import { getHotspots } from "../controllers/hotspot.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validateQuery } from "../middlewares/validate.middleware.js";
import { hotspotQuerySchema } from "../validators/hotspot.schema.js";

const router = express.Router();


router.get("/", protect, validateQuery(hotspotQuerySchema), getHotspots);

export default router;
