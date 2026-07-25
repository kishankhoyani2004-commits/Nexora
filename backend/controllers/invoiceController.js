import { getInvoicesForUser, getInvoiceById } from "../services/invoiceService.js";
import { streamInvoicePdf } from "../services/invoiceService.js";

const shapeInvoice = (inv) => ({
  id: inv._id.toString(),
  invoiceNumber: inv.invoiceNumber,
  projectTitle: inv.contract?.title || inv.job?.title || "Untitled Project",
  milestoneTitle: inv.milestone?.title || null,
  clientName: inv.client?.companyName || inv.client?.fullName || "Unknown",
  clientEmail: inv.client?.email || "",
  freelancerName: inv.freelancer?.fullName || "Unknown",
  freelancerEmail: inv.freelancer?.email || "",
  amount: inv.amount,
  platformFee: inv.platformFee,
  taxAmount: inv.taxAmount,
  netAmount: inv.netAmount,
  currency: inv.currency,
  status: inv.status,
  issuedAt: inv.issuedAt,
});

// GET /api/invoices
export const listInvoices = async (req, res, next) => {
  try {
    const invoices = await getInvoicesForUser(req.user._id, req.user.role);
    res.status(200).json({ success: true, data: invoices.map(shapeInvoice) });
  } catch (error) {
    next(error);
  }
};

// GET /api/invoices/:id
export const getInvoice = async (req, res, next) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }
    const isParty = [invoice.client?._id?.toString(), invoice.freelancer?._id?.toString()].includes(req.user.id);
    if (!isParty && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to view this invoice." });
    }
    res.status(200).json({ success: true, data: shapeInvoice(invoice) });
  } catch (error) {
    next(error);
  }
};

// GET /api/invoices/:id/pdf — used for both "Download PDF" and "Print" (the
// browser's print dialog opens on the same rendered PDF).
export const downloadInvoicePdf = async (req, res, next) => {
  try {
    const invoice = await getInvoiceById(req.params.id);
    if (!invoice) {
      return res.status(404).json({ success: false, message: "Invoice not found." });
    }
    const isParty = [invoice.client?._id?.toString(), invoice.freelancer?._id?.toString()].includes(req.user.id);
    if (!isParty && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to view this invoice." });
    }
    streamInvoicePdf(invoice, res);
  } catch (error) {
    next(error);
  }
};
