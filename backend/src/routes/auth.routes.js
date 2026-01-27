import express from "express";
import { signup, login } from "../controllers/auth.controller.js";

const router = express.Router();

/**
 * NOTE:
 * In real police systems, signup is admin-only.
 * Kept open here for demo & evaluation.
 */
router.post("/signup", signup);
router.post("/login", login);

export default router;
