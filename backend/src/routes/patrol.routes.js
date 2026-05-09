import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { validate, validateParams } from "../middlewares/validate.middleware.js";
import { patrolGenerateSchema, patrolIdParamSchema, patrolLogSchema } from "../validators/patrol.schema.js";
import {
  generatePatrolHandler,
  listPatrolRoutesHandler,
  getPatrolRouteHandler,
  getPatrolScheduleHandler,
  createPatrolLogHandler,
} from "../controllers/patrol.controller.js";

const router = express.Router();

router.post(
  "/routes",
  protect,
  authorize("ADMIN", "OFFICER"),
  validate(patrolGenerateSchema),
  generatePatrolHandler
);
router.get("/routes", protect, listPatrolRoutesHandler);
router.get("/routes/:id", protect, validateParams(patrolIdParamSchema), getPatrolRouteHandler);
router.get("/schedule", protect, getPatrolScheduleHandler);
router.post("/logs", protect, authorize("ADMIN", "OFFICER"), validate(patrolLogSchema), createPatrolLogHandler);

export default router;
