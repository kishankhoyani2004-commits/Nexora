import express from "express";
import { applicationController } from "../controllers/applicationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Mounted at /api/applications

// ── Client: Get all applications for their jobs ──
router.get("/", protect, applicationController.getPendingApplications);

// ── Client: Accept an application ──
router.post("/:applicationId/accept", protect, applicationController.acceptApplication);

// ── Client: Reject an application ──
router.post("/:applicationId/reject", protect, applicationController.rejectApplication);

// ── Freelancer: Withdraw an application ──
router.post("/:applicationId/withdraw", protect, applicationController.withdrawApplication);

export default router;
