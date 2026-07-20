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

const router = express.Router();

router.post("/chat", protect, chat);
router.get("/history", protect, getHistory);
router.post("/clear", protect, clearHistory);
router.post("/proposal", protect, generateProposal);
router.post("/generate-proposal", protect, generateProposal);
router.post("/generate-job-description", protect, generateJobDescription);
router.post("/resume-analysis", protect, upload.single("resume"), resumeAnalysis);
router.post("/career-advice", protect, careerAdvice);
router.get("/skill-recommendation/:userId", protect, skillRecommendation);

export default router;
