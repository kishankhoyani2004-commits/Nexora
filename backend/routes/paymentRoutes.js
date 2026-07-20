import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createIntent, handleWebhook, listTransactions } from "../controllers/paymentController.js";

const router = express.Router();

router.post("/intent", protect, createIntent);
router.post("/webhook", handleWebhook); // Stripe webhooks can be public (Stripe signs payload)
router.get("/history", protect, listTransactions);

export default router;
