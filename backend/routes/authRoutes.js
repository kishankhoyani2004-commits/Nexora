import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  register,
  verifyEmail,
  resendVerificationCode,
  login,
  refreshToken,
  forgotPassword,
  resetPassword,
  logout,
  getMe,
  firebaseRegister,
  firebaseLogin,
  checkEmail,
  assignRole,
} from "../controllers/authController.js";
import {
  validate,
  registerRules,
  loginRules,
  forgotPasswordRules,
  resetPasswordRules,
} from "../validators/authValidator.js";

const router = express.Router();

router.post("/register", registerRules, validate, register);
router.post("/verify-email", verifyEmail);
router.post("/resend-code", resendVerificationCode);
router.post("/login", loginRules, validate, login);
router.post("/refresh-token", refreshToken);
router.post("/forgot-password", forgotPasswordRules, validate, forgotPassword);
router.post("/reset-password", resetPasswordRules, validate, resetPassword);
router.post("/logout", logout);
router.get("/me", protect, getMe);
router.post("/check-email", checkEmail);
router.patch("/assign-role", protect, assignRole);

// Firebase / OAuth (Google + GitHub via Firebase SDK on the frontend)
router.post("/firebase-register", firebaseRegister);
router.post("/firebase-login", firebaseLogin);

export default router;
