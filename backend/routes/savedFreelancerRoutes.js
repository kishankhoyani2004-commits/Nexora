import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  saveFreelancer,
  unsaveFreelancer,
  listSavedFreelancers,
  getSavedFreelancerIds,
} from "../controllers/savedFreelancerController.js";

const router = express.Router();

// All endpoints require a logged-in client
router.use(protect, authorize("client", "admin"));

router.get("/",                  listSavedFreelancers);
router.get("/ids",               getSavedFreelancerIds);
router.post("/:freelancerId",    saveFreelancer);
router.delete("/:freelancerId",  unsaveFreelancer);

export default router;
