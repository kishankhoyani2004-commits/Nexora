import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { list, unreadCount, markAsRead, markAllAsRead } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protect, list);
router.get("/unread-count", protect, unreadCount);
router.post("/:id/read", protect, markAsRead);
router.post("/read-all", protect, markAllAsRead);

export default router;
