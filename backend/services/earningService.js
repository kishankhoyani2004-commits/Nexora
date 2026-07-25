import mongoose from "mongoose";
import Earning from "../models/Earning.js";
import Withdrawal from "../models/Withdrawal.js";

export const earningService = {
  // Create earning for a freelancer
  create: async (earningData) => {
    const earning = new Earning(earningData);
    return await earning.save();
  },

  // Get all earnings for a freelancer
  getByFreelancer: async (freelancerId) => {
    return await Earning.find({ freelancer: freelancerId })
      .populate("contract")
      .populate("job", "title budget")
      .populate("client", "fullName avatar")
      .sort({ createdAt: -1 });
  },

  // Get earnings by status
  getByFreelancerAndStatus: async (freelancerId, status) => {
    return await Earning.find({ freelancer: freelancerId, status })
      .populate("contract")
      .populate("job", "title budget")
      .populate("client", "fullName avatar")
      .sort({ createdAt: -1 });
  },

  // Get earning by contract
  getByContract: async (contractId) => {
    return await Earning.findOne({ contract: contractId })
      .populate("freelancer", "fullName avatar")
      .populate("job", "title budget")
      .populate("client", "fullName avatar");
  },

  // Update earning status
  updateStatus: async (earningId, status) => {
    return await Earning.findByIdAndUpdate(
      earningId,
      { status },
      { new: true }
    ).populate("contract").populate("job", "title budget");
  },

  // Get summary for freelancer
  getSummary: async (freelancerId) => {
    const earnings = await Earning.find({ freelancer: freelancerId });

    return {
      total: earnings.reduce((sum, e) => sum + e.amount, 0),
      pending: earnings
        .filter(e => e.status === "pending")
        .reduce((sum, e) => sum + e.amount, 0),
      inEscrow: earnings
        .filter(e => e.status === "in_escrow")
        .reduce((sum, e) => sum + e.amount, 0),
      released: earnings
        .filter(e => e.status === "released")
        .reduce((sum, e) => sum + e.amount, 0),
      count: earnings.length,
    };
  },

  // Delete earning
  delete: async (earningId) => {
    return await Earning.findByIdAndDelete(earningId);
  },

  // ── Full Earnings Dashboard payload (freelancer) ──────────────────────────
  getDashboard: async (freelancerId) => {
    const freelancerObjId = new mongoose.Types.ObjectId(freelancerId);

    const [earnings, completedWithdrawals] = await Promise.all([
      Earning.find({ freelancer: freelancerId })
        .populate("client", "fullName companyName avatar")
        .populate("job", "title")
        .populate("contract", "title")
        .sort({ createdAt: -1 }),
      Withdrawal.aggregate([
        { $match: { freelancer: freelancerObjId, status: { $in: ["pending", "processing", "completed"] } } },
        { $group: { _id: null, total: { $sum: "$amount" } } },
      ]),
    ]);

    const totalEarnings = earnings.reduce((s, e) => s + e.amount, 0);
    const pendingClearance = earnings.filter((e) => ["pending", "in_escrow"].includes(e.status)).reduce((s, e) => s + e.amount, 0);
    const releasedEarnings = earnings.filter((e) => ["released", "withdrawn"].includes(e.status));
    const lifetimeEarnings = releasedEarnings.reduce((s, e) => s + e.amount, 0);
    const withdrawnAmount = completedWithdrawals[0]?.total || 0;
    const availableBalance = Math.max(0, lifetimeEarnings - withdrawnAmount);

    const now = new Date();
    const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

    const inRange = (date, start, end) => date >= start && date < end;
    const dateOf = (e) => new Date(e.paidAt || e.updatedAt);

    const thisMonthEarnings = releasedEarnings
      .filter((e) => inRange(dateOf(e), thisMonthStart, now))
      .reduce((s, e) => s + e.amount, 0);
    const lastMonthEarnings = releasedEarnings
      .filter((e) => inRange(dateOf(e), lastMonthStart, thisMonthStart))
      .reduce((s, e) => s + e.amount, 0);

    // Earnings by month — last 6 calendar months.
    const earningsByMonth = [];
    for (let i = 5; i >= 0; i--) {
      const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const amount = releasedEarnings.filter((e) => inRange(dateOf(e), start, end)).reduce((s, e) => s + e.amount, 0);
      earningsByMonth.push({ month: start.toLocaleDateString("en-US", { month: "short" }), year: start.getFullYear(), amount });
    }

    const recentPayments = releasedEarnings.slice(0, 6).map((e) => ({
      id: e._id.toString(),
      projectTitle: e.contract?.title || e.job?.title || "Untitled Project",
      clientName: e.client?.companyName || e.client?.fullName || "Unknown",
      amount: e.amount,
      status: e.status,
      date: (e.paidAt || e.updatedAt).toISOString(),
    }));

    // Top paying clients — aggregated across all released/withdrawn earnings.
    const clientTotals = new Map();
    releasedEarnings.forEach((e) => {
      const key = e.client?._id?.toString();
      if (!key) return;
      if (!clientTotals.has(key)) {
        clientTotals.set(key, {
          clientId: key,
          name: e.client?.companyName || e.client?.fullName || "Unknown",
          avatar: e.client?.avatar || "",
          total: 0,
          projectCount: 0,
        });
      }
      const entry = clientTotals.get(key);
      entry.total += e.amount;
      entry.projectCount += 1;
    });
    const topPayingClients = [...clientTotals.values()].sort((a, b) => b.total - a.total).slice(0, 5);

    return {
      totalEarnings,
      availableBalance,
      pendingClearance,
      withdrawnAmount,
      thisMonthEarnings,
      lastMonthEarnings,
      lifetimeEarnings,
      earningsByMonth,
      recentPayments,
      topPayingClients,
    };
  },
};
