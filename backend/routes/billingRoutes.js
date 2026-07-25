import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import {
  getMethods,
  createMethod,
  removeMethod,
  makeDefault,
  getProfile,
  updateProfile,
} from "../controllers/billingController.js";

const router = express.Router();

router.get("/methods", protect, getMethods);
router.post("/methods", protect, createMethod);
router.delete("/methods/:id", protect, removeMethod);
router.patch("/methods/:id/default", protect, makeDefault);

router.get("/profile", protect, getProfile);
router.patch("/profile", protect, updateProfile);

export default router;
