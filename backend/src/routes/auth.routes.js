import express from "express";
import { signup, login, getProfile } from "../controllers/auth.controller.js";
import { protect } from "../middlewares/auth.middleware.js";
import { validate } from "../middlewares/validate.middleware.js";
import { signupSchema, loginSchema } from "../validators/auth.schema.js";

const router = express.Router();


router.post("/signup", validate(signupSchema), signup);
router.post("/login", validate(loginSchema), login);
router.get("/profile", protect, getProfile);

export default router;
