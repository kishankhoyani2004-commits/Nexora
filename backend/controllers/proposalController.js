import Proposal from "../models/Proposal.js";
import Job from "../models/Job.js";

export const listForJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    // Only owner of the job or admin can view applicants/proposals
    if (job.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to view applicants for this job." });
    }

    const proposals = await Proposal.find({ job: req.params.jobId }).populate("freelancer", "fullName email avatar bio skills rating location");
    res.status(200).json({ success: true, data: proposals });
  } catch (error) {
    next(error);
  }
};

export const listMine = async (req, res, next) => {
  try {
    const proposals = await Proposal.find({ freelancer: req.user._id })
      .populate({
        path: "job",
        select: "title client budgetMin budgetMax priceType status",
        populate: { path: "client", select: "fullName avatar" },
      });

    res.status(200).json({
      success: true,
      data: {
        items: proposals,
        total: proposals.length,
        page: 1,
        pageSize: proposals.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const submit = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { description, bidAmount, estimatedDelivery, milestones } = req.body;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    const existingProposal = await Proposal.findOne({ job: jobId, freelancer: req.user._id });
    if (existingProposal) {
      return res.status(400).json({ success: false, message: "You have already submitted a proposal for this job." });
    }

    const proposal = await Proposal.create({
      job: jobId,
      freelancer: req.user._id,
      description,
      bidAmount,
      estimatedDelivery,
      milestones,
      status: "submitted",
    });

    // Increment job proposal count
    job.proposalsCount = (job.proposalsCount || 0) + 1;
    await job.save();

    res.status(201).json({ success: true, data: proposal, message: "Proposal submitted successfully." });
  } catch (error) {
    next(error);
  }
};

export const saveDraft = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const { description, bidAmount, estimatedDelivery, milestones } = req.body;

    const proposal = await Proposal.create({
      job: jobId,
      freelancer: req.user._id,
      description,
      bidAmount: bidAmount || 0,
      estimatedDelivery: estimatedDelivery || "",
      milestones,
      status: "draft",
    });

    res.status(201).json({ success: true, data: proposal, message: "Proposal draft saved." });
  } catch (error) {
    next(error);
  }
};

export const withdraw = async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: "Proposal not found." });
    }

    if (proposal.freelancer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    // Decrement proposalsCount on Job
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

export const updateProposal = async (req, res, next) => {
  try {
    const proposal = await Proposal.findById(req.params.id);
    if (!proposal) {
      return res.status(404).json({ success: false, message: "Proposal not found." });
    }

    if (proposal.freelancer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to update this proposal." });
    }

    const { description, bidAmount, estimatedDelivery, milestones } = req.body;

    if (description !== undefined) proposal.description = description;
    if (bidAmount !== undefined) proposal.bidAmount = bidAmount;
    if (estimatedDelivery !== undefined) proposal.estimatedDelivery = estimatedDelivery;
    if (milestones !== undefined) proposal.milestones = milestones;

    await proposal.save();
    res.status(200).json({ success: true, data: proposal, message: "Proposal updated successfully." });
  } catch (error) {
    next(error);
  }
};

export const listReceived = async (req, res, next) => {
  try {
    // Import Job model dynamically or rely on global
    const Job = (await import("../models/Job.js")).default;
    
    // Find all jobs created by this client
    const jobs = await Job.find({ client: req.user._id });
    const jobIds = jobs.map((j) => j._id);

    // Find all proposals submitted for these jobs
    const proposals = await Proposal.find({ job: { $in: jobIds } })
      .populate("freelancer", "fullName email avatar bio skills rating location")
      .populate("job", "title budgetMin budgetMax priceType status");

    res.status(200).json({ success: true, data: proposals });
  } catch (error) {
    next(error);
  }
};

