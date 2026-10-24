import WorkspaceTask from "../models/WorkspaceTask.js";
import WorkspaceFile from "../models/WorkspaceFile.js";
import Milestone from "../models/Milestone.js";
import Deliverable from "../models/Deliverable.js";
import TimeLog from "../models/TimeLog.js";
import Contract from "../models/Contract.js";
import Workspace from "../models/Workspace.js";
import WorkspaceActivity from "../models/WorkspaceActivity.js";
import Message from "../models/Message.js";
import { uploadFile as uploadToCloudinary, deleteFile as deleteFromCloudinary } from "../services/cloudinaryService.js";
import { logActivity } from "../services/workspaceService.js";
import { notifyUser } from "../services/notificationService.js";
import { releaseMilestonePayment } from "../services/paymentService.js";

const roomFor = (contractId) => `workspace-${contractId}`;

// contract.client/freelancer are set on req.contract by authorizeWorkspaceAccess.
const otherPartyId = (contract, userId) =>
  contract.client.toString() === userId ? contract.freelancer.toString() : contract.client.toString();

// ─── Overview & Activity Handlers ─────────────────────────────────────────────

export const getOverview = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.projectId)
      .populate("client", "fullName email avatar")
      .populate("freelancer", "fullName email avatar")
      .populate("job", "title description category deadline expectedCompletionDate");

    if (!contract) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }

    const workspace = await Workspace.findOne({ contract: contract._id });

    const [milestones, deliverables, files, recentActivity] = await Promise.all([
      Milestone.find({ contract: contract._id }),
      Deliverable.find({ contract: contract._id }),
      WorkspaceFile.find({ projectId: String(contract._id) }),
      WorkspaceActivity.find({ contract: contract._id })
        .sort({ createdAt: -1 })
        .limit(20)
        .populate("actor", "fullName avatar"),
    ]);

    const completedMilestones = milestones.filter((m) => ["approved", "completed"].includes(m.status)).length;
    const progress = milestones.length > 0 ? Math.round((completedMilestones / milestones.length) * 100) : 0;

    const job = contract.job || {};
    const dueDate = workspace?.dueDate || job.expectedCompletionDate || job.deadline || null;

    res.status(200).json({
      success: true,
      data: {
        contract,
        workspace,
        dueDate,
        progress,
        milestonesSummary: {
          total: milestones.length,
          completed: completedMilestones,
          inProgress: milestones.filter((m) => m.status === "in_progress").length,
          submitted: milestones.filter((m) => m.status === "submitted").length,
        },
        deliverablesCount: deliverables.length,
        filesCount: files.length,
        recentActivity,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const getActivity = async (req, res, next) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 50, 200);
    const activity = await WorkspaceActivity.find({ contract: req.params.projectId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate("actor", "fullName avatar");
    res.status(200).json({ success: true, data: activity });
  } catch (error) {
    next(error);
  }
};

// ─── Messages Handlers ────────────────────────────────────────────────────────
// REST fallback for the socket-based chat (initial load, message search, and
// sending when the socket isn't connected). Both paths write through the
// same Message model, so MongoDB stays the single source of truth.

export const getMessages = async (req, res, next) => {
  try {
    const { q } = req.query;
    const filter = { contract: req.params.projectId };
    if (q && q.trim()) {
      filter.content = { $regex: q.trim(), $options: "i" };
    }
    const messages = await Message.find(filter)
      .sort({ createdAt: 1 })
      .populate("sender", "fullName avatar");
    res.status(200).json({ success: true, data: messages });
  } catch (error) {
    next(error);
  }
};

export const sendMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Message content is required." });
    }

    const contract = req.contract;
    const message = await Message.create({
      sender: req.user._id,
      recipient: otherPartyId(contract, req.user._id.toString()),
      contract: contract._id,
      conversationId: roomFor(contract._id),
      content: content.trim(),
    });

    const populated = await Message.findById(message._id).populate("sender", "fullName avatar");

    await logActivity(contract._id, req.user._id, "message_sent", `${populated.sender.fullName} sent a message.`);

    const io = req.app.get("io");
    await notifyUser({
      io,
      recipient: otherPartyId(contract, req.user._id.toString()),
      title: "New message",
      message: `${populated.sender.fullName}: ${content.trim().slice(0, 80)}`,
      type: "message",
      link: `/workspace/${contract._id}?tab=Messages`,
    });
    if (io) {
      io.to(roomFor(contract._id)).emit("receive_message", {
        id: populated._id.toString(),
        contractId: contract._id.toString(),
        senderId: req.user._id.toString(),
        senderName: populated.sender.fullName,
        senderAvatar: populated.sender.avatar,
        content: populated.content,
        read: false,
        createdAt: populated.createdAt.toISOString(),
      });
    }

    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

export const markMessagesRead = async (req, res, next) => {
  try {
    const result = await Message.updateMany(
      { contract: req.params.projectId, recipient: req.user._id, read: false },
      { read: true, readAt: new Date() }
    );

    if (result.modifiedCount > 0) {
      const io = req.app.get("io");
      if (io) {
        io.to(roomFor(req.params.projectId)).emit("read_receipt", {
          contractId: req.params.projectId,
          readBy: req.user._id.toString(),
          readAt: new Date().toISOString(),
        });
      }
    }

    res.status(200).json({ success: true });
  } catch (error) {
    next(error);
  }
};

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

    await logActivity(req.params.projectId, req.user._id, "task_created", `Task "${title}" added to the board.`);
    if (assignee && assignee !== req.user._id.toString()) {
      await notifyUser({
        io: req.app.get("io"),
        recipient: assignee,
        title: "New task assigned",
        message: `You were assigned to "${title}".`,
        type: "task",
        link: `/workspace/${req.params.projectId}?tab=Tasks`,
      });
    }

    const populated = await WorkspaceTask.findById(task._id).populate("assignee", "fullName email avatar");
    res.status(201).json({ success: true, data: populated });
  } catch (error) {
    next(error);
  }
};

