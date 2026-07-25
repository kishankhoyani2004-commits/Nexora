import Job from "../models/Job.js";
import Proposal from "../models/Proposal.js";
import Contract from "../models/Contract.js";
import Milestone from "../models/Milestone.js";
import Earning from "../models/Earning.js";
import Review from "../models/Review.js";
import { generateText, generateJSON } from "../services/geminiService.js";

const SYS = "You are Nexora AI, an assistant embedded in a freelance marketplace's Client Portal. Be concise, practical, and use markdown formatting.";

const notFound = (res, msg = "Resource not found.") => res.status(404).json({ success: false, message: msg });

// ── Dashboard ─────────────────────────────────────────────────────────────────

export const explainDashboard = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const [jobs, contracts] = await Promise.all([
      Job.find({ client: clientId }),
      Contract.find({ client: clientId }),
    ]);

    const stats = {
      totalJobs: jobs.length,
      openJobs: jobs.filter((j) => j.status === "open").length,
      inProgressJobs: jobs.filter((j) => j.status === "in_progress").length,
      completedJobs: jobs.filter((j) => j.status === "completed").length,
      activeContracts: contracts.filter((c) => c.status === "active").length,
      completedContracts: contracts.filter((c) => c.status === "completed").length,
      totalProposals: jobs.reduce((s, j) => s + (j.proposalsCount || 0), 0),
      totalSpent: contracts.filter((c) => c.status === "completed").reduce((s, c) => s + c.budget, 0),
    };

    const prompt = `Here is this client's live dashboard data:\n${JSON.stringify(stats, null, 2)}\n\nExplain what these statistics mean for their hiring activity in 3-4 short sentences, then give one specific actionable recommendation.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply, stats } });
  } catch (error) {
    next(error);
  }
};

export const hiringRecommendations = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const contracts = await Contract.find({ client: clientId }).populate("job", "category skills");
    const categoryCounts = {};
    contracts.forEach((c) => {
      const cat = c.job?.category || "Uncategorized";
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
    });

    const openJobsCount = await Job.countDocuments({ client: clientId, status: "open" });

    const prompt = `This client has hired across these categories: ${JSON.stringify(categoryCounts)}. They currently have ${openJobsCount} open job posts. Based on this hiring history, give 3 specific, actionable hiring recommendations (e.g. categories to explore, freelancer types to prioritize, budget adjustments).`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

// ── Post Job helpers ──────────────────────────────────────────────────────────

export const improveJobDescription = async (req, res, next) => {
  try {
    const { title, description, skills } = req.body;
    if (!description) return res.status(400).json({ success: false, message: "Description is required." });

    const prompt = `Improve this job description for a listing titled "${title || "Untitled Project"}" (required skills: ${(skills || []).join(", ") || "general"}).\n\nCurrent description:\n"""${description}"""\n\nRewrite it to be clearer, more structured (Overview / Responsibilities / Requirements / Deliverables), and more likely to attract top-tier freelancers. Return only the improved description in markdown.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const suggestJobSkills = async (req, res, next) => {
  try {
    const { title, description, category } = req.body;
    const prompt = `Job title: "${title || ""}". Category: "${category || ""}". Description: "${description || ""}".\n\nSuggest exactly 6 required technical skills for this job. Respond as JSON: {"skills": ["...", ...]}`;
    const result = await generateJSON(prompt, SYS);
    res.status(200).json({ success: true, data: { skills: Array.isArray(result.skills) ? result.skills.slice(0, 8) : [] } });
  } catch (error) {
    next(error);
  }
};

