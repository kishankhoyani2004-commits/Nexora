import Contract from "../models/Contract.js";
import Proposal from "../models/Proposal.js";
import Message from "../models/Message.js";
import Review from "../models/Review.js";
import Notification from "../models/Notification.js";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Earning from "../models/Earning.js";

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

/**
 * GET /api/dashboard/client/stats
 * Returns all KPI data needed for the client overview dashboard.
 * Protected — requires valid JWT for a client user.
 */
export const getClientStats = async (req, res, next) => {
  try {
    const clientId = req.user._id;

    // ── Parallel data fetch ──────────────────────────────────────────────────
    const [jobs, contracts, unreadMsgCount, recentNotifications] = await Promise.all([
      Job.find({ client: clientId }),
      Contract.find({ client: clientId }).populate("freelancer", "fullName avatar"),
      Message.countDocuments({ recipient: clientId, read: false }),
      Notification.find({ recipient: clientId })
        .sort({ createdAt: -1 })
        .limit(10),
    ]);

    // ── Job KPIs ─────────────────────────────────────────────────────────────
    const draftJobs     = jobs.filter((j) => j.status === "draft").length;
    const openJobs      = jobs.filter((j) => j.status === "open").length;
    const inProgressJobs= jobs.filter((j) => j.status === "in_progress").length;
    const completedJobs = jobs.filter((j) => j.status === "completed").length;
    const closedJobs    = jobs.filter((j) => j.status === "closed").length;

    const totalProposals = jobs.reduce((sum, j) => sum + (j.proposalsCount || 0), 0);

    // ── Contract KPIs ─────────────────────────────────────────────────────────
    const activeContracts    = contracts.filter((c) => c.status === "active");
    const completedContracts = contracts.filter((c) => c.status === "completed");

    const totalSpending = completedContracts.reduce(
      (sum, c) => sum + (c.budget || 0),
      0
    );

    const activeSpending = activeContracts.reduce(
      (sum, c) => sum + (c.escrowStatus === "funded" ? c.budget || 0 : 0),
      0
    );

    // ── Hires (unique freelancers ever contracted) ────────────────────────────
    const totalHires = new Set(contracts.map((c) => c.freelancer?.toString())).size;

    // ── Recently posted jobs ──────────────────────────────────────────────────
    const recentJobs = await Job.find({ client: clientId })
      .sort({ createdAt: -1 })
      .limit(5)
      .select("title category status proposalsCount budgetMin priceType createdAt");

    // ── Recent activity (from notifications) ─────────────────────────────────
    const recentActivity = recentNotifications.map((n) => ({
      id:          n._id.toString(),
      title:       n.title,
      description: n.message,
      createdAt:   n.createdAt,
      read:        n.read,
    }));

    res.status(200).json({
      success: true,
      data: {
        // Job counts
        draftJobs,
        openJobs,
        inProgressJobs,
        completedJobs,
        closedJobs,
        totalJobs: jobs.length,

        // Proposal & contract counts
        totalProposals,
        activeProjects:      activeContracts.length,
        completedProjects:   completedContracts.length,

        // Financials
        totalSpending,
        activeSpending,

        // Hires & tenure — used by the Client Company Profile dashboard preview
        totalHires,
        memberSince: req.user.createdAt,

        // Messaging
        unreadMessages: unreadMsgCount,

        // Recent data
        recentJobs,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/client/activity?page=1&limit=20
 * Returns a paginated activity timeline for the client.
 */
export const getClientActivity = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const page     = Math.max(1, parseInt(req.query.page  || "1", 10));
    const limit    = Math.min(50, parseInt(req.query.limit || "20", 10));
    const category = req.query.category || "all"; // all | projects | payments | messages | ai

    const [jobs, contracts, notifications, recentMessages] = await Promise.all([
      Job.find({ client: clientId }).sort({ updatedAt: -1 }).limit(20),
      Contract.find({ client: clientId })
        .populate("freelancer", "fullName")
        .sort({ updatedAt: -1 })
        .limit(20),
      Notification.find({ recipient: clientId })
        .sort({ createdAt: -1 })
        .limit(30),
      Message.find({ recipient: clientId })
        .populate("sender", "fullName")
        .sort({ createdAt: -1 })
        .limit(15),
    ]);

    const events = [];

    // Job events — category aligned to "projects" so these actually show up
    // under the Projects tab (was "jobs", which no frontend filter matches).
    jobs.forEach((j) => {
      events.push({
        id:          `job-${j.id}`,
        type:        "job_posted",
        category:    "projects",
        title:       j.status === "draft" ? "Job Saved as Draft" : "Job Posted",
        description: `"${j.title}" — ${j.status.replace("_", " ")}`,
        createdAt:   j.createdAt,
      });
    });

    // Contract events
    contracts.forEach((c) => {
      const name = c.freelancer?.fullName || "A freelancer";
      if (c.status === "active") {
        events.push({
          id:          `contract-active-${c.id}`,
          type:        "contract_started",
          category:    "projects",
          title:       "Contract Started",
          description: `${name} started working on "${c.title}"`,
          createdAt:   c.createdAt,
        });
      }
      if (c.status === "completed") {
        events.push({
          id:          `contract-completed-${c.id}`,
          type:        "contract_completed",
          category:    "projects",
          title:       "Project Completed ✅",
          description: `"${c.title}" marked as completed`,
          createdAt:   c.updatedAt,
        });
      }
      // Payment/escrow events — the client feed previously had no source for
      // the "Payments" tab at all, so it was permanently empty.
      if (c.escrowStatus === "released") {
        events.push({
          id:          `payment-released-${c.id}`,
          type:        "payment_released",
          category:    "payments",
          title:       "Payment Released 💰",
          description: `₹${c.budget?.toLocaleString("en-IN") ?? "—"} released from escrow to ${name} for "${c.title}"`,
          amount:      c.budget,
          meta:        `To: ${name}`,
          createdAt:   c.updatedAt,
        });
      } else if (c.escrowStatus === "funded") {
        events.push({
          id:          `payment-funded-${c.id}`,
          type:        "payment_released",
          category:    "payments",
          title:       "Escrow Funded",
          description: `₹${c.budget?.toLocaleString("en-IN") ?? "—"} placed in escrow for "${c.title}"`,
          amount:      c.budget,
          createdAt:   c.updatedAt,
        });
      }
    });

    // Messages
    recentMessages.forEach((m) => {
      events.push({
        id:          `msg-${m.id}`,
        type:        "message_received",
        category:    "messages",
        title:       "New Message",
        description: `${m.sender?.fullName || "Someone"} sent you a message`,
        createdAt:   m.createdAt,
      });
    });

    // Notifications — category aligned to "projects" (was "general", which
    // no frontend filter matches, so these only ever showed under "All").
    notifications.forEach((n) => {
      events.push({
        id:          `notif-${n.id}`,
        type:        "notification",
        category:    "projects",
        title:       n.title,
        description: n.message,
        createdAt:   n.createdAt,
      });
    });

    events.sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );

    // ── Category filter — this was previously missing entirely, so every
    // tab (Projects/Payments/Messages/AI) silently showed the same
    // unfiltered "All" list regardless of which one was selected.
    const filteredEvents =
      category === "all" ? events : events.filter((e) => e.category === category);

    const total      = filteredEvents.length;
    const startIndex = (page - 1) * limit;
    const items      = filteredEvents.slice(startIndex, startIndex + limit);
    const hasMore    = startIndex + limit < total;

    res.status(200).json({
      success: true,
      data: { items, total, page, pageSize: limit, hasMore },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/dashboard/client/analytics?range=today|7d|30d|12m|custom&from=&to=
 * The full Client Analytics Dashboard payload — stats, trend charts, and
 * breakdowns, all computed live from Job/Proposal/Contract/Earning/Review so
 * the page never needs mock data. `range` scopes every event-based figure
 * (jobs posted, proposals, spending, trend charts); "Active Projects" /
 * "Completed Projects" / status distribution / freelancer performance stay
 * as current-state snapshots regardless of range, since those describe
 * "right now", not "what happened in this window".
 */
const resolveAnalyticsRange = (query) => {
  const now = new Date();
  let from;
  let to = now;
  const preset = query.range || "12m";

  switch (preset) {
    case "today":
      from = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      break;
    case "7d":
      from = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      break;
    case "30d":
      from = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      break;
    case "custom":
      from = query.from ? new Date(query.from) : new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      to = query.to ? new Date(query.to) : now;
      break;
    case "12m":
    default:
      from = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
      break;
  }

  return { from, to, preset };
};

// Adaptive bucketing: day-by-day for short windows (so "Today"/"7d" don't
// collapse into one bar), month-by-month for longer ones.
const buildBuckets = (from, to) => {
  const spanDays = Math.max(1, (to - from) / (1000 * 60 * 60 * 24));
  const granularity = spanDays <= 31 ? "day" : "month";
  const buckets = [];

  if (granularity === "day") {
    const cursor = new Date(from.getFullYear(), from.getMonth(), from.getDate());
    while (cursor <= to) {
      const start = new Date(cursor);
      const end = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate() + 1);
      buckets.push({ label: start.toLocaleDateString("en-US", { month: "short", day: "numeric" }), start, end });
      cursor.setDate(cursor.getDate() + 1);
    }
  } else {
    const cursor = new Date(from.getFullYear(), from.getMonth(), 1);
    while (cursor <= to) {
      const start = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
      const end = new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1);
      buckets.push({ label: start.toLocaleDateString("en-US", { month: "short" }), start, end });
      cursor.setMonth(cursor.getMonth() + 1);
    }
  }

  return buckets;
};

const inBucket = (date, bucket) => date >= bucket.start && date < bucket.end;

export const getClientAnalytics = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const { from, to, preset } = resolveAnalyticsRange(req.query);
    const buckets = buildBuckets(from, to);

    const [allJobs, allContracts, allEarnings] = await Promise.all([
      Job.find({ client: clientId }),
      Contract.find({ client: clientId }).populate("freelancer", "fullName avatar rating reviewCount").populate("job", "category"),
      Earning.find({ client: clientId }),
    ]);

    const jobIds = allJobs.map((j) => j._id);
    const allProposals = jobIds.length > 0 ? await Proposal.find({ job: { $in: jobIds } }) : [];

    const jobsInRange = allJobs.filter((j) => j.createdAt >= from && j.createdAt <= to);
    const contractsInRange = allContracts.filter((c) => c.createdAt >= from && c.createdAt <= to);
    const proposalsInRange = allProposals.filter((p) => p.createdAt >= from && p.createdAt <= to);
    const releasedEarningsInRange = allEarnings.filter(
      (e) => e.status === "released" && (e.paidAt || e.updatedAt) >= from && (e.paidAt || e.updatedAt) <= to
    );

    // ── Top-level stats ────────────────────────────────────────────────────
    const activeProjects = allContracts.filter((c) => c.status === "active").length;
    const completedProjects = allContracts.filter((c) => c.status === "completed").length;
    const totalProposalsReceived = proposalsInRange.length;
    const acceptedProposals = proposalsInRange.filter((p) => p.status === "accepted").length;
    const consideredProposals = proposalsInRange.filter((p) => p.status !== "draft").length;
    const acceptanceRate = consideredProposals > 0 ? Math.round((acceptedProposals / consideredProposals) * 100) : 0;
    const totalSpending = releasedEarningsInRange.reduce((sum, e) => sum + e.amount, 0);

    const completionDenominator = allContracts.filter((c) => ["active", "completed", "cancelled", "disputed"].includes(c.status)).length;
    const completionRate = completionDenominator > 0 ? Math.round((completedProjects / completionDenominator) * 100) : 0;

    // ── Time-series charts (adaptive day/month buckets) ────────────────────
    const monthlySpending = buckets.map((b) => ({
      label: b.label,
      amount: releasedEarningsInRange.filter((e) => inBucket(e.paidAt || e.updatedAt, b)).reduce((s, e) => s + e.amount, 0),
    }));

    const jobPostingTrends = buckets.map((b) => ({
      label: b.label,
      count: jobsInRange.filter((j) => inBucket(j.createdAt, b)).length,
    }));

    const proposalAnalytics = buckets.map((b) => {
      const bucketProposals = proposalsInRange.filter((p) => inBucket(p.createdAt, b));
      return {
        label: b.label,
        received: bucketProposals.length,
        accepted: bucketProposals.filter((p) => p.status === "accepted").length,
      };
    });

    // Serves both the "Hiring Trends" chart and the "Monthly Hiring Report" table.
    const hiringReport = buckets.map((b) => {
      const bucketJobs = jobsInRange.filter((j) => inBucket(j.createdAt, b));
      const bucketHires = contractsInRange.filter((c) => inBucket(c.createdAt, b));
      const avgBudget = bucketHires.length > 0 ? Math.round(bucketHires.reduce((s, c) => s + c.budget, 0) / bucketHires.length) : 0;
      return { label: b.label, jobsPosted: bucketJobs.length, hiresMade: bucketHires.length, avgBudget };
    });

    // ── Snapshots (not range-scoped) ────────────────────────────────────────
    const statusCounts = {};
    allContracts.forEach((c) => { statusCounts[c.status] = (statusCounts[c.status] || 0) + 1; });
    const projectStatusDistribution = Object.entries(statusCounts).map(([status, count]) => ({ status, count }));

    const categoryTotals = new Map();
    allContracts.forEach((c) => {
      const category = c.job?.category || "Uncategorized";
      categoryTotals.set(category, (categoryTotals.get(category) || 0) + c.budget);
    });
    const topCategories = [...categoryTotals.entries()]
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
      .slice(0, 8);

    const freelancerMap = new Map();
    allContracts.forEach((c) => {
      const f = c.freelancer;
      if (!f?._id) return;
      const key = f._id.toString();
      if (!freelancerMap.has(key)) {
        freelancerMap.set(key, {
          freelancerId: key,
          fullName: f.fullName,
          avatar: f.avatar || "",
          rating: f.rating || 0,
          reviewCount: f.reviewCount || 0,
          totalContracts: 0,
          completedContracts: 0,
          totalPaid: 0,
        });
      }
      const entry = freelancerMap.get(key);
      entry.totalContracts += 1;
      if (c.status === "completed") entry.completedContracts += 1;
    });
    allEarnings.filter((e) => e.status === "released").forEach((e) => {
      const key = e.freelancer.toString();
      if (freelancerMap.has(key)) freelancerMap.get(key).totalPaid += e.amount;
    });
    const freelancerPerformance = [...freelancerMap.values()].sort((a, b) => b.totalPaid - a.totalPaid);

    res.status(200).json({
      success: true,
      data: {
        range: { from: from.toISOString(), to: to.toISOString(), preset },
        stats: {
          totalJobsPosted: jobsInRange.length,
          activeProjects,
          completedProjects,
          totalProposalsReceived,
          acceptanceRate,
          totalSpending,
        },
        completionRate,
        monthlySpending,
        jobPostingTrends,
        proposalAnalytics,
        hiringReport,
        projectStatusDistribution,
        topCategories,
        freelancerPerformance,
      },
    });
  } catch (error) {
    next(error);
  }
};
