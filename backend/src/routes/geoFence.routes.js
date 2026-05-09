import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { validate, validateParams, validateQuery } from "../middlewares/validate.middleware.js";
import {
  createGeoFenceHandler,
  deleteGeoFenceHandler,
  listGeoFencesHandler,
  updateGeoFenceHandler,
} from "../controllers/geoFence.controller.js";
import {
  geoFenceCreateSchema,
  geoFenceIdParamSchema,
  geoFenceQuerySchema,
  geoFenceUpdateSchema,
} from "../validators/geoFence.schema.js";

const router = express.Router();

router.get("/", protect, validateQuery(geoFenceQuerySchema), listGeoFencesHandler);
router.post("/", protect, authorize("ADMIN"), validate(geoFenceCreateSchema), createGeoFenceHandler);
router.patch("/:id", protect, authorize("ADMIN"), validateParams(geoFenceIdParamSchema), validate(geoFenceUpdateSchema), updateGeoFenceHandler);
router.delete("/:id", protect, authorize("ADMIN"), validateParams(geoFenceIdParamSchema), deleteGeoFenceHandler);

export default router;
