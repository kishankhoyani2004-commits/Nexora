import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import upload from "../middleware/uploadMiddleware.js";
import {
  listMine,
  withdraw,
  updateProposal,
  listReceived,
  shortlistProposal,
  rejectProposal,
  uploadAttachment,
} from "../controllers/proposalController.js";

const router = express.Router();

// ── Freelancer routes ────────────────────────────────────────────────────────
router.get("/mine",    protect, authorize("freelancer", "admin"), listMine);
router.post("/upload", protect, authorize("freelancer", "admin"), upload.single("file"), uploadAttachment);
router.delete("/:id",  protect, authorize("freelancer", "admin"), withdraw);
router.patch("/:id",   protect, authorize("freelancer", "admin"), updateProposal);

// ── Client routes ────────────────────────────────────────────────────────────
router.get("/received",           protect, authorize("client", "admin"), listReceived);
router.patch("/:id/shortlist",    protect, authorize("client", "admin"), shortlistProposal);
router.patch("/:id/reject",       protect, authorize("client", "admin"), rejectProposal);

export default router;
