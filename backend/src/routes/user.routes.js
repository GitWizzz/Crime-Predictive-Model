import express from "express";
import { protect, authorize } from "../middlewares/auth.middleware.js";
import { validate, validateParams, validateQuery } from "../middlewares/validate.middleware.js";
import {
  getCurrentUserHandler,
  updateCurrentUserFcmTokenHandler,
  listUsersHandler,
  updateUserHandler,
  deleteUserHandler,
  resetPasswordHandler,
} from "../controllers/user.controller.js";
import {
  fcmTokenSchema,
  userIdParamSchema,
  userListQuerySchema,
  updateUserSchema,
} from "../validators/user.schema.js";

const router = express.Router();

router.get("/me", protect, getCurrentUserHandler);
router.patch("/me/fcm-token", protect, validate(fcmTokenSchema), updateCurrentUserFcmTokenHandler);
router.get("/", protect, authorize("ADMIN"), validateQuery(userListQuerySchema), listUsersHandler);
router.patch("/:id", protect, authorize("ADMIN"), validateParams(userIdParamSchema), validate(updateUserSchema), updateUserHandler);
router.delete("/:id", protect, authorize("ADMIN"), validateParams(userIdParamSchema), deleteUserHandler);
router.post("/:id/reset-password", protect, authorize("ADMIN"), validateParams(userIdParamSchema), resetPasswordHandler);

export default router;
