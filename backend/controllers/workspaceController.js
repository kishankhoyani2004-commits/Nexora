import WorkspaceTask from "../models/WorkspaceTask.js";
import WorkspaceFile from "../models/WorkspaceFile.js";
import Milestone from "../models/Milestone.js";
import Deliverable from "../models/Deliverable.js";
import TimeLog from "../models/TimeLog.js";
import Contract from "../models/Contract.js";
import Job from "../models/Job.js";
import { uploadFile as uploadToCloudinary } from "../services/cloudinaryService.js";

// ─── Task Board Handlers ──────────────────────────────────────────────────────

export const getTasks = async (req, res, next) => {
  try {
    const tasks = await WorkspaceTask.find({ projectId: req.params.projectId }).populate("assignee", "fullName email avatar");
    res.status(200).json({ success: true, data: tasks });
  } catch (error) {
    next(error);
  }
};

export const createTask = async (req, res, next) => {
  try {
    const { title, label, labelColor, assignee } = req.body;

    const task = await WorkspaceTask.create({
      projectId: req.params.projectId,
      title,
      label: label || "",
      labelColor: labelColor || "",
      assignee: assignee || null,
      column: "todo",
    });

    const populated = await WorkspaceTask.findById(task._id).populate("assignee", "fullName email avatar");
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const moveTask = async (req, res, next) => {
  try {
    const { column } = req.body;
    const task = await WorkspaceTask.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    task.column = column;
    await task.save();

    const populated = await WorkspaceTask.findById(task._id).populate("assignee", "fullName email avatar");
    res.status(200).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// ─── Project Files Handlers ───────────────────────────────────────────────────

export const getFolders = async (req, res, next) => {
  try {
    const folders = [
      { id: "1", name: "Design Assets", itemsCount: 4, updatedAt: new Date().toISOString() },
      { id: "2", name: "Source Code", itemsCount: 8, updatedAt: new Date().toISOString() },
      { id: "3", name: "Documentation", itemsCount: 3, updatedAt: new Date().toISOString() },
    ];
    res.status(200).json({ success: true, data: folders });
  } catch (error) {
    next(error);
  }
};

export const getFiles = async (req, res, next) => {
  try {
    const files = await WorkspaceFile.find({ projectId: req.params.projectId });
    res.status(200).json({ success: true, data: files });
  } catch (error) {
    next(error);
  }
};

export const uploadFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please select a file to upload." });
    }

    const result = await uploadToCloudinary(req.file.path, `projects/${req.params.projectId}`);

    const file = await WorkspaceFile.create({
      projectId: req.params.projectId,
      name: req.file.originalname,
      size: `${Math.round(req.file.size / 1024)} KB`,
      url: result.url,
      thumbnailUrl: req.file.mimetype.startsWith("image/") ? result.url : "",
    });

    res.status(201).json({ success: true, data: file, message: "File uploaded successfully." });
  } catch (error) {
    next(error);
  }
};

// ─── Milestones Handlers ──────────────────────────────────────────────────────

export const getMilestones = async (req, res, next) => {
  try {
    const milestones = await Milestone.find({ contract: req.params.projectId }).sort({ dueDate: 1 });
    res.status(200).json({ success: true, data: milestones });
  } catch (error) {
    next(error);
  }
};

export const createMilestone = async (req, res, next) => {
  try {
    const { title, description, budget, dueDate } = req.body;
    const milestone = await Milestone.create({
      contract: req.params.projectId,
      title,
      description,
      budget,
      dueDate,
      status: "pending",
    });
    res.status(201).json({ success: true, data: milestone });
  } catch (error) {
    next(error);
  }
};

export const submitMilestone = async (req, res, next) => {
  try {
    const { submissionText, submissionUrl } = req.body;
    const milestone = await Milestone.findById(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }
    milestone.status = "submitted";
    milestone.submissionText = submissionText || "";
    milestone.submissionUrl = submissionUrl || "";
    milestone.progress = 100;
    await milestone.save();

    // Create a Deliverable record automatically
    await Deliverable.create({
      contract: milestone.contract,
      milestone: milestone._id,
      name: milestone.title + " - Final Submission",
      fileType: submissionUrl ? "link" : "document",
      fileSize: "N/A",
      liveSiteUrl: submissionUrl || "",
      status: "pending",
    });

    res.status(200).json({ success: true, data: milestone, message: "Milestone submitted successfully." });
  } catch (error) {
    next(error);
  }
};

export const reviewMilestone = async (req, res, next) => {
  try {
    const { status, clientFeedback } = req.body; // status: "approved" or "rejected"
    const milestone = await Milestone.findById(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }
    milestone.status = status;
    milestone.clientFeedback = clientFeedback || "";
    if (status === "approved") {
      milestone.progress = 100;
      await Deliverable.updateMany({ milestone: milestone._id }, { status: "approved", feedback: clientFeedback });
    } else if (status === "rejected") {
      milestone.progress = 50;
      await Deliverable.updateMany({ milestone: milestone._id }, { status: "rejected", feedback: clientFeedback });
    }
    await milestone.save();

    // Check if all milestones are completed/approved to automatically complete the Contract!
    const contract = await Contract.findById(milestone.contract);
    if (contract && status === "approved") {
      const allMilestones = await Milestone.find({ contract: contract._id });
      const allApproved = allMilestones.every((m) => m.status === "approved" || m.status === "completed");
      if (allApproved) {
        contract.status = "completed";
        contract.escrowStatus = "released";
        await contract.save();
        await Job.findByIdAndUpdate(contract.job, { status: "completed" });
      }
    }

    res.status(200).json({ success: true, data: milestone, message: `Milestone submission ${status}.` });
  } catch (error) {
    next(error);
  }
};

// ─── Deliverables Handlers ────────────────────────────────────────────────────

export const getDeliverables = async (req, res, next) => {
  try {
    const deliverables = await Deliverable.find({ contract: req.params.projectId }).populate("milestone", "title");
    res.status(200).json({ success: true, data: deliverables });
  } catch (error) {
    next(error);
  }
};

export const createDeliverable = async (req, res, next) => {
  try {
    const { milestoneId, name, fileType, fileSize, fileUrl, gitRepoUrl, liveSiteUrl } = req.body;
    const deliverable = await Deliverable.create({
      contract: req.params.projectId,
      milestone: milestoneId,
      name,
      fileType,
      fileSize,
      fileUrl: fileUrl || "",
      gitRepoUrl: gitRepoUrl || "",
      liveSiteUrl: liveSiteUrl || "",
      status: "pending",
    });
    res.status(201).json({ success: true, data: deliverable });
  } catch (error) {
    next(error);
  }
};

// ─── Time Tracking Handlers ───────────────────────────────────────────────────

export const getTimeLogs = async (req, res, next) => {
  try {
    const logs = await TimeLog.find({ contract: req.params.projectId }).sort({ startTime: -1 });
    res.status(200).json({ success: true, data: logs });
  } catch (error) {
    next(error);
  }
};

export const getActiveTimeLog = async (req, res, next) => {
  try {
    const log = await TimeLog.findOne({
      contract: req.params.projectId,
      freelancer: req.user._id,
      endTime: { $exists: false },
    });
    res.status(200).json({ success: true, data: log || null });
  } catch (error) {
    next(error);
  }
};

export const startTimeLog = async (req, res, next) => {
  try {
    const existing = await TimeLog.findOne({
      contract: req.params.projectId,
      freelancer: req.user._id,
      endTime: { $exists: false },
    });
    if (existing) {
      return res.status(400).json({ success: false, message: "A timer is already running for this project." });
    }

    const log = await TimeLog.create({
      contract: req.params.projectId,
      freelancer: req.user._id,
      startTime: new Date(),
      status: "logged",
    });
    res.status(201).json({ success: true, data: log, message: "Timer started successfully." });
  } catch (error) {
    next(error);
  }
};

export const stopTimeLog = async (req, res, next) => {
  try {
    const { notes } = req.body;
    const log = await TimeLog.findOne({
      contract: req.params.projectId,
      freelancer: req.user._id,
      endTime: { $exists: false },
    });

    if (!log) {
      return res.status(404).json({ success: false, message: "No active timer found to stop." });
    }

    log.endTime = new Date();
    log.duration = Math.round((log.endTime - log.startTime) / 1000);
    if (notes) log.notes = notes;
    await log.save();

    res.status(200).json({ success: true, data: log, message: "Timer stopped successfully." });
  } catch (error) {
    next(error);
  }
};

export const createManualTimeLog = async (req, res, next) => {
  try {
    const { startTime, endTime, notes } = req.body;
    const start = new Date(startTime);
    const end = new Date(endTime);
    const duration = Math.round((end - start) / 1000);

    const log = await TimeLog.create({
      contract: req.params.projectId,
      freelancer: req.user._id,
      startTime: start,
      endTime: end,
      duration,
      notes,
      status: "logged",
    });
    res.status(201).json({ success: true, data: log, message: "Manual hours logged successfully." });
  } catch (error) {
    next(error);
  }
};