// Handles both drag-and-drop column moves (body: { column }) and editing a
// task's details (title/label/assignee) — same endpoint, only the provided
// fields are applied, so existing drag-move calls (column-only) keep working.
export const updateTask = async (req, res, next) => {
  try {
    const { column, title, label, labelColor, assignee } = req.body;
    const task = await WorkspaceTask.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({ success: false, message: "Task not found." });
    }

    const movedToColumn = column !== undefined && column !== task.column;
    const reassigned = assignee !== undefined && String(assignee || "") !== String(task.assignee || "");

    if (column !== undefined) task.column = column;
    if (title !== undefined) task.title = title;
    if (label !== undefined) task.label = label;
    if (labelColor !== undefined) task.labelColor = labelColor;
    if (assignee !== undefined) task.assignee = assignee || null;
    await task.save();

    if (movedToColumn) {
      await logActivity(task.projectId, req.user._id, "task_moved", `Task "${task.title}" moved to ${column.replace("_", " ")}.`);
    }
    if (reassigned) {
      await logActivity(task.projectId, req.user._id, "task_assigned", `Task "${task.title}" reassigned.`);
      if (assignee && assignee !== req.user._id.toString()) {
        await notifyUser({
          io: req.app.get("io"),
          recipient: assignee,
          title: "Task assigned to you",
          message: `You were assigned to "${task.title}".`,
          type: "task",
          link: `/workspace/${req.params.projectId}?tab=Tasks`,
        });
      }
    }
    if (!movedToColumn && !reassigned && (title !== undefined || label !== undefined)) {
      await logActivity(task.projectId, req.user._id, "task_updated", `Task "${task.title}" updated.`);
    }

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
    const files = await WorkspaceFile.find({ projectId: req.params.projectId })
      .populate("uploadedBy", "fullName avatar")
      .sort({ createdAt: -1 });
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

    const fileData = req.file.buffer || req.file.path;
    const result = await uploadToCloudinary(fileData, `projects/${req.params.projectId}`, req.file.originalname, req.file.mimetype);

    const file = await WorkspaceFile.create({
      projectId: req.params.projectId,
      name: req.file.originalname,
      size: `${Math.round(req.file.size / 1024)} KB`,
      sizeBytes: req.file.size,
      mimetype: req.file.mimetype,
      url: result.url,
      publicId: result.publicId,
      thumbnailUrl: req.file.mimetype.startsWith("image/") ? result.url : "",
      uploadedBy: req.user._id,
    });

    await logActivity(req.params.projectId, req.user._id, "file_uploaded", `File "${req.file.originalname}" uploaded.`);
    await notifyUser({
      io: req.app.get("io"),
      recipient: otherPartyId(req.contract, req.user._id.toString()),
      title: "New file uploaded",
      message: `${req.user.fullName} uploaded "${req.file.originalname}".`,
      type: "file",
      link: `/workspace/${req.params.projectId}?tab=Files`,
    });

    const populated = await WorkspaceFile.findById(file._id).populate("uploadedBy", "fullName avatar");
    res.status(201).json({ success: true, data: populated, message: "File uploaded successfully." });
  } catch (error) {
    next(error);
  }
};

