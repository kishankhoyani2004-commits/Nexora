import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  createInvitation,
  listSentInvitations,
  listReceivedInvitations,
  respondInvitation,
} from "../controllers/invitationController.js";

const router = express.Router();

router.use(protect);

router.post("/",              authorize("client", "admin"),     createInvitation);
router.get("/sent",           authorize("client", "admin"),     listSentInvitations);
router.get("/received",       authorize("freelancer", "admin"), listReceivedInvitations);
router.patch("/:id/respond",  authorize("freelancer", "admin"), respondInvitation);

export default router;
