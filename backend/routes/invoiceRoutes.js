import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { listInvoices, getInvoice, downloadInvoicePdf } from "../controllers/invoiceController.js";

const router = express.Router();

router.get("/", protect, listInvoices);
router.get("/:id", protect, getInvoice);
router.get("/:id/pdf", protect, downloadInvoicePdf);

export default router;