export const deleteFile = async (req, res, next) => {
  try {
    const file = await WorkspaceFile.findById(req.params.fileId);
    if (!file || file.projectId !== req.params.projectId) {
      return res.status(404).json({ success: false, message: "File not found." });
    }

    const isOwner = file.uploadedBy && file.uploadedBy.toString() === req.user._id.toString();
    if (!isOwner && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "You do not have permission to delete this file." });
    }

    await deleteFromCloudinary(file.publicId);
    await file.deleteOne();

    await logActivity(req.params.projectId, req.user._id, "file_deleted", `File "${file.name}" deleted.`);

    res.status(200).json({ success: true, message: "File deleted successfully." });
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

/**
 * GET /api/workspaces/my-milestones
 * Every milestone across every contract the requesting user (client or
 * freelancer) is party to — powers the sidebar's cross-project "Milestones"
 * page instead of a single project's milestone tab.
 */
export const listMyMilestones = async (req, res, next) => {
  try {
    const role = req.user.role;
    const contractFilter = role === "freelancer" ? { freelancer: req.user._id } : { client: req.user._id };
    const contracts = await Contract.find(contractFilter)
      .populate("client", "fullName avatar")
      .populate("freelancer", "fullName avatar")
      .select("title client freelancer job status");

    const contractIds = contracts.map((c) => c._id);
    const milestones = await Milestone.find({ contract: { $in: contractIds } }).sort({ dueDate: 1 });

    const contractMap = new Map(contracts.map((c) => [c._id.toString(), c]));
    const items = milestones.map((m) => ({
      milestone: m,
      contract: contractMap.get(m.contract.toString()) || null,
    }));

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/my-files
 * Every deliverable/attachment file across every contract the requesting
 * user is party to — powers the sidebar's cross-project "Project Files" page.
 */
export const listMyFiles = async (req, res, next) => {
  try {
    const role = req.user.role;
    const contractFilter = role === "freelancer" ? { freelancer: req.user._id } : { client: req.user._id };
    const contracts = await Contract.find(contractFilter).select("title");

    const contractIds = contracts.map((c) => c._id.toString());
    const files = await WorkspaceFile.find({ projectId: { $in: contractIds } })
      .populate("uploadedBy", "fullName avatar")
      .sort({ createdAt: -1 });

    const contractMap = new Map(contracts.map((c) => [c._id.toString(), c]));
    const items = files.map((f) => ({
      file: f,
      contract: contractMap.get(f.projectId) || null,
    }));

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/my-deliverables
 * Every deliverable package across every contract the requesting user is
 * party to — powers the sidebar's cross-project "Deliverables" page.
 */
export const listMyDeliverables = async (req, res, next) => {
  try {
    const role = req.user.role;
    const contractFilter = role === "freelancer" ? { freelancer: req.user._id } : { client: req.user._id };
    const contracts = await Contract.find(contractFilter).select("title client freelancer");

    const contractIds = contracts.map((c) => c._id);
    const deliverables = await Deliverable.find({ contract: { $in: contractIds } }).sort({ createdAt: -1 });

    const contractMap = new Map(contracts.map((c) => [c._id.toString(), c]));
    const items = deliverables.map((d) => ({
      deliverable: d,
      contract: contractMap.get(d.contract.toString()) || null,
    }));

    res.status(200).json({ success: true, data: items });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/workspaces/my-time-logs
 * Every time log across every contract the requesting user is party to —
 * powers the sidebar's cross-project "Time Tracking" page.
 */
export const listMyTimeLogs = async (req, res, next) => {
  try {
    const role = req.user.role;
    const contractFilter = role === "freelancer" ? { freelancer: req.user._id } : { client: req.user._id };
    const contracts = await Contract.find(contractFilter).select("title client freelancer");

    const contractIds = contracts.map((c) => c._id);
    const timeLogs = await TimeLog.find({ contract: { $in: contractIds } }).sort({ createdAt: -1 });

    const contractMap = new Map(contracts.map((c) => [c._id.toString(), c]));
    const items = timeLogs.map((t) => ({
      timeLog: t,
      contract: contractMap.get(t.contract.toString()) || null,
    }));

    res.status(200).json({ success: true, data: items });
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

    await logActivity(req.params.projectId, req.user._id, "milestone_created", `Milestone "${title}" added.`);
    await notifyUser({
      io: req.app.get("io"),
      recipient: otherPartyId(req.contract, req.user._id.toString()),
      title: "New milestone",
      message: `"${title}" was added to the project.`,
      type: "milestone",
      link: `/workspace/${req.params.projectId}?tab=Milestones`,
    });

    res.status(201).json({ success: true, data: milestone });
  } catch (error) {
    next(error);
  }
};

export const updateMilestone = async (req, res, next) => {
  try {
    const milestone = req.milestone || (await Milestone.findById(req.params.milestoneId));
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }

    const { title, description, budget, dueDate, status } = req.body;
    const validStatuses = ["pending", "in_progress", "submitted", "approved", "rejected", "completed"];

    if (status !== undefined && !validStatuses.includes(status)) {
      return res.status(400).json({ success: false, message: "Invalid milestone status." });
    }

    if (title !== undefined) milestone.title = title;
    if (description !== undefined) milestone.description = description;
    if (budget !== undefined) milestone.budget = budget;
    if (dueDate !== undefined) milestone.dueDate = dueDate;
    if (status !== undefined) {
      milestone.status = status;
      if (status === "completed") milestone.progress = 100;
      else if (status === "pending") milestone.progress = 0;
    }
    await milestone.save();

    await logActivity(
      milestone.contract,
      req.user._id,
      "milestone_updated",
      status !== undefined
        ? `Milestone "${milestone.title}" marked as ${status.replace("_", " ")}.`
        : `Milestone "${milestone.title}" updated.`
    );
    await notifyUser({
      io: req.app.get("io"),
      recipient: otherPartyId(req.contract, req.user._id.toString()),
      title: "Milestone updated",
      message:
        status !== undefined
          ? `"${milestone.title}" is now ${status.replace("_", " ")}.`
          : `"${milestone.title}" was updated.`,
      type: "milestone",
      link: `/workspace/${milestone.contract}?tab=Milestones`,
    });

    res.status(200).json({ success: true, data: milestone, message: "Milestone updated successfully." });
  } catch (error) {
    next(error);
  }
};

export const deleteMilestone = async (req, res, next) => {
  try {
    const milestone = req.milestone || (await Milestone.findById(req.params.milestoneId));
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }

    await Deliverable.deleteMany({ milestone: milestone._id });
    const { title, contract } = milestone;
    await milestone.deleteOne();

    await logActivity(contract, req.user._id, "milestone_deleted", `Milestone "${title}" deleted.`);
    await notifyUser({
      io: req.app.get("io"),
      recipient: otherPartyId(req.contract, req.user._id.toString()),
      title: "Milestone deleted",
      message: `"${title}" was removed from the project.`,
      type: "milestone",
      link: `/workspace/${contract}?tab=Milestones`,
    });

    res.status(200).json({ success: true, message: "Milestone deleted successfully." });
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

    await logActivity(milestone.contract, req.user._id, "milestone_submitted", `Milestone "${milestone.title}" submitted for review.`);
    await notifyUser({
      io: req.app.get("io"),
      recipient: otherPartyId(req.contract, req.user._id.toString()),
      title: "Milestone submitted",
      message: `"${milestone.title}" was submitted for your review.`,
      type: "approval",
      link: `/workspace/${milestone.contract}?tab=Milestones`,
    });

    res.status(200).json({ success: true, data: milestone, message: "Milestone submitted successfully." });
  } catch (error) {
    next(error);
  }
};

export const reviewMilestone = async (req, res, next) => {
  try {
    if (req.user.role !== "client" && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Only the client can approve or request revision on a milestone." });
    }

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

    await logActivity(milestone.contract, req.user._id, `milestone_${status}`, `Milestone "${milestone.title}" ${status}.`);
    await notifyUser({
      io: req.app.get("io"),
      recipient: otherPartyId(req.contract, req.user._id.toString()),
      title: status === "approved" ? "Milestone approved" : "Revision requested",
      message:
        status === "approved"
          ? `"${milestone.title}" was approved and payment released.`
          : `"${milestone.title}" needs revision.${clientFeedback ? ` Feedback: ${clientFeedback}` : ""}`,
      type: "approval",
      link: `/workspace/${milestone.contract}?tab=Milestones`,
    });

    // Approving a milestone here IS the payment release — creates/updates
    // the Earning ledger entry and auto-completes the contract once every
    // milestone is approved. Shared with the Payments dashboard's own
    // "Release Milestone Payment" action so there's one source of truth.
    if (status === "approved") {
      await releaseMilestonePayment({ milestoneId: milestone._id, actorId: req.user._id, io: req.app.get("io") });
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

    await logActivity(req.params.projectId, req.user._id, "deliverable_added", `Deliverable "${name}" uploaded.`);

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

    await logActivity(req.params.projectId, req.user._id, "time_logged", `Logged ${Math.round(log.duration / 60)} minutes of work.`);

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
