import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getFreelancerStats,
  getFreelancerActivity,
  getFreelancerAnalytics,
} from "../controllers/dashboardController.js";

const router = express.Router();

// Freelancer overview endpoints
router.get("/freelancer/stats",     protect, getFreelancerStats);
router.get("/freelancer/activity",  protect, getFreelancerActivity);
router.get("/freelancer/analytics", protect, getFreelancerAnalytics);

export default router;
