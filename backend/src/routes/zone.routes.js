import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { validateQuery } from "../middlewares/validate.middleware.js";
import { zoneQuerySchema } from "../validators/zone.schema.js";
import { listZones } from "../controllers/zone.controller.js";

const router = express.Router();

router.get("/", protect, validateQuery(zoneQuerySchema), listZones);

export default router;