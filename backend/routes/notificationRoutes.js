import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { list, markAsRead, markAllAsRead } from "../controllers/notificationController.js";

const router = express.Router();

router.get("/", protect, list);
router.post("/:id/read", protect, markAsRead);
router.post("/read-all", protect, markAllAsRead);

export default router;
