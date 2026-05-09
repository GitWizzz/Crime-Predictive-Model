import express from "express";
import { signup, login, refresh, logout, getProfile } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { signupSchema, loginSchema, refreshSchema } from "../validators/auth.schema.js";

const router = express.Router();


router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.post("/refresh", validate(refreshSchema), refresh);
router.post("/logout", protect, logout);
router.get("/profile", protect, getProfile);

export default router;
