import { requestWithdrawal, listWithdrawals, getAvailableBalance } from "../services/withdrawalService.js";
import { notifyUser } from "../services/notificationService.js";

// POST /api/withdrawals
export const createWithdrawal = async (req, res, next) => {
  try {
    if (req.user.role !== "freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can request withdrawals." });
    }

    const { amount, method, destination } = req.body;
    const withdrawal = await requestWithdrawal({
      freelancerId: req.user._id,
      amount: Number(amount),
      method,
      destination,
    });

    await notifyUser({
      io: req.app.get("io"),
      recipient: req.user._id,
      title: "Withdrawal requested",
      message: `Your withdrawal of ₹${Number(amount).toLocaleString("en-IN")} is being processed.`,
      type: "payment",
      link: "/freelancer/earnings?tab=withdraw",
    });

    res.status(201).json({ success: true, data: withdrawal, message: "Withdrawal request submitted." });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
};

// GET /api/withdrawals
export const getWithdrawals = async (req, res, next) => {
  try {
    if (req.user.role !== "freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can view withdrawals." });
    }
    const withdrawals = await listWithdrawals(req.user._id);
    res.status(200).json({ success: true, data: withdrawals });
  } catch (error) {
    next(error);
  }
};

// GET /api/withdrawals/balance
export const getBalance = async (req, res, next) => {
  try {
    if (req.user.role !== "freelancer") {
      return res.status(403).json({ success: false, message: "Only freelancers can view balance." });
    }
    const available = await getAvailableBalance(req.user._id);
    res.status(200).json({ success: true, data: { available } });
  } catch (error) {
    next(error);
  }
};
