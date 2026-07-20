import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createReview, listReviewsForUser } from "../controllers/reviewController.js";

const router = express.Router();

router.post("/", protect, createReview);
router.get("/user/:userId", listReviewsForUser);

export default router;
