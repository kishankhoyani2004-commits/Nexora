import mongoose from "mongoose";
import Proposal from "../models/Proposal.js";
import Job from "../models/Job.js";
import Review from "../models/Review.js";
import { uploadFile } from "../services/cloudinaryService.js";

const FREELANCER_FIELDS = "fullName email avatar bio skills location hourlyRate portfolio";

// ── Helper: attach live avg rating + review count onto each proposal's freelancer ──
async function attachFreelancerRatings(proposals) {
  const ids = [...new Set(
    proposals
      .map((p) => p.freelancer?._id?.toString())
      .filter(Boolean)
  )];

  let statsMap = new Map();
  if (ids.length > 0) {
    const stats = await Review.aggregate([
      { $match: { reviewee: { $in: ids.map((id) => new mongoose.Types.ObjectId(id)) } } },
      { $group: { _id: "$reviewee", avgRating: { $avg: "$rating" }, count: { $sum: 1 } } },
    ]);
    statsMap = new Map(stats.map((s) => [s._id.toString(), s]));
  }

  return proposals.map((p) => {
    const obj = p.toJSON();
    if (obj.freelancer && typeof obj.freelancer === "object") {
      const s = statsMap.get(obj.freelancer.id);
      obj.freelancer.rating = s ? parseFloat(s.avgRating.toFixed(1)) : 0;
      obj.freelancer.reviewCount = s ? s.count : 0;
    }
    return obj;
  });
}

// ── Client: view proposals for a specific job ─────────────────────────────────
export const listForJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });

    if (job.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to view proposals for this job." });
    }

    const proposals = await Proposal.find({ job: req.params.jobId })
      .populate("freelancer", FREELANCER_FIELDS)
      .sort({ createdAt: -1 });

    const enriched = await attachFreelancerRatings(proposals);
    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

// ── Freelancer: upload a proposal attachment ──────────────────────────────────
export const uploadAttachment = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please select a file to upload." });
    }

    const result = await uploadFile(req.file.path, "proposal-attachments");

    res.status(200).json({
      success: true,
      data: {
        filename: req.file.originalname,
        url:      result.url,
        mimetype: req.file.mimetype,
      },
      message: "File uploaded successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// ── Freelancer: list all their own proposals ──────────────────────────────────
export const listMine = async (req, res, next) => {
  try {
    const proposals = await Proposal.find({ freelancer: req.user._id })
      .populate({
        path:   "job",
        select: "title client budgetMin budgetMax priceType status category",
        populate: { path: "client", select: "fullName avatar" },
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      data: {
        items:    proposals,
        total:    proposals.length,
        page:     1,
        pageSize: proposals.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

// ── Freelancer: submit a proposal ─────────────────────────────────────────────
export const submit = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { description, coverLetter, bidAmount, estimatedDelivery, milestones, attachments } = req.body;

    const job = await Job.findById(jobId);
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    if (job.status !== "open") {
      return res.status(400).json({ success: false, message: "This job is not accepting proposals." });
    }

    const existing = await Proposal.findOne({ job: jobId, freelancer: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: "You have already submitted a proposal for this job." });
    }

    const proposal = await Proposal.create({
      job:               jobId,
      freelancer:        req.user._id,
      description:       description || coverLetter || "",
      coverLetter:       coverLetter || description || "",
      bidAmount,
      estimatedDelivery: estimatedDelivery || "",
      milestones:        milestones || [],
      attachments:       attachments || [],
      status:            "submitted",
    });

    job.proposalsCount = (job.proposalsCount || 0) + 1;
    await job.save();

    const populated = await proposal.populate("freelancer", "fullName avatar");
    res.status(201).json({ success: true, data: populated, message: "Proposal submitted successfully." });
  } catch (error) {
    next(error);
  }
};

// ── Freelancer: save draft ────────────────────────────────────────────────────
export const saveDraft = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { description, coverLetter, bidAmount, estimatedDelivery, milestones, attachments } = req.body;

    const proposal = await Proposal.create({
      job:               jobId,
      freelancer:        req.user._id,
      description:       description || coverLetter || "",
      coverLetter:       coverLetter || description || "",
      bidAmount:         bidAmount || 0,
      estimatedDelivery: estimatedDelivery || "",
      milestones:        milestones || [],
      attachments:       attachments || [],
      status:            "draft",
    });

    res.status(201).json({ success: true, data: proposal, message: "Proposal draft saved." });
  } catch (error) {
    next(error);
  }
};

// ── Freelancer: withdraw a proposal ──────────────────────────────────────────
export const withdraw = async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ success: false, message: "Proposal not found." });

    if (proposal.freelancer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const job = await Job.findById(proposal.job);
    if (job) {
      job.proposalsCount = Math.max(0, (job.proposalsCount || 1) - 1);
      await job.save();
    }

    await Proposal.findByIdAndDelete(req.params.id);
    res.status(200).json({ success: true, message: "Proposal withdrawn successfully." });
  } catch (error) {
    next(error);
  }
};

// ── Freelancer: update a proposal ────────────────────────────────────────────
export const updateProposal = async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) return res.status(404).json({ success: false, message: "Proposal not found." });

    if (proposal.freelancer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to update this proposal." });
    }

    const { description, coverLetter, bidAmount, estimatedDelivery, milestones, attachments } = req.body;
    if (description       !== undefined) { proposal.description = description; proposal.coverLetter = description; }
    if (coverLetter       !== undefined) { proposal.coverLetter = coverLetter; proposal.description = coverLetter; }
    if (bidAmount         !== undefined) proposal.bidAmount         = bidAmount;
    if (estimatedDelivery !== undefined) proposal.estimatedDelivery = estimatedDelivery;
    if (milestones        !== undefined) proposal.milestones        = milestones;
    if (attachments       !== undefined) proposal.attachments       = attachments;

    await proposal.save();
    res.status(200).json({ success: true, data: proposal, message: "Proposal updated successfully." });
  } catch (error) {
    next(error);
  }
};

// ── Client: view ALL proposals received across all their jobs ─────────────────
export const listReceived = async (req, res, next) => {
  try {
    const jobs   = await Job.find({ client: req.user._id });
    const jobIds = jobs.map((j) => j._id);

    const proposals = await Proposal.find({ job: { $in: jobIds } })
      .populate("freelancer", FREELANCER_FIELDS)
      .populate("job", "title budgetMin budgetMax priceType status category")
      .sort({ createdAt: -1 });

    const enriched = await attachFreelancerRatings(proposals);
    res.status(200).json({ success: true, data: enriched });
  } catch (error) {
    next(error);
  }
};

// ── Client: shortlist a proposal ─────────────────────────────────────────────
export const shortlistProposal = async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id).populate("job");
    if (!proposal) return res.status(404).json({ success: false, message: "Proposal not found." });

    const job = proposal.job;
    if (!job || job.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    proposal.status = "shortlisted";
    await proposal.save();
    res.status(200).json({ success: true, data: proposal, message: "Proposal shortlisted." });
  } catch (error) {
    next(error);
  }
};

// ── Client: reject a proposal ─────────────────────────────────────────────────
export const rejectProposal = async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id).populate("job");
    if (!proposal) return res.status(404).json({ success: false, message: "Proposal not found." });

    const job = proposal.job;
    if (!job || job.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    proposal.status = "rejected";
    await proposal.save();
    res.status(200).json({ success: true, data: proposal, message: "Proposal rejected." });
  } catch (error) {
    next(error);
  }
};
