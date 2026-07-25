import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createWithdrawal, getWithdrawals, getBalance } from "../controllers/withdrawalController.js";

const router = express.Router();

router.post("/", protect, createWithdrawal);
router.get("/", protect, getWithdrawals);
router.get("/balance", protect, getBalance);

export default router;
