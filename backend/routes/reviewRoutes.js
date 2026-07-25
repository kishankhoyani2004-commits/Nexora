import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createReview,
  updateReview,
  listReviewsForUser,
  getMyReviews,
  getReviewableContracts,
} from "../controllers/reviewController.js";

const router = express.Router();

// Specific paths ("/mine", "/reviewable") must be registered before the
// "/user/:userId" wildcard so they aren't swallowed by it.
router.get("/mine", protect, getMyReviews);
router.get("/reviewable", protect, getReviewableContracts);
router.get("/user/:userId", listReviewsForUser);
router.post("/", protect, createReview);
router.patch("/:id", protect, updateReview);

export default router;
