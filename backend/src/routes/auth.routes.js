import express from "express";
import { signup, login, getProfile } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";

const router = express.Router();

/**
 * NOTE:
 * In real police systems, signup is admin-only.
 * Kept open here for demo & evaluation.
 */
router.post("/signup", signup);
router.post("/login", login);
router.get("/profile", protect, getProfile);

export default router;
