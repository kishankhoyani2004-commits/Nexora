import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import { authorizeWorkspaceAccess, authorizeMilestoneAccess } from "../middleware/workspaceAccess.js";
import {
  getOverview,
  getActivity,
  getMessages,
  sendMessage,
  markMessagesRead,
  getTasks,
  createTask,
  updateTask,
  getFolders,
  getFiles,
  uploadFile,
  deleteFile,
  getMilestones,
  createMilestone,
  updateMilestone,
  deleteMilestone,
  submitMilestone,
  reviewMilestone,
  listMyMilestones,
  listMyFiles,
  getDeliverables,
  createDeliverable,
  getTimeLogs,
  getActiveTimeLog,
  startTimeLog,
  stopTimeLog,
  createManualTimeLog
} from "../controllers/workspaceController.js";
import {
  submitProject,
  getSubmission,
  listSubmittedProjects,
  listMySubmissions,
  reviewSubmission,
} from "../controllers/projectSubmissionController.js";

const router = express.Router();

// Only the client and the assigned freelancer on the underlying contract
// (i.e. the Active Project) may reach any :projectId route below. Applied
// per-route (not via router.use) so it can't accidentally swallow the
// "/milestones/:milestoneId/..." routes, whose first path segment is the
// literal word "milestones", not a project id.
const guard = [protect, authorizeWorkspaceAccess];

// Submitted Projects (client-wide list — must stay above any bare "/:x" route)
router.get("/submitted-projects", protect, authorize("client", "admin"), listSubmittedProjects);

// My Submissions (freelancer-wide submission history — must stay above "/:projectId")
router.get("/my-submissions", protect, authorize("freelancer", "admin"), listMySubmissions);

// Cross-project Milestones & Files — powers the sidebar's "Milestones" /
// "Project Files" pages (all contracts, not a single project's tab)
router.get("/my-milestones", protect, listMyMilestones);
router.get("/my-files", protect, listMyFiles);

// Overview & Activity
router.get("/:projectId/overview", guard, getOverview);
router.get("/:projectId/activity", guard, getActivity);

// Project Submission (whole-project submit/review — distinct from per-milestone)
router.post("/:projectId/submit", guard, upload.array("files", 10), submitProject);
router.get("/:projectId/submission", guard, getSubmission);
router.post("/:projectId/submission/review", guard, reviewSubmission);

// Messages (REST fallback/search — real-time path is the Socket.io "join_workspace" room)
router.get("/:projectId/messages", guard, getMessages);
router.post("/:projectId/messages", guard, sendMessage);
router.patch("/:projectId/messages/read", guard, markMessagesRead);

// Tasks
router.get("/:projectId/tasks", guard, getTasks);
router.post("/:projectId/tasks", guard, createTask);
router.patch("/:projectId/tasks/:taskId", guard, updateTask);

// Folders & Files
router.get("/:projectId/folders", guard, getFolders);
router.get("/:projectId/files", guard, getFiles);
router.post("/:projectId/files", guard, upload.single("file"), uploadFile);
router.delete("/:projectId/files/:fileId", guard, deleteFile);

// Milestones
router.get("/:projectId/milestones", guard, getMilestones);
router.post("/:projectId/milestones", guard, createMilestone);
router.patch("/milestones/:milestoneId", protect, authorizeMilestoneAccess, updateMilestone);
router.delete("/milestones/:milestoneId", protect, authorizeMilestoneAccess, deleteMilestone);
router.post("/milestones/:milestoneId/submit", protect, authorizeMilestoneAccess, submitMilestone);
router.post("/milestones/:milestoneId/review", protect, authorizeMilestoneAccess, reviewMilestone);

// Deliverables
router.get("/:projectId/deliverables", guard, getDeliverables);
router.post("/:projectId/deliverables", guard, createDeliverable);

// Time Tracking
router.get("/:projectId/time-logs", guard, getTimeLogs);
router.get("/:projectId/time-logs/active", guard, getActiveTimeLog);
router.post("/:projectId/time-logs/start", guard, startTimeLog);
router.post("/:projectId/time-logs/stop", guard, stopTimeLog);
router.post("/:projectId/time-logs/manual", guard, createManualTimeLog);

export default router;
