import express from "express";
import { getHotspots } from "../controllers/hotspot.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * @route   GET /api/hotspots
 * @desc    Get crime hotspots using DBSCAN clustering
 * @access  Protected
 */
router.get("/", protect, getHotspots);

export default router;
