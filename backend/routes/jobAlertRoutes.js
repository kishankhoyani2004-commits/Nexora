import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import {
  listAlerts,
  createAlert,
  updateAlert,
  toggleAlert,
  deleteAlert,
} from "../controllers/jobAlertController.js";

const router = express.Router();

router.use(protect, authorize("freelancer", "admin"));

router.get("/",            listAlerts);
router.post("/",           createAlert);
router.patch("/:id",       updateAlert);
router.patch("/:id/toggle", toggleAlert);
router.delete("/:id",      deleteAlert);

export default router;
