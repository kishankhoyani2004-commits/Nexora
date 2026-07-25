import express from "express";
import { applicationController } from "../controllers/applicationController.js";
import { protect } from "../middleware/authMiddleware.js";

const router = express.Router();

// Mounted at /api/earnings

// ── Freelancer: Get all earnings ──
router.get("/", protect, applicationController.getFreelancerEarnings);

// ── Freelancer: Get earnings summary ──
router.get("/summary", protect, applicationController.getEarningsSummary);

// ── Freelancer: Get full Earnings Dashboard (stats + chart + recent + top clients) ──
router.get("/dashboard", protect, applicationController.getEarningsDashboard);

export default router;
