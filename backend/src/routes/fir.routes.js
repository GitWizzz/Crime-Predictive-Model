import express from "express";
import { addFIR, getFIR, listFIRs, bulkAddFIRs, addCctnsFIR } from "../controllers/fir.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { validate, validateParams, validateQuery } from "../middlewares/validate.middleware.js";
import { createFIRSchema, bulkFIRSchema, cctnsFIRSchema, firIdParamSchema, firQuerySchema } from "../validators/fir.schema.js";

const router = express.Router();

router.post("/", protect, authorize("ADMIN", "OFFICER"), validate(createFIRSchema), addFIR);
router.post("/bulk", protect, authorize("ADMIN", "OFFICER"), validate(bulkFIRSchema), bulkAddFIRs);
router.post("/cctns", protect, authorize("ADMIN", "OFFICER"), validate(cctnsFIRSchema), addCctnsFIR);
router.get("/:id", protect, validateParams(firIdParamSchema), getFIR);
router.get("/", protect, validateQuery(firQuerySchema), listFIRs); 

export default router;
