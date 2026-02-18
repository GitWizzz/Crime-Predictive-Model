import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { validate, validateQuery } from "../middlewares/validate.middleware.js";
import { iradIngestSchema, iradQuerySchema } from "../validators/irad.schema.js";
import {
  ingestIradHandler,
  listIradHandler,
  iradHotspotsHandler,
} from "../controllers/irad.controller.js";

const router = express.Router();

router.post("/ingest", protect, authorize("ADMIN", "OFFICER"), validate(iradIngestSchema), ingestIradHandler);
router.get("/", protect, validateQuery(iradQuerySchema), listIradHandler);
router.get("/hotspots", protect, validateQuery(iradQuerySchema), iradHotspotsHandler);

export default router;
