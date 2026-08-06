import express from "express";
import {
  getPlatformStats,
  listFreelancers,
  listCategories,
  getTestimonials,
  getTrendingSkills,
} from "../controllers/publicController.js";

const router = express.Router();

// Fully public marketing/discovery endpoints — no auth. Only ever expose
// aggregate counts or fields already listed as safe in publicController.js.
router.get("/stats", getPlatformStats);
router.get("/freelancers", listFreelancers);
router.get("/categories", listCategories);
router.get("/testimonials", getTestimonials);
router.get("/trending-skills", getTrendingSkills);

export default router;