export const estimateJobBudget = async (req, res, next) => {
  try {
    const { title, description, category, experienceLevel, priceType } = req.body;
    const prompt = `Job: "${title || ""}" (${category || "general"} category, ${experienceLevel || "intermediate"} level, ${priceType || "fixed"} pricing). Description: "${description || ""}".\n\nEstimate a fair budget range in INR for the Indian freelance market. Respond as JSON: {"min": number, "max": number, "reasoning": "1-2 sentence explanation"}`;
    const result = await generateJSON(prompt, SYS);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const estimateJobDuration = async (req, res, next) => {
  try {
    const { title, description, category } = req.body;
    const prompt = `Job: "${title || ""}" (${category || "general"}). Description: "${description || ""}".\n\nEstimate realistic project duration. Respond as JSON: {"duration": "e.g. 1-3 months", "reasoning": "short explanation"}`;
    const result = await generateJSON(prompt, SYS);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const suggestExperienceLevel = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const prompt = `Job: "${title || ""}". Description: "${description || ""}".\n\nSuggest the most appropriate experience level from exactly: "entry", "intermediate", or "expert". Respond as JSON: {"level": "entry|intermediate|expert", "reasoning": "short explanation"}`;
    const result = await generateJSON(prompt, SYS);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const suggestJobCategory = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    const prompt = `Job title: "${title || ""}". Description: "${description || ""}".\n\nSuggest the best-fit category and subcategory for this freelance job listing. Respond as JSON: {"category": "...", "subcategory": "...", "reasoning": "short explanation"}`;
    const result = await generateJSON(prompt, SYS);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ── Proposals ─────────────────────────────────────────────────────────────────

export const compareProposals = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return notFound(res, "Job not found.");
    if (job.client.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized." });

    const proposals = await Proposal.find({ job: job._id }).populate("freelancer", "fullName rating reviewCount skills location");
    if (proposals.length === 0) {
      return res.status(200).json({ success: true, data: { content: "No proposals have been submitted for this job yet." } });
    }

    const proposalSummaries = proposals.map((p, i) =>
      `Proposal ${i + 1} — ${p.freelancer?.fullName || "Freelancer"} (rating ${p.freelancer?.rating || "N/A"}, ${p.freelancer?.reviewCount || 0} reviews)\nBid: ₹${p.bidAmount}, Delivery: ${p.estimatedDelivery}\nSkills: ${(p.freelancer?.skills || []).join(", ")}\nCover letter: ${p.description.slice(0, 400)}`
    ).join("\n\n---\n\n");

    const prompt = `Job: "${job.title}"\nRequired skills: ${job.skills.join(", ")}\nBudget: ₹${job.budgetMin}-${job.budgetMax}\n\nHere are ${proposals.length} proposals received:\n\n${proposalSummaries}\n\nCompare these proposals against the job's requirements. Produce a markdown table comparing freelancer, bid, delivery time, and fit, followed by a short recommendation of which 1-2 to shortlist and why.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply, proposalCount: proposals.length } });
  } catch (error) {
    next(error);
  }
};

export const recommendBestFreelancer = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return notFound(res, "Job not found.");
    if (job.client.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized." });

    const proposals = await Proposal.find({ job: job._id, status: { $ne: "rejected" } }).populate("freelancer", "fullName rating reviewCount skills hourlyRate");
    if (proposals.length === 0) {
      return res.status(200).json({ success: true, data: { content: "No active proposals to recommend from yet." } });
    }

    const list = proposals.map((p, i) => `${i + 1}. ${p.freelancer?.fullName} — Bid ₹${p.bidAmount}, Rating ${p.freelancer?.rating || "N/A"} (${p.freelancer?.reviewCount || 0} reviews), Skills: ${(p.freelancer?.skills || []).join(", ")}`).join("\n");

    const prompt = `Job requires: ${job.skills.join(", ")} (${job.experienceLevel} level, budget ₹${job.budgetMin}-${job.budgetMax}).\n\nCandidates:\n${list}\n\nRecommend the single best freelancer to hire and explain exactly why in 2-3 sentences, referencing skill match, rating, and price fit.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const summarizeProposal = async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.proposalId).populate("job", "title client").populate("freelancer", "fullName");
    if (!proposal) return notFound(res, "Proposal not found.");
    if (proposal.job?.client?.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized." });

    const prompt = `Summarize this freelancer proposal in 3 short bullet points (key offer, timeline, price):\n\nJob: "${proposal.job?.title}"\nFreelancer: ${proposal.freelancer?.fullName}\nBid: ₹${proposal.bidAmount}, Delivery: ${proposal.estimatedDelivery}\n\nFull proposal:\n"""${proposal.description}"""`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const highlightProposalRisks = async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.proposalId).populate("job", "title client budgetMin budgetMax").populate("freelancer", "fullName rating reviewCount");
    if (!proposal) return notFound(res, "Proposal not found.");
    if (proposal.job?.client?.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized." });

    const prompt = `Job budget range: ₹${proposal.job?.budgetMin}-${proposal.job?.budgetMax}. Freelancer rating: ${proposal.freelancer?.rating || "unrated"} (${proposal.freelancer?.reviewCount || 0} reviews).\nBid: ₹${proposal.bidAmount}, Delivery: ${proposal.estimatedDelivery}\nProposal text: "${proposal.description}"\n\nList this proposal's key STRENGTHS (2-3 bullet points) and potential RISKS a client should watch for (2-3 bullet points, e.g. underbidding, vague scope, unrealistic timeline, no track record). Format as two markdown headers: "Strengths" and "Risks".`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

// ── Active Projects ───────────────────────────────────────────────────────────

export const summarizeProjectProgress = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.contractId).populate("freelancer", "fullName").populate("job", "title");
    if (!contract) return notFound(res, "Project not found.");
    if (contract.client.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized." });

    const milestones = await Milestone.find({ contract: contract._id }).sort({ dueDate: 1 });
    const milestoneSummary = milestones.map((m) => `- ${m.title}: ${m.status} (${m.progress}%, due ${new Date(m.dueDate).toLocaleDateString()})`).join("\n") || "No milestones created yet.";

    const prompt = `Project "${contract.title}" with ${contract.freelancer?.fullName}, status: ${contract.status}, budget ₹${contract.budget}.\n\nMilestones:\n${milestoneSummary}\n\nSummarize overall progress in 2-3 sentences and flag anything that needs the client's attention.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply, milestoneCount: milestones.length } });
  } catch (error) {
    next(error);
  }
};

export const detectDelayedMilestones = async (req, res, next) => {
  try {
    const contracts = await Contract.find({ client: req.user._id, status: "active" }).populate("freelancer", "fullName").populate("job", "title");
    const contractIds = contracts.map((c) => c._id);
    const now = new Date();
    const delayed = await Milestone.find({
      contract: { $in: contractIds },
      dueDate: { $lt: now },
      status: { $nin: ["approved", "completed"] },
    }).populate("contract", "title freelancer");

    if (delayed.length === 0) {
      return res.status(200).json({ success: true, data: { content: "No delayed milestones — all active projects are on track.", delayedCount: 0 } });
    }

    const contractMap = new Map(contracts.map((c) => [c._id.toString(), c]));
    const list = delayed.map((m) => {
      const c = contractMap.get(m.contract._id?.toString() || m.contract.toString());
      const daysLate = Math.floor((now - new Date(m.dueDate)) / (1000 * 60 * 60 * 24));
      return `- "${m.title}" on project "${c?.title || m.contract?.title}" (${c?.freelancer?.fullName}) — ${daysLate} days overdue, status: ${m.status}`;
    }).join("\n");

    const prompt = `These milestones are overdue:\n${list}\n\nFor each, suggest a brief next action the client should take (e.g. message freelancer, extend deadline, escalate). Keep it concise.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply, delayedCount: delayed.length } });
  } catch (error) {
    next(error);
  }
};

