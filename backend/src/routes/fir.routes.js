import express from "express";
import { addFIR, getFIR, listFIRs } from "../controllers/fir.controller.js";
import { protect, authorize } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/", protect, authorize("ADMIN", "OFFICER"), addFIR);
router.get("/:id", protect, getFIR);
router.get("/", protect, listFIRs); // Supports query params for filtering

export default router;
