import express from "express";
import { protect } from "../middlewares/auth.middleware.js";
import { validateParams, validateQuery } from "../middlewares/validate.middleware.js";
import {
  getAlertHandler,
  listAlertsHandler,
  markAlertReadHandler,
} from "../controllers/alert.controller.js";
import { alertIdParamSchema, alertQuerySchema } from "../validators/alert.schema.js";

const router = express.Router();

router.get("/", protect, validateQuery(alertQuerySchema), listAlertsHandler);
router.get("/:id", protect, validateParams(alertIdParamSchema), getAlertHandler);
router.patch("/:id/read", protect, validateParams(alertIdParamSchema), markAlertReadHandler);

export default router;
