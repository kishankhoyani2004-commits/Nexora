import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  getTasks,
  createTask,
  moveTask,
  getFolders,
  getFiles,
  uploadFile,
  getMilestones,
  createMilestone,
  submitMilestone,
  reviewMilestone,
  getDeliverables,
  createDeliverable,
  getTimeLogs,
  getActiveTimeLog,
  startTimeLog,
  stopTimeLog,
  createManualTimeLog
} from "../controllers/workspaceController.js";

const router = express.Router();

// Tasks
router.get("/:projectId/tasks", protect, getTasks);
router.post("/:projectId/tasks", protect, createTask);
router.patch("/:projectId/tasks/:taskId", protect, moveTask);

// Folders & Files
router.get("/:projectId/folders", protect, getFolders);
router.get("/:projectId/files", protect, getFiles);
router.post("/:projectId/files", protect, upload.single("file"), uploadFile);

// Milestones
router.get("/:projectId/milestones", protect, getMilestones);
router.post("/:projectId/milestones", protect, createMilestone);
router.post("/milestones/:milestoneId/submit", protect, submitMilestone);
router.post("/milestones/:milestoneId/review", protect, reviewMilestone);

// Deliverables
router.get("/:projectId/deliverables", protect, getDeliverables);
router.post("/:projectId/deliverables", protect, createDeliverable);

// Time Tracking
router.get("/:projectId/time-logs", protect, getTimeLogs);
router.get("/:projectId/time-logs/active", protect, getActiveTimeLog);
router.post("/:projectId/time-logs/start", protect, startTimeLog);
router.post("/:projectId/time-logs/stop", protect, stopTimeLog);
router.post("/:projectId/time-logs/manual", protect, createManualTimeLog);

export default router;
