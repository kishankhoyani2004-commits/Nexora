import Invitation from "../models/Invitation.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import { notifyUser } from "../services/notificationService.js";

/**
 * POST /api/invitations
 * Client invites a freelancer to apply to one of their own open jobs.
 * body: { freelancerId, jobId, message? }
 */
export const createInvitation = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const { freelancerId, jobId, message = "" } = req.body;

    if (!freelancerId || !jobId) {
      return res.status(400).json({ success: false, message: "freelancerId and jobId are required." });
    }

    const [freelancer, job] = await Promise.all([
      User.findById(freelancerId),
      Job.findById(jobId),
    ]);

    if (!freelancer || freelancer.role !== "freelancer") {
      return res.status(404).json({ success: false, message: "Freelancer not found." });
    }
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }
    if (job.client.toString() !== clientId.toString()) {
      return res.status(403).json({ success: false, message: "You can only invite freelancers to your own jobs." });
    }
    if (job.status !== "open") {
      return res.status(400).json({ success: false, message: "You can only invite freelancers to an open job." });
    }

    let invitation;
    try {
      invitation = await Invitation.create({
        client: clientId,
        freelancer: freelancerId,
        job: jobId,
        message,
      });
    } catch (err) {
      if (err.code === 11000) {
        return res.status(409).json({ success: false, message: "You already invited this freelancer to this job." });
      }
      throw err;
    }

    await notifyUser({
      io: req.app.get("io"),
      recipient: freelancerId,
      title: "New Job Invitation",
      message: `${req.user.fullName} invited you to apply for "${job.title}".`,
      type: "invitation",
      link: `/jobs/${jobId}`,
    });

    res.status(201).json({ success: true, data: invitation, message: "Invitation sent." });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/invitations/sent
 * Invitations the authenticated client has sent — used to disable
 * "already invited" actions in the UI.
 */
export const listSentInvitations = async (req, res, next) => {
  try {
    const invitations = await Invitation.find({ client: req.user._id })
      .populate("freelancer", "fullName avatar")
      .populate("job", "title status")
      .sort({ createdAt: -1 });

    res.status(200).json({ success: true, data: invitations });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/invitations/received
 * Invitations sent to the authenticated freelancer (Freelancer Dashboard → Invitations).
 */
export const listReceivedInvitations = async (req, res, next) => {
  try {
    const invitations = await Invitation.find({ freelancer: req.user._id })
      .populate("client", "fullName avatar companyName")
      .populate("job", "title budgetMin budgetMax priceType status")
      .sort({ createdAt: -1 });

    const pendingCount = invitations.filter((i) => i.status === "pending").length;

    res.status(200).json({ success: true, data: { items: invitations, total: invitations.length, pendingCount } });
  } catch (error) {
    next(error);
  }
};

/**
 * PATCH /api/invitations/:id/respond
 * Freelancer accepts or declines an invitation. body: { action: "accept" | "decline" }
 */
export const respondInvitation = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { action } = req.body;

    if (!["accept", "decline"].includes(action)) {
      return res.status(400).json({ success: false, message: "Action must be 'accept' or 'decline'." });
    }

    const invitation = await Invitation.findById(id)
      .populate("job", "title")
      .populate("client", "fullName");

    if (!invitation) {
      return res.status(404).json({ success: false, message: "Invitation not found." });
    }
    if (invitation.freelancer.toString() !== req.user.id) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    if (invitation.status !== "pending") {
      return res.status(400).json({ success: false, message: "This invitation has already been responded to." });
    }

    invitation.status = action === "accept" ? "accepted" : "declined";
    await invitation.save();

    await notifyUser({
      io: req.app.get("io"),
      recipient: invitation.client._id || invitation.client,
      title: action === "accept" ? "Invitation Accepted" : "Invitation Declined",
      message: `${req.user.fullName} has ${action === "accept" ? "accepted" : "declined"} your invitation for "${invitation.job.title}".`,
      type: "invitation",
      link: "/client/applications",
    });

    res.status(200).json({
      success: true,
      data: invitation,
      message: action === "accept" ? "Invitation accepted." : "Invitation declined.",
    });
  } catch (error) {
    next(error);
  }
};
