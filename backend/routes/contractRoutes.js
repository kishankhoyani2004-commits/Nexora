import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { createContract, listContracts, getContractById, updateStatus } from "../controllers/contractController.js";

const router = express.Router();

router.post("/", protect, createContract);
router.get("/", protect, listContracts);
router.get("/:id", protect, getContractById);
router.patch("/:id", protect, updateStatus);

export default router;
