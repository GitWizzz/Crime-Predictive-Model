import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { validateQuery } from "../middlewares/validate.middleware.js";
import { listAuditLogsHandler } from "../controllers/audit.controller.js";
import { auditQuerySchema } from "../validators/audit.schema.js";

const router = express.Router();

router.get("/", protect, authorize("ADMIN"), validateQuery(auditQuerySchema), listAuditLogsHandler);

export default router;
