import Contract from "../models/Contract.js";
import Proposal from "../models/Proposal.js";
import Job from "../models/Job.js";
import User from "../models/User.js";
import WorkspaceTask from "../models/WorkspaceTask.js";
import Milestone from "../models/Milestone.js";

export const createContract = async (req, res, next) => {
  try {
    const { proposalId } = req.body;

    const proposal = await Proposal.findById(proposalId).populate("job");
    if (!proposal) {
      return res.status(404).json({ success: false, message: "Proposal not found." });
    }

    const job = proposal.job;
    if (job.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to hire for this job." });
    }

    // Set proposal status to accepted
    proposal.status = "accepted";
    await proposal.save();

    // Close job
    job.status = "in_progress";
    await job.save();

    // Create Contract with Funded Escrow status
    const contract = await Contract.create({
      job: job._id,
      proposal: proposal._id,
      client: job.client,
      freelancer: proposal.freelancer,
      title: job.title,
      budget: proposal.bidAmount,
      status: "active",
      escrowStatus: "funded",
    });

    res.status(201).json({ success: true, data: contract, message: "Contract successfully created and escrow funded." });
  } catch (error) {
    next(error);
  }
};

export const listContracts = async (req, res, next) => {
  try {
    const query = req.user.role === "client" ? { client: req.user._id } : { freelancer: req.user._id };

    let contracts = await Contract.find(query)
      .populate("client", "fullName email avatar")
      .populate("freelancer", "fullName email avatar")
      .populate("job", "title description category");

    if (contracts.length === 0) {
      // Auto-seed a gorgeous project for demo purposes
      let client = await User.findOne({ role: "client" });
      if (!client) {
        client = await User.create({
          fullName: "Acme Product Labs",
          email: "client.acme@nexora.com",
          password: "demoHashedPassword",
          role: "client",
          provider: "local",
          verified: true
        });
      }

      let freelancerId = req.user._id;
      let clientId = client._id;

      if (req.user.role === "client") {
        let freelancer = await User.findOne({ role: "freelancer" });
        if (!freelancer) {
          freelancer = await User.create({
            fullName: "Alex Rivera",
            email: "alex.rivera@nexora.com",
            password: "demoHashedPassword",
            role: "freelancer",
            provider: "local",
            verified: true
          });
        }
        freelancerId = freelancer._id;
        clientId = req.user._id;
      }

      let job = await Job.findOne();
      if (!job) {
        job = await Job.create({
          client: clientId,
          title: "Enterprise AI Chatbot Development",
          description: "Integrate Google Gemini API with custom vector embeddings indexing.",
          budget: 5000,
          status: "in_progress",
          experienceLevel: "expert",
          category: "Web Development"
        });
      }

      const seedContract = await Contract.create({
        job: job._id,
        client: clientId,
        freelancer: freelancerId,
        title: "Enterprise AI Chatbot Integration",
        budget: 4500,
        status: "active",
        escrowStatus: "funded"
      });

      // Create seed tasks
      await WorkspaceTask.create([
        { projectId: seedContract._id.toString(), title: "Configure Axios clients routing & interceptors", label: "Core API Setup", labelColor: "indigo", column: "todo" },
        { projectId: seedContract._id.toString(), title: "Connect Google Gemini API key securely", label: "AI Integration", labelColor: "purple", column: "in_progress" },
        { projectId: seedContract._id.toString(), title: "Database schema indices setup and seeding", label: "Database Setup", labelColor: "emerald", column: "review" }
      ]);

      // Create seed milestones
      await Milestone.create([
        { contract: seedContract._id, title: "Milestone 1: Scaffold server API endpoints", budget: 1500, dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), status: "in_progress", progress: 60 },
        { contract: seedContract._id, title: "Milestone 2: Multi-turn Chat memory integration", budget: 1500, dueDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000), status: "pending", progress: 0 },
        { contract: seedContract._id, title: "Milestone 3: Technical code block parsing & final QA audit", budget: 1500, dueDate: new Date(Date.now() + 21 * 24 * 60 * 60 * 1000), status: "pending", progress: 0 }
      ]);

      contracts = await Contract.find({ _id: seedContract._id })
        .populate("client", "fullName email avatar")
        .populate("freelancer", "fullName email avatar")
        .populate("job", "title description category");
    }

    res.status(200).json({ success: true, data: contracts });
  } catch (error) {
    next(error);
  }
};

export const getContractById = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id)
      .populate("client", "fullName email avatar")
      .populate("freelancer", "fullName email avatar")
      .populate("job", "title description category");

    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found." });
    }

    if (
      contract.client._id.toString() !== req.user.id &&
      contract.freelancer._id.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized to access this contract." });
    }

    res.status(200).json({ success: true, data: contract });
  } catch (error) {
    next(error);
  }
};

export const updateStatus = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.id);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found." });
    }

    if (
      contract.client.toString() !== req.user.id &&
      contract.freelancer.toString() !== req.user.id &&
      req.user.role !== "admin"
    ) {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }

    const { status, escrowStatus } = req.body;

    if (status) contract.status = status;
    if (escrowStatus) contract.escrowStatus = escrowStatus;

    // If contract is completed, set escrow to released
    if (status === "completed") {
      contract.escrowStatus = "released";
      // Mark job as completed
      await Job.findByIdAndUpdate(contract.job, { status: "completed" });
    }

    await contract.save();
    res.status(200).json({ success: true, data: contract, message: "Contract status updated successfully." });
  } catch (error) {
    next(error);
  }
};
