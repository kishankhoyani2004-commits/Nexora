import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { listMine, withdraw, updateProposal, listReceived } from "../controllers/proposalController.js";

const router = express.Router();

router.get("/mine", protect, authorize("freelancer", "admin"), listMine);
router.get("/received", protect, authorize("client", "admin"), listReceived);
router.delete("/:id", protect, authorize("freelancer", "admin"), withdraw);
router.patch("/:id", protect, authorize("freelancer", "admin"), updateProposal);

export default router;
