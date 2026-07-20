import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { getUserProfile, updateUserProfile, uploadAvatar } from "../controllers/userController.js";

const router = express.Router();

router.get("/:id", protect, getUserProfile);
router.patch("/:id", protect, updateUserProfile);
router.post("/:id/avatar", protect, upload.single("avatar"), uploadAvatar);

export default router;
