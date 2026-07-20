import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { authorize } from "../middleware/roleMiddleware.js";
import { dashboardStats, listUsers, suspendUser, deleteUser } from "../controllers/adminController.js";

const router = express.Router();

router.use(protect);
router.use(authorize("admin"));

router.get("/stats", dashboardStats);
router.get("/users", listUsers);
router.patch("/users/:id/suspend", suspendUser);
router.delete("/users/:id", deleteUser);

export default router;
