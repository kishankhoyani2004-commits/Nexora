import Contract from "../models/Contract.js";
import Proposal from "../models/Proposal.js";
import Message from "../models/Message.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";

/**
 * GET /api/dashboard/freelancer/stats
 * Returns all KPI data needed for the freelancer overview dashboard.
 * Protected — requires valid JWT for a freelancer user.
 */
export const getFreelancerStats = async (req, res, next) => {
  try {
    const userId = req.user._id;

    // ── Parallel data fetch ──────────────────────────────────────────────────
    const [contracts, proposals, reviews, unreadMsgCount] = await Promise.all([
      Contract.find({ freelancer: userId }),
      Proposal.find({ freelancer: userId }),
      Review.find({ reviewee: userId }),
      Message.countDocuments({ recipient: userId, read: false }),
    ]);

    // ── Contract KPIs ────────────────────────────────────────────────────────
    const activeContracts  = contracts.filter((c) => c.status === "active");
    const completedContracts = contracts.filter((c) => c.status === "completed");

    const totalEarnings = completedContracts.reduce(
      (sum, c) => sum + (c.budget || 0),
      0
    );

    const inEscrow = activeContracts.reduce(
      (sum, c) => sum + (c.escrowStatus === "funded" ? c.budget || 0 : 0),
      0
    );

    // ── Proposal KPIs ────────────────────────────────────────────────────────
    const pendingProposals = proposals.filter(
      (p) => p.status === "submitted" || p.status === "shortlisted"
    ).length;

    const totalSentProposals = proposals.filter((p) => p.status !== "draft").length;
    const acceptedProposals  = proposals.filter((p) => p.status === "accepted").length;

    const acceptanceRate =
      totalSentProposals > 0
        ? Math.round((acceptedProposals / totalSentProposals) * 100)
        : 0;

    // ── Review / Rating KPIs ─────────────────────────────────────────────────
    const avgRating =
      reviews.length > 0
        ? parseFloat(
            (reviews.reduce((sum, r) => sum + r.rating, 0) / reviews.length).toFixed(1)
          )
        : 0;

    // Job success score: completed / (active + completed) * 100
    const successDenominator = activeContracts.length + completedContracts.length;
    const jobSuccessScore =
      successDenominator > 0
        ? Math.round((completedContracts.length / successDenominator) * 100)
        : 0;

    // ── Profile completion ────────────────────────────────────────────────────
    const user = req.user;
    let completionPoints = 0;
    if (user.fullName)              completionPoints += 15;
    if (user.avatar)                completionPoints += 10;
    if (user.bio)                   completionPoints += 15;
    if (user.skills?.length > 0)    completionPoints += 20;
    if (user.location)              completionPoints += 10;
    if (user.portfolio?.length > 0) completionPoints += 20;
    if (
      user.socialLinks?.linkedin ||
      user.socialLinks?.github ||
      user.socialLinks?.website
    )                               completionPoints += 10;

    const profileCompletion = Math.min(completionPoints, 100);

    // ── Repeat clients ───────────────────────────────────────────────────────
    const clientIds = contracts.map((c) => c.client?.toString());
    const uniqueClients = new Set(clientIds);
    const repeatClients = clientIds.length - uniqueClients.size;

    res.status(200).json({
      success: true,
      data: {
        activeProjects:      activeContracts.length,
        pendingProposals,
        unreadMessages:      unreadMsgCount,
        totalEarnings,
        inEscrow,
        profileCompletion,
        jobSuccessScore,
        totalContracts:      contracts.length,
        completedContracts:  completedContracts.length,
        avgRating,
        reviewCount:         reviews.length,
        acceptanceRate,
        repeatClients,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/freelancer/activity?page=1&limit=20&category=all
 * Returns a paginated activity timeline derived from real backend events.
 * Events are synthesised from: notifications, proposals, contracts, reviews, messages.
 */
export const getFreelancerActivity = async (req, res, next) => {
  try {
    const userId = req.user._id;
    const page     = Math.max(1, parseInt(req.query.page  || "1", 10));
    const limit    = Math.min(50, parseInt(req.query.limit || "20", 10));
    const category = req.query.category || "all"; // all | projects | payments | messages | ai | portfolio

    // ── Fetch all event sources in parallel ──────────────────────────────────
    const [proposals, contracts, reviews, notifications, recentMessages] =
      await Promise.all([
        Proposal.find({ freelancer: userId })
          .populate("job", "title")
          .sort({ updatedAt: -1 })
          .limit(50),
        Contract.find({ freelancer: userId })
          .populate("client", "fullName")
          .sort({ updatedAt: -1 })
          .limit(50),
        Review.find({ reviewee: userId })
          .populate("reviewer", "fullName")
          .sort({ createdAt: -1 })
          .limit(30),
        Notification.find({ recipient: userId })
          .sort({ createdAt: -1 })
          .limit(50),
        Message.find({ recipient: userId })
          .populate("sender", "fullName")
          .sort({ createdAt: -1 })
          .limit(20),
      ]);

    // ── Map each source into a unified activity item ─────────────────────────
    const events = [];

    // Proposals
    proposals.forEach((p) => {
      const jobTitle = p.job?.title || "a job";
      if (p.status === "submitted") {
        events.push({
          id:          `proposal-submitted-${p.id}`,
          type:        "proposal_submitted",
          category:    "projects",
          title:       "Proposal Submitted",
          description: `You submitted a proposal for "${jobTitle}"`,
          meta:        `Bid: ₹${p.bidAmount?.toLocaleString("en-IN") ?? "—"}`,
          createdAt:   p.createdAt,
        });
      } else if (p.status === "accepted") {
        events.push({
          id:          `proposal-accepted-${p.id}`,
          type:        "proposal_accepted",
          category:    "projects",
          title:       "Proposal Accepted 🎉",
          description: `Your proposal for "${jobTitle}" was accepted`,
          meta:        `Bid: ₹${p.bidAmount?.toLocaleString("en-IN") ?? "—"}`,
          createdAt:   p.updatedAt,
        });
      } else if (p.status === "rejected") {
        events.push({
          id:          `proposal-rejected-${p.id}`,
          type:        "proposal_rejected",
          category:    "projects",
          title:       "Proposal Declined",
          description: `Your proposal for "${jobTitle}" was not selected`,
          createdAt:   p.updatedAt,
        });
      } else if (p.status === "shortlisted") {
        events.push({
          id:          `proposal-shortlisted-${p.id}`,
          type:        "proposal_submitted",
          category:    "projects",
          title:       "Proposal Shortlisted ⭐",
          description: `You were shortlisted for "${jobTitle}"`,
          createdAt:   p.updatedAt,
        });
      }
    });

    // Contracts
    contracts.forEach((c) => {
      const clientName = c.client?.fullName || "a client";
      if (c.status === "active") {
        events.push({
          id:          `contract-started-${c.id}`,
          type:        "contract_started",
          category:    "projects",
          title:       "Project Started",
          description: `Contract "${c.title}" with ${clientName} is now active`,
          meta:        `Budget: ₹${c.budget?.toLocaleString("en-IN") ?? "—"}`,
          createdAt:   c.createdAt,
        });
      }
      if (c.status === "completed") {
        events.push({
          id:          `contract-completed-${c.id}`,
          type:        "contract_completed",
          category:    "projects",
          title:       "Project Completed ✅",
          description: `"${c.title}" has been marked as completed`,
          createdAt:   c.updatedAt,
        });
      }
      if (c.escrowStatus === "released") {
        events.push({
          id:          `payment-received-${c.id}`,
          type:        "payment_received",
          category:    "payments",
          title:       "Payment Released 💰",
          description: `₹${c.budget?.toLocaleString("en-IN") ?? "—"} released from escrow for "${c.title}"`,
          amount:      c.budget,
          meta:        `From: ${clientName}`,
          createdAt:   c.updatedAt,
        });
      }
    });

    // Reviews
    reviews.forEach((r) => {
      events.push({
        id:          `review-${r.id}`,
        type:        "review_received",
        category:    "projects",
        title:       "Review Received ⭐",
        description: `${r.reviewer?.fullName || "A client"} left you a ${r.rating}-star review`,
        meta:        r.comment ? `"${r.comment.slice(0, 80)}${r.comment.length > 80 ? "…" : ""}"` : undefined,
        createdAt:   r.createdAt,
      });
    });

    // Messages (recent unread as activity)
    recentMessages.forEach((m) => {
      events.push({
        id:          `message-${m.id}`,
        type:        "message_received",
        category:    "messages",
        title:       "New Message",
        description: `${m.sender?.fullName || "Someone"} sent you a message`,
        meta:        m.content.length > 80 ? `"${m.content.slice(0, 80)}…"` : `"${m.content}"`,
        createdAt:   m.createdAt,
      });
    });

    // Notifications (general — includes interview invitations etc.)
    notifications.forEach((n) => {
      events.push({
        id:          `notification-${n.id}`,
        type:        "notification",
        category:    "projects",
        title:       n.title,
        description: n.message,
        createdAt:   n.createdAt,
      });
    });

    // ── Sort by date descending ───────────────────────────────────────────────
    events.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // ── Category filter ───────────────────────────────────────────────────────
    const filtered =
      category === "all"
        ? events
        : events.filter((e) => e.category === category);

    // ── Paginate ──────────────────────────────────────────────────────────────
    const total      = filtered.length;
    const startIndex = (page - 1) * limit;
    const items      = filtered.slice(startIndex, startIndex + limit);
    const hasMore    = startIndex + limit < total;

    res.status(200).json({
      success: true,
      data: {
        items,
        total,
        page,
        pageSize: limit,
        hasMore,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/freelancer/analytics
 * Returns deeper analytics data: monthly earnings, proposal trends, skill usage.
 */
export const getFreelancerAnalytics = async (req, res, next) => {
  try {
    const userId = req.user._id;

    const [contracts, proposals, reviews] = await Promise.all([
      Contract.find({ freelancer: userId }).sort({ createdAt: 1 }),
      Proposal.find({ freelancer: userId }).populate("job", "skills title"),
      Review.find({ reviewee: userId }),
    ]);

    // ── Monthly earnings (last 6 months) ─────────────────────────────────────
    const now = new Date();
    const monthlyEarnings = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthContracts = contracts.filter((c) => {
        const updated = new Date(c.updatedAt);
        return (
          c.status === "completed" &&
          updated >= d &&
          updated < nextD
        );
      });
      const earned = monthContracts.reduce((s, c) => s + (c.budget || 0), 0);
      monthlyEarnings.push({
        month: d.toLocaleString("en-US", { month: "short" }),
        year:  d.getFullYear(),
        amount: earned,
        contracts: monthContracts.length,
      });
    }

    // ── Proposal status breakdown ─────────────────────────────────────────────
    const proposalBreakdown = {
      submitted:   proposals.filter((p) => p.status === "submitted").length,
      shortlisted: proposals.filter((p) => p.status === "shortlisted").length,
      accepted:    proposals.filter((p) => p.status === "accepted").length,
      rejected:    proposals.filter((p) => p.status === "rejected").length,
      draft:       proposals.filter((p) => p.status === "draft").length,
    };

    // ── Skill frequency ───────────────────────────────────────────────────────
    const skillMap = {};
    proposals.forEach((p) => {
      const skills = p.job?.skills || [];
      skills.forEach((s) => {
        skillMap[s] = (skillMap[s] || 0) + 1;
      });
    });
    const topSkills = Object.entries(skillMap)
      .map(([skill, count]) => ({ skill, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 8);

    // ── Monthly proposal activity (last 6 months) ─────────────────────────────
    const monthlyProposals = [];
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthProps = proposals.filter((p) => {
        const created = new Date(p.createdAt);
        return created >= d && created < nextD;
      });
      monthlyProposals.push({
        month: d.toLocaleString("en-US", { month: "short" }),
        total:    monthProps.length,
        accepted: monthProps.filter((p) => p.status === "accepted").length,
      });
    }

    // ── Client growth (unique clients per month) ──────────────────────────────
    const clientGrowth = [];
    const seenClients = new Set();
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const nextD = new Date(now.getFullYear(), now.getMonth() - i + 1, 1);
      const monthContracts = contracts.filter((c) => {
        const created = new Date(c.createdAt);
        return created >= d && created < nextD;
      });
      monthContracts.forEach((c) => seenClients.add(c.client?.toString()));
      clientGrowth.push({
        month: d.toLocaleString("en-US", { month: "short" }),
        total: seenClients.size,
        new:   monthContracts.length,
      });
    }

    // ── Rating breakdown ──────────────────────────────────────────────────────
    const avgRating =
      reviews.length > 0
        ? parseFloat(
            (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
          )
        : 0;

    const ratingDist = [5, 4, 3, 2, 1].map((star) => ({
      star,
      count: reviews.filter((r) => r.rating === star).length,
    }));

    // ── Goals (targets are configurable; using sensible defaults) ────────────
    const totalEarnings = contracts
      .filter((c) => c.status === "completed")
      .reduce((s, c) => s + (c.budget || 0), 0);

    const totalSent     = proposals.filter((p) => p.status !== "draft").length;
    const totalAccepted = proposals.filter((p) => p.status === "accepted").length;

    const user = req.user;
    let completionPoints = 0;
    if (user.fullName)              completionPoints += 15;
    if (user.avatar)                completionPoints += 10;
    if (user.bio)                   completionPoints += 15;
    if (user.skills?.length > 0)    completionPoints += 20;
    if (user.location)              completionPoints += 10;
    if (user.portfolio?.length > 0) completionPoints += 20;
    if (
      user.socialLinks?.linkedin ||
      user.socialLinks?.github ||
      user.socialLinks?.website
    )                               completionPoints += 10;

    res.status(200).json({
      success: true,
      data: {
        monthlyEarnings,
        monthlyProposals,
        proposalBreakdown,
        clientGrowth,
        topSkills,
        ratingDist,
        avgRating,
        reviewCount:        reviews.length,
        totalEarnings,
        totalContracts:     contracts.length,
        completedContracts: contracts.filter((c) => c.status === "completed").length,
        totalProposals:     totalSent,
        acceptedProposals:  totalAccepted,
        acceptanceRate:
          totalSent > 0 ? Math.round((totalAccepted / totalSent) * 100) : 0,
        profileCompletion: Math.min(completionPoints, 100),
      },
    });
  } catch (error) {
    next(error);
  }
};
