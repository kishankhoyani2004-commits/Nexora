import Proposal from "../models/Proposal.js";
import Contract from "../models/Contract.js";
import Milestone from "../models/Milestone.js";
import Earning from "../models/Earning.js";
import Job from "../models/Job.js";
import { ensureWorkspaceForContract } from "./workspaceService.js";

export const applicationService = {
  // ── Create application (when freelancer submits proposal) ──
  createApplication: async (jobId, freelancerId, applicationData) => {
    const application = new Proposal({
      job: jobId,
      freelancer: freelancerId,
      ...applicationData,
      status: "submitted", // "submitted" means pending for client review
    });
    return await application.save();
  },

  // ── Get all applications for a job (for client) ──
  getApplicationsForJob: async (jobId) => {
    return await Proposal.find({ job: jobId })
      .populate("freelancer", "fullName avatar email skills hourlyRate")
      .populate("job", "title budget")
      .sort({ createdAt: -1 });
  },

  // ── Get all applications for a client (across all their jobs) ──
  getPendingApplicationsForClient: async (clientId) => {
    // Get all jobs for this client
    const jobs = await Job.find({ client: clientId });
    const jobIds = jobs.map(j => j._id);

    // Get all applications for these jobs, regardless of status, so the
    // client can review pending, accepted, and rejected applications alike.
    return await Proposal.find({ job: { $in: jobIds } })
      .populate("freelancer", "fullName avatar email skills hourlyRate rating reviewCount")
      .populate("job", "title budget category")
      .sort({ createdAt: -1 });
  },

  // ── Get applications submitted by freelancer (not for their view) ──
  getApplicationsByFreelancer: async (freelancerId) => {
    return await Proposal.find({ freelancer: freelancerId })
      .populate("job", "title budget")
      .sort({ createdAt: -1 });
  },

  // ── Accept application - creates contract and earning ──
  acceptApplication: async (applicationId, clientId) => {
    const application = await Proposal.findById(applicationId).populate("job");

    if (!application) {
      throw new Error("Application not found");
    }

    if (!["submitted", "shortlisted"].includes(application.status)) {
      throw new Error("Can only accept pending or shortlisted applications");
    }

    // Check if job belongs to client
    const job = await Job.findById(application.job._id);
    if (job.client.toString() !== clientId) {
      throw new Error("Unauthorized: Job does not belong to this client");
    }

    // Create contract
    const contract = new Contract({
      job: application.job._id,
      proposal: application._id,
      freelancer: application.freelancer._id,
      client: clientId,
      title: job.title,
      budget: application.bidAmount,
      status: "active",
      escrowStatus: "funded",
    });
    await contract.save();

    // Create real Milestone documents from the proposal's embedded milestones
    // (same behaviour as the /api/contracts accept path) so this contract's
    // workspace has real progress data instead of an empty milestone list.
    if (application.milestones && application.milestones.length > 0) {
      const milestoneDocs = application.milestones.map((m, idx) => ({
        contract: contract._id,
        title: m.name,
        budget: m.amount,
        dueDate: new Date(Date.now() + (idx + 1) * 7 * 24 * 60 * 60 * 1000),
        status: idx === 0 ? "in_progress" : "pending",
        progress: 0,
      }));
      await Milestone.create(milestoneDocs);
    } else {
      await Milestone.create({
        contract: contract._id,
        title: "Complete Project",
        budget: application.bidAmount,
        dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000),
        status: "in_progress",
        progress: 0,
      });
    }

    // Create earning record
    const earning = new Earning({
      freelancer: application.freelancer._id,
      contract: contract._id,
      job: application.job._id,
      client: clientId,
      amount: application.bidAmount,
      status: "in_escrow", // Money is in escrow until milestones complete
      description: `Earning for: ${job.title}`,
    });
    await earning.save();

    // Update application status to accepted
    application.status = "accepted";
    await application.save();

    // Update job status to in_progress
    job.status = "in_progress";
    await job.save();

    // Same Active-Project-→-Workspace guarantee as the /contracts accept path.
    await ensureWorkspaceForContract(contract);

    return {
      application,
      contract: contract.toJSON(),
      earning: earning.toJSON(),
    };
  },

  // ── Reject application ──
  rejectApplication: async (applicationId, clientId) => {
    const application = await Proposal.findById(applicationId).populate("job");

    if (!application) {
      throw new Error("Application not found");
    }

    if (!["submitted", "shortlisted"].includes(application.status)) {
      throw new Error("Can only reject pending or shortlisted applications");
    }

    // Check if job belongs to client
    const job = await Job.findById(application.job._id);
    if (job.client.toString() !== clientId) {
      throw new Error("Unauthorized: Job does not belong to this client");
    }

    application.status = "rejected";
    await application.save();

    return application;
  },

  // ── Withdraw application (freelancer action) ──
  withdrawApplication: async (applicationId, freelancerId) => {
    const application = await Proposal.findById(applicationId);

    if (!application) {
      throw new Error("Application not found");
    }

    if (application.freelancer.toString() !== freelancerId) {
      throw new Error("Unauthorized: You can only withdraw your own applications");
    }

    if (application.status !== "submitted") {
      throw new Error("Can only withdraw pending applications");
    }

    application.status = "withdrawn";
    await application.save();

    return application;
  },

  // ── Get application by ID ──
  getById: async (applicationId) => {
    return await Proposal.findById(applicationId)
      .populate("freelancer")
      .populate("job");
  },

  // ── Count applications for job ──
  countForJob: async (jobId, status = null) => {
    const query = { job: jobId };
    if (status) query.status = status;
    return await Proposal.countDocuments(query);
  },
};
