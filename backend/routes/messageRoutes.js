import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { listConversations, listMessages, send } from "../controllers/messageController.js";

const router = express.Router();

router.get("/conversations", protect, listConversations);
router.get("/conversations/:conversationId", protect, listMessages);
router.post("/conversations/:conversationId", protect, send);

export default router;
