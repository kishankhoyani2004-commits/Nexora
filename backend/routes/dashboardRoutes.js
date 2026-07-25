import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  getFreelancerStats,
  getFreelancerActivity,
  getFreelancerAnalytics,
  getClientStats,
  getClientActivity,
  getClientAnalytics,
} from "../controllers/dashboardController.js";

const router = express.Router();

// ── Freelancer overview endpoints ────────────────────────────────────────────
router.get("/freelancer/stats",     protect, authorize("freelancer", "admin"), getFreelancerStats);
router.get("/freelancer/activity",  protect, authorize("freelancer", "admin"), getFreelancerActivity);
router.get("/freelancer/analytics", protect, authorize("freelancer", "admin"), getFreelancerAnalytics);

// ── Client overview endpoints ────────────────────────────────────────────────
router.get("/client/stats",    protect, authorize("client", "admin"), getClientStats);
router.get("/client/activity", protect, authorize("client", "admin"), getClientActivity);
router.get("/client/analytics", protect, authorize("client", "admin"), getClientAnalytics);

export default router;
