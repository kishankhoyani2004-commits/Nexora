import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { jobCreateRules } from "../validators/jobValidator.js";
import { proposalSubmitRules } from "../validators/proposalValidator.js";
import { validate } from "../validators/authValidator.js";
import {
  list, getById, getRecommended,
  create, update, publish, deleteJob,
  closeJob, saveDraftJob, createAndPublish,
} from "../controllers/jobController.js";
import { listForJob, submit, saveDraft } from "../controllers/proposalController.js";

const router = express.Router();

router.get("/",            list);
// /recommended MUST be before /:id so Express doesn't treat "recommended" as an id
router.get("/recommended", protect, authorize("freelancer", "admin"), getRecommended);
router.get("/:id",         getById);
router.post("/",           protect, authorize("client", "admin"), jobCreateRules, validate, create);
// Draft save — no strict validation required (partial data allowed)
router.post("/save-draft", protect, authorize("client", "admin"), saveDraftJob);
// Create and immediately publish
router.post("/publish-new", protect, authorize("client", "admin"), createAndPublish);
router.patch("/:id",        protect, authorize("client", "admin"), update);
router.post("/:id/publish", protect, authorize("client", "admin"), publish);
router.patch("/:id/close",  protect, authorize("client", "admin"), closeJob);
router.delete("/:id",       protect, authorize("client", "admin"), deleteJob);

// Proposal sub-routes
router.get("/:jobId/proposals",       protect, listForJob);
router.post("/:jobId/proposals",      protect, authorize("freelancer", "admin"), proposalSubmitRules, validate, submit);
router.post("/:jobId/proposals/draft",protect, authorize("freelancer", "admin"), saveDraft);

export default router;