export const suggestNextActions = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.contractId).populate("freelancer", "fullName").populate("job", "title");
    if (!contract) return notFound(res, "Project not found.");
    if (contract.client.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized." });

    const milestones = await Milestone.find({ contract: contract._id }).sort({ dueDate: 1 });
    const pending = milestones.filter((m) => m.status === "submitted");
    const overdue = milestones.filter((m) => m.status !== "approved" && m.status !== "completed" && new Date(m.dueDate) < new Date());

    const prompt = `Project "${contract.title}" (status: ${contract.status}) with ${contract.freelancer?.fullName}.\nMilestones submitted awaiting review: ${pending.length}.\nOverdue milestones: ${overdue.length}.\nTotal milestones: ${milestones.length}.\n\nSuggest exactly 3 concrete next actions the client should take right now, ordered by priority.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const generateClientMessage = async (req, res, next) => {
  try {
    const { purpose, tone } = req.body;
    const contract = await Contract.findById(req.params.contractId).populate("freelancer", "fullName").populate("job", "title");
    if (!contract) return notFound(res, "Project not found.");
    if (contract.client.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized." });

    const prompt = `Draft a short, professional message from a client to their freelancer ${contract.freelancer?.fullName} on the project "${contract.title}". Purpose: "${purpose || "check in on progress"}". Tone: ${tone || "friendly and professional"}. Keep it under 100 words, ready to send as-is.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

// ── Analytics ─────────────────────────────────────────────────────────────────

export const explainAnalyticsReport = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const [jobs, contracts, earnings] = await Promise.all([
      Job.find({ client: clientId }),
      Contract.find({ client: clientId }),
      Earning.find({ client: clientId, status: "released" }),
    ]);

    const totalSpent = earnings.reduce((s, e) => s + e.amount, 0);
    const stats = {
      totalJobsPosted: jobs.length,
      activeProjects: contracts.filter((c) => c.status === "active").length,
      completedProjects: contracts.filter((c) => c.status === "completed").length,
      totalSpent,
      avgProjectValue: contracts.length ? Math.round(totalSpent / Math.max(1, contracts.filter((c) => c.status === "completed").length)) : 0,
    };

    const prompt = `Explain this client's analytics report in plain English (3-4 sentences), highlighting the most important trend:\n${JSON.stringify(stats, null, 2)}`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply, stats } });
  } catch (error) {
    next(error);
  }
};

export const hiringInsights = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const contracts = await Contract.find({ client: clientId }).populate("freelancer", "fullName rating reviewCount");
    const completed = contracts.filter((c) => c.status === "completed");
    const avgRatingHired = contracts.length
      ? (contracts.reduce((s, c) => s + (c.freelancer?.rating || 0), 0) / contracts.length).toFixed(1)
      : 0;

    const prompt = `This client has made ${contracts.length} total hires, ${completed.length} completed. Average rating of freelancers hired: ${avgRatingHired}.\n\nProvide 3 hiring insights: patterns in their hiring behavior, quality of freelancers hired, and one suggestion to improve hiring outcomes.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const spendingAnalysis = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const earnings = await Earning.find({ client: clientId, status: "released" }).populate("freelancer", "fullName");

    const now = new Date();
    const last3Months = earnings.filter((e) => (e.paidAt || e.updatedAt) >= new Date(now.getFullYear(), now.getMonth() - 3, 1));
    const totalSpent = earnings.reduce((s, e) => s + e.amount, 0);
    const recentSpend = last3Months.reduce((s, e) => s + e.amount, 0);

    const prompt = `Client's total lifetime spending: ₹${totalSpent}. Spending in the last 3 months: ₹${recentSpend} across ${last3Months.length} payments.\n\nAnalyze spending trend (increasing/decreasing/stable) and give one budget optimization tip.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply, totalSpent, recentSpend } });
  } catch (error) {
    next(error);
  }
};
