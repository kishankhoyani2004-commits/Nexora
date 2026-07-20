import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { getUserProfile, updateUserProfile } from "../controllers/userController.js";

const router = express.Router();

// Forward profiles requests to user controller actions
router.get("/freelancers/:id", protect, getUserProfile);
router.patch("/freelancers/:id", protect, updateUserProfile);

export default router;
