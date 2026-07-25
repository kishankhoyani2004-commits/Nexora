import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  chat,
  getHistory,
  clearHistory,
  generateProposal,
  generateJobDescription,
  resumeAnalysis,
  careerAdvice,
  skillRecommendation,
} from "../controllers/aiController.js";
import {
  createChat,
  listChats,
  searchChats,
  getChat,
  renameChat,
  togglePinChat,
  deleteChat,
  sendMessage,
  streamMessage,
  uploadChatFile,
  suggestFollowups,
} from "../controllers/aiChatController.js";
import {
  explainDashboard,
  summarizeProjectProgress,
  hiringRecommendations,
  improveJobDescription,
  suggestJobSkills,
  estimateJobBudget,
  estimateJobDuration,
  suggestExperienceLevel,
  suggestJobCategory,
  compareProposals,
  recommendBestFreelancer,
  summarizeProposal,
  highlightProposalRisks,
  detectDelayedMilestones,
  suggestNextActions,
  generateClientMessage,
  explainAnalyticsReport,
  hiringInsights,
  spendingAnalysis,
} from "../controllers/aiClientController.js";
import {
  analyzeJobPost,
  jobMatchScore,
  explainJobMatch,
  suggestBetterJobs,
  generateProposalForJob,
  improveProposalText,
  rewriteProfessionally,
  estimateBidAmount,
  estimateDeliveryTime,
  improveBio,
  suggestProfileSkills,
  improvePortfolioDescription,
  improveResumeText,
  generateProjectUpdate,
  generateClientReply,
  explainTask,
  breakDownTask,
  summarizeWorkspaceConversation,
  summarizeWorkspaceFiles,
  generateMeetingNotes,
  createTaskListFromText,
} from "../controllers/aiFreelancerController.js";

const router = express.Router();

// ── Legacy channel-based chat (kept for backward compatibility) ─────────────
router.post("/chat", protect, chat);
router.get("/history", protect, getHistory);
router.post("/clear", protect, clearHistory);
router.post("/proposal", protect, generateProposal);
router.post("/generate-proposal", protect, generateProposal);
router.post("/generate-job-description", protect, generateJobDescription);
router.post("/resume-analysis", protect, upload.single("resume"), resumeAnalysis);
router.post("/career-advice", protect, careerAdvice);
router.get("/skill-recommendation/:userId", protect, skillRecommendation);

// ── Real multi-chat AI Assistant (New Chat / Rename / Delete / Search) ──────
router.post("/chats", protect, createChat);
router.get("/chats", protect, listChats);
router.get("/chats/search", protect, searchChats);
router.get("/chats/:chatId", protect, getChat);
router.patch("/chats/:chatId", protect, renameChat);
router.patch("/chats/:chatId/pin", protect, togglePinChat);
router.delete("/chats/:chatId", protect, deleteChat);
router.post("/chats/:chatId/messages", protect, sendMessage);
router.post("/chats/:chatId/stream", protect, streamMessage);
router.post("/chats/:chatId/upload", protect, upload.single("file"), uploadChatFile);
router.get("/chats/:chatId/followups", protect, suggestFollowups);

// ── Client AI features (real data — Job/Contract/Proposal/Milestone) ───────
router.get("/client/dashboard/explain", protect, explainDashboard);
router.get("/client/projects/:contractId/summary", protect, summarizeProjectProgress);
router.get("/client/hiring-recommendations", protect, hiringRecommendations);
router.post("/client/job-description/improve", protect, improveJobDescription);
router.post("/client/job/suggest-skills", protect, suggestJobSkills);
router.post("/client/job/estimate-budget", protect, estimateJobBudget);
router.post("/client/job/estimate-duration", protect, estimateJobDuration);
router.post("/client/job/suggest-experience-level", protect, suggestExperienceLevel);
router.post("/client/job/suggest-category", protect, suggestJobCategory);
router.get("/client/jobs/:jobId/compare-proposals", protect, compareProposals);
router.get("/client/jobs/:jobId/recommend-freelancer", protect, recommendBestFreelancer);
router.get("/client/proposals/:proposalId/summary", protect, summarizeProposal);
router.get("/client/proposals/:proposalId/risks", protect, highlightProposalRisks);
router.get("/client/projects/delayed-milestones", protect, detectDelayedMilestones);
router.get("/client/projects/:contractId/next-actions", protect, suggestNextActions);
router.post("/client/projects/:contractId/generate-message", protect, generateClientMessage);
router.get("/client/analytics/explain", protect, explainAnalyticsReport);
router.get("/client/analytics/hiring-insights", protect, hiringInsights);
router.get("/client/analytics/spending", protect, spendingAnalysis);

// ── Freelancer AI features (real data — Job/Proposal/Contract/Workspace) ───
router.get("/freelancer/jobs/:jobId/analyze", protect, analyzeJobPost);
router.get("/freelancer/jobs/:jobId/match-score", protect, jobMatchScore);
router.get("/freelancer/jobs/:jobId/explain-match", protect, explainJobMatch);
router.get("/freelancer/jobs/suggest-better", protect, suggestBetterJobs);
router.post("/freelancer/jobs/:jobId/generate-proposal", protect, generateProposalForJob);
router.post("/freelancer/proposal/improve", protect, improveProposalText);
router.post("/freelancer/proposal/rewrite", protect, rewriteProfessionally);
router.post("/freelancer/jobs/:jobId/estimate-bid", protect, estimateBidAmount);
router.post("/freelancer/jobs/:jobId/estimate-delivery", protect, estimateDeliveryTime);
router.post("/freelancer/profile/improve-bio", protect, improveBio);
router.get("/freelancer/profile/suggest-skills", protect, suggestProfileSkills);
router.post("/freelancer/profile/improve-portfolio", protect, improvePortfolioDescription);
router.post("/freelancer/profile/improve-resume", protect, improveResumeText);
router.post("/freelancer/projects/:contractId/generate-update", protect, generateProjectUpdate);
router.post("/freelancer/projects/:contractId/generate-reply", protect, generateClientReply);
router.post("/freelancer/tasks/:taskId/explain", protect, explainTask);
router.post("/freelancer/tasks/:taskId/breakdown", protect, breakDownTask);
router.post("/freelancer/workspace/:projectId/summarize-conversation", protect, summarizeWorkspaceConversation);
router.post("/freelancer/workspace/:projectId/summarize-files", protect, summarizeWorkspaceFiles);
router.post("/freelancer/workspace/:projectId/meeting-notes", protect, generateMeetingNotes);
router.post("/freelancer/workspace/:projectId/create-tasks", protect, createTaskListFromText);

export default router;
