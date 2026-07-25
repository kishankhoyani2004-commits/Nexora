import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getSettings,
  updateNotificationPreferences,
  updatePrivacySettings,
  updatePreferences,
  changePassword,
  getLoginActivity,
  getActiveSessions,
  logoutSession,
  logoutAllDevices,
  connectOAuthAccount,
  disconnectOAuthAccount,
  scheduleAccountDeletion,
  cancelAccountDeletion,
  submitFeedback,
  getSupportTickets,
} from "../controllers/settingsController.js";

const router = express.Router();

// All routes require authentication
router.use(protect);

// Settings retrieval
router.get("/", getSettings);
router.get("/tickets", getSupportTickets);

// Notification preferences
router.patch("/notifications", updateNotificationPreferences);

// Privacy settings
router.patch("/privacy", updatePrivacySettings);

// Theme / language preferences
router.patch("/preferences", updatePreferences);

// Password management
router.post("/change-password", changePassword);

// Login activity & sessions
router.get("/login-activity", getLoginActivity);
router.get("/sessions", getActiveSessions);
router.post("/sessions/logout", logoutSession);
router.post("/sessions/logout-all", logoutAllDevices);

// OAuth accounts
router.post("/oauth/connect", connectOAuthAccount);
router.post("/oauth/disconnect", disconnectOAuthAccount);

// Account deletion
router.post("/account/schedule-deletion", scheduleAccountDeletion);
router.post("/account/cancel-deletion", cancelAccountDeletion);

// Support & feedback
router.post("/feedback", submitFeedback);

export default router;
