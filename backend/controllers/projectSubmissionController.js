import Contract from "../models/Contract.js";
import Milestone from "../models/Milestone.js";
import ProjectSubmission from "../models/ProjectSubmission.js";
import Job from "../models/Job.js";
import { uploadFile as uploadToCloudinary } from "../services/cloudinaryService.js";
import { logActivity } from "../services/workspaceService.js";
import { notifyUser } from "../services/notificationService.js";
import { releaseContractPayment } from "../services/paymentService.js";

// req.contract is set by authorizeWorkspaceAccess.
const otherPartyId = (contract, userId) =>
  contract.client.toString() === userId ? contract.freelancer.toString() : contract.client.toString();

/**
 * POST /api/workspaces/:projectId/submit
 * Freelancer submits the completed project for client review — uploads
 * deliverable files, links, and notes, and moves the contract to
 * "submitted" (Submitted for Review).
 */
export const submitProject = async (req, res, next) => {
  try {
    const contract = req.contract;

    if (contract.freelancer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Only the assigned freelancer can submit this project." });
    }
    if (contract.status !== "active") {
      return res.status(400).json({ success: false, message: "Only an active project can be submitted for review." });
    }

    const { notes = "" } = req.body;
    let { links = [] } = req.body;
    if (typeof links === "string") {
      try {
        links = JSON.parse(links);
      } catch {
        links = links.split(",").map((l) => l.trim()).filter(Boolean);
      }
    }
    links = (Array.isArray(links) ? links : []).filter(Boolean).slice(0, 10);

    const files = [];
    if (req.files && req.files.length > 0) {
      for (const file of req.files) {
        const result = await uploadToCloudinary(file.path, `projects/${contract._id}/submissions`);
        files.push({
          name: file.originalname,
          url: result.url,
          mimetype: file.mimetype,
          size: `${Math.round(file.size / 1024)} KB`,
        });
      }
    }

    if (files.length === 0 && links.length === 0 && !notes.trim()) {
      return res.status(400).json({ success: false, message: "Add at least one file, link, or note before submitting." });
    }

    const submission = await ProjectSubmission.findOneAndUpdate(
      { contract: contract._id },
      {
        contract: contract._id,
        freelancer: contract.freelancer,
        client: contract.client,
        notes,
        links,
        files,
        status: "pending",
        clientFeedback: "",
        reviewedAt: null,
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    contract.status = "submitted";
    await contract.save();

    await logActivity(contract._id, req.user._id, "project_submitted", `${req.user.fullName} submitted the project for review.`);
    await notifyUser({
      io: req.app.get("io"),
      recipient: contract.client,
      title: "Project submitted for review",
      message: `${req.user.fullName} submitted "${contract.title}" for your review.`,
      type: "approval",
      link: `/client/submitted-projects`,
    });

    res.status(200).json({ success: true, data: submission, message: "Project submitted for review." });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/:projectId/submission
 * Fetch the current submission package for a contract (either party).
 */
export const getSubmission = async (req, res, next) => {
  try {
    const submission = await ProjectSubmission.findOne({ contract: req.params.projectId });
    res.status(200).json({ success: true, data: submission });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/my-submissions
 * Freelancer's own submission history across all their contracts — used to
 * show submission dates, status, and any revision feedback on their
 * Active Projects page.
 */
export const listMySubmissions = async (req, res, next) => {
  try {
    const submissions = await ProjectSubmission.find({ freelancer: req.user._id }).sort({ updatedAt: -1 });
    res.status(200).json({ success: true, data: submissions });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/submitted-projects
 * Client's "Submitted Projects" list — every contract awaiting their review,
 * with the submission package attached.
 */
export const listSubmittedProjects = async (req, res, next) => {
  try {
    const contracts = await Contract.find({ client: req.user._id, status: "submitted" })
      .populate("freelancer", "fullName email avatar")
      .populate("job", "title category")
      .sort({ updatedAt: -1 });

    const contractIds = contracts.map((c) => c._id);
    const submissions = await ProjectSubmission.find({ contract: { $in: contractIds } });
    const submissionMap = new Map(submissions.map((s) => [s.contract.toString(), s]));

    const items = contracts.map((c) => ({
      contract: c,
      submission: submissionMap.get(c._id.toString()) || null,
    }));

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

/**
 * POST /api/workspaces/:projectId/submission/review
 * Client approves the submitted project (⇒ completes it, pays out, marks
 * milestones complete) or requests a revision (⇒ back to "active" with
 * feedback for the freelancer).
 * body: { action: "approve" | "request_revision", feedback? }
 */
export const reviewSubmission = async (req, res, next) => {
  try {
    const contract = req.contract;

    if (contract.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only the client can review this submission." });
    }
    if (contract.status !== "submitted") {
      return res.status(400).json({ success: false, message: "This project is not awaiting review." });
    }

    const { action, feedback = "" } = req.body;
    if (!["approve", "request_revision"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'approve' or 'request_revision'." });
    }

    const submission = await ProjectSubmission.findOne({ contract: contract._id });
    if (!submission) {
      return res.status(404).json({ success: false, message: "No submission found for this project." });
    }

    const io = req.app.get("io");

    if (action === "approve") {
      submission.status = "approved";
      submission.clientFeedback = feedback;
      submission.reviewedAt = new Date();
      await submission.save();

      contract.status = "completed";
      contract.escrowStatus = "released";
      await contract.save();

      await Milestone.updateMany(
        { contract: contract._id, status: { $nin: ["approved", "completed"] } },
        { $set: { status: "completed", progress: 100 } }
      );

      await Job.findByIdAndUpdate(contract.job, { status: "completed" });

      const earning = await releaseContractPayment({ contractId: contract._id, actorId: req.user._id, io });

      await logActivity(contract._id, req.user._id, "project_approved", `Project approved — payment released and marked completed.`);

      await notifyUser({
        io,
        recipient: contract.freelancer,
        title: "Project approved! 🎉",
        message: `"${contract.title}" was approved by the client. Payment has been released to your earnings.`,
        type: "approval",
        link: `/freelancer/earnings`,
      });
      await notifyUser({
        io,
        recipient: contract.client,
        title: "Project completed",
        message: `You approved "${contract.title}" and released payment to the freelancer.`,
        type: "approval",
        link: `/client/payments`,
      });

      return res.status(200).json({
        success: true,
        data: { contract, submission, earning },
        message: "Project approved, payment released, and marked completed.",
      });
    }

    // ── Request revision ────────────────────────────────────────────────────
    submission.status = "revision_requested";
    submission.clientFeedback = feedback;
    submission.reviewedAt = new Date();
    await submission.save();

    contract.status = "active";
    await contract.save();

    await logActivity(contract._id, req.user._id, "revision_requested", `Client requested a revision.${feedback ? ` "${feedback}"` : ""}`);
    await notifyUser({
      io,
      recipient: contract.freelancer,
      title: "Revision requested",
      message: `The client requested changes to "${contract.title}".${feedback ? ` Feedback: ${feedback}` : ""}`,
      type: "approval",
      link: `/freelancer/projects`,
    });

    res.status(200).json({ success: true, data: { contract, submission }, message: "Revision requested." });
  } catch (error) {
    next(error);
  }
};
