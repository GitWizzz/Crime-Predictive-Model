import express from "express";
import {
  listClassificationsHandler,
  lookupClassificationHandler,
  createClassificationHandler,
} from "../controllers/classification.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { validate, validateQuery } from "../middlewares/validate.middleware.js";
import {
  createClassificationSchema,
  lookupClassificationSchema,
} from "../validators/classification.schema.js";

const router = express.Router();

router.get("/", protect, listClassificationsHandler);
router.get("/lookup", protect, validateQuery(lookupClassificationSchema), lookupClassificationHandler);
router.post(
  "/",
  protect,
  authorize("ADMIN"),
  validate(createClassificationSchema),
  createClassificationHandler
);

export default router;
