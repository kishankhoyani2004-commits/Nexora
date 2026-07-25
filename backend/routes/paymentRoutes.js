import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  createIntent,
  handleWebhook,
  listTransactions,
  getReleasableMilestones,
  releaseMilestonePaymentHandler,
  refundPaymentHandler,
  getReceipt,
} from "../controllers/paymentController.js";

const router = express.Router();

router.post("/intent", protect, createIntent);
router.post("/webhook", handleWebhook); // Stripe webhooks can be public (Stripe signs payload)
router.get("/history", protect, listTransactions);
router.get("/releasable-milestones", protect, getReleasableMilestones);
router.post("/milestones/:milestoneId/release", protect, releaseMilestonePaymentHandler);
router.post("/:earningId/refund", protect, refundPaymentHandler);
router.get("/:earningId/receipt", protect, getReceipt);

export default router;
