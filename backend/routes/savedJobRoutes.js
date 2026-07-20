import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  saveJob,
  unsaveJob,
  listSavedJobs,
  getSavedJobIds,
} from "../controllers/savedJobController.js";

const router = express.Router();

// All endpoints require a logged-in freelancer
router.use(protect, authorize("freelancer", "admin"));

router.get("/",        listSavedJobs);
router.get("/ids",     getSavedJobIds);
router.post("/:jobId", saveJob);
router.delete("/:jobId", unsaveJob);

export default router;
