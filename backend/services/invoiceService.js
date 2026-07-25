import PDFDocument from "pdfkit";
import Invoice from "../models/Invoice.js";
import Earning from "../models/Earning.js";
import User from "../models/User.js";
import Job from "../models/Job.js";
import Contract from "../models/Contract.js";
import Milestone from "../models/Milestone.js";

// Platform service fee (mirrors the frontend's PLATFORM_FEE constant) plus
// GST charged on that fee — the same "service fee + tax on the fee" model
// Upwork uses for India-based accounts, rather than taxing the full amount.
export const PLATFORM_FEE_RATE = 0.1;
export const TAX_RATE = 0.18;

const generateInvoiceNumber = async () => {
  const year = new Date().getFullYear();
  const count = await Invoice.countDocuments();
  return `INV-${year}-${String(count + 1).padStart(6, "0")}`;
};

// Called once per Earning the moment it's released (from paymentService).
// Idempotent — if an invoice already exists for this earning (e.g. a retry),
// the existing one is returned instead of creating a duplicate.
export const generateInvoiceForEarning = async (earning) => {
  const existing = await Invoice.findOne({ earning: earning._id });
  if (existing) return existing;

  const platformFee = Math.round(earning.amount * PLATFORM_FEE_RATE * 100) / 100;
  const taxAmount = Math.round(platformFee * TAX_RATE * 100) / 100;
  const netAmount = Math.round((earning.amount - platformFee - taxAmount) * 100) / 100;

  let invoiceNumber = await generateInvoiceNumber();

  try {
    return await Invoice.create({
      invoiceNumber,
      earning: earning._id,
      contract: earning.contract,
      milestone: earning.milestone || null,
      job: earning.job,
      client: earning.client,
      freelancer: earning.freelancer,
      amount: earning.amount,
      platformFeeRate: PLATFORM_FEE_RATE,
      platformFee,
      taxRate: TAX_RATE,
      taxAmount,
      netAmount,
      issuedAt: new Date(),
    });
  } catch (err) {
    // Duplicate invoiceNumber race (two releases in the same instant) — retry once.
    if (err.code === 11000) {
      invoiceNumber = await generateInvoiceNumber();
      return await Invoice.create({
        invoiceNumber,
        earning: earning._id,
        contract: earning.contract,
        milestone: earning.milestone || null,
        job: earning.job,
        client: earning.client,
        freelancer: earning.freelancer,
        amount: earning.amount,
        platformFeeRate: PLATFORM_FEE_RATE,
        platformFee,
        taxRate: TAX_RATE,
        taxAmount,
        netAmount,
        issuedAt: new Date(),
      });
    }
    throw err;
  }
};

// Marks the invoice for an earning as refunded — called from the refund flow
// so an invoice's status always reflects the underlying Earning's fate.
export const markInvoiceRefunded = async (earningId) => {
  await Invoice.findOneAndUpdate({ earning: earningId }, { status: "refunded" });
};

export const getInvoicesForUser = async (userId, role) => {
  const query = role === "client" ? { client: userId } : { freelancer: userId };
  const invoices = await Invoice.find(query)
    .populate("client", "fullName companyName email")
    .populate("freelancer", "fullName email")
    .populate("job", "title")
    .populate("contract", "title")
    .populate("milestone", "title")
    .sort({ issuedAt: -1 });
  return invoices;
};

export const getInvoiceById = async (invoiceId) => {
  return Invoice.findById(invoiceId)
    .populate("client", "fullName companyName email address gstId")
    .populate("freelancer", "fullName email address")
    .populate("job", "title")
    .populate("contract", "title")
    .populate("milestone", "title");
};

const row = (doc, label, value) => {
  doc.fontSize(9).fillColor("#666666").text(label, { continued: true });
  doc.fontSize(9).fillColor("#111111").text(`  ${value}`);
};

// Renders the full invoice PDF and pipes it straight to the response stream.
export const streamInvoicePdf = (invoice, res) => {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${invoice.invoiceNumber}.pdf"`);
  doc.pipe(res);

  doc.fontSize(22).fillColor("#4c3fd6").text("Nexora");
  doc.fontSize(10).fillColor("#666666").text("AI-Powered Freelance Marketplace");
  doc.moveDown(1.2);

  doc.fontSize(18).fillColor("#111111").text("INVOICE");
  doc.moveDown(0.3);
  row(doc, "Invoice Number:", invoice.invoiceNumber);
  row(doc, "Issued Date:", new Date(invoice.issuedAt).toLocaleDateString("en-IN", { year: "numeric", month: "long", day: "numeric" }));
  row(doc, "Status:", invoice.status === "paid" ? "Paid" : "Refunded");
  doc.moveDown(1);

  const colY = doc.y;
  doc.fontSize(10).fillColor("#4c3fd6").text("Bill To (Client)", 50, colY);
  doc.fontSize(9).fillColor("#111111").text(invoice.client?.companyName || invoice.client?.fullName || "—", 50, colY + 16);
  doc.fontSize(9).fillColor("#666666").text(invoice.client?.email || "", 50, colY + 30);
  if (invoice.client?.address) doc.text(invoice.client.address, 50, colY + 44, { width: 240 });
  if (invoice.client?.gstId) doc.text(`GSTIN: ${invoice.client.gstId}`, 50, colY + 58);

  doc.fontSize(10).fillColor("#4c3fd6").text("From (Freelancer)", 320, colY);
  doc.fontSize(9).fillColor("#111111").text(invoice.freelancer?.fullName || "—", 320, colY + 16);
  doc.fontSize(9).fillColor("#666666").text(invoice.freelancer?.email || "", 320, colY + 30);

  doc.y = colY + 90;
  doc.moveDown(1);

  doc.fontSize(10).fillColor("#4c3fd6").text("Project Details");
  doc.moveDown(0.3);
  row(doc, "Project:", invoice.contract?.title || invoice.job?.title || "—");
  if (invoice.milestone) row(doc, "Milestone:", invoice.milestone.title);
  doc.moveDown(1);

  // Amount breakdown table
  const tableTop = doc.y;
  const col1 = 50, col2 = 400;
  doc.fontSize(9).fillColor("#666666");
  doc.text("Description", col1, tableTop);
  doc.text("Amount", col2, tableTop, { width: 100, align: "right" });
  doc.moveTo(50, tableTop + 16).lineTo(545, tableTop + 16).strokeColor("#e5e7eb").stroke();

  let y = tableTop + 24;
  const line = (label, value, color = "#111111") => {
    doc.fontSize(9).fillColor("#374151").text(label, col1, y);
    doc.fontSize(9).fillColor(color).text(value, col2, y, { width: 100, align: "right" });
    y += 20;
  };

  line("Gross Payment", `Rs. ${invoice.amount.toLocaleString("en-IN")}`);
  line(`Platform Fee (${Math.round(invoice.platformFeeRate * 100)}%)`, `- Rs. ${invoice.platformFee.toLocaleString("en-IN")}`, "#dc2626");
  line(`GST on Fee (${Math.round(invoice.taxRate * 100)}%)`, `- Rs. ${invoice.taxAmount.toLocaleString("en-IN")}`, "#dc2626");

  doc.moveTo(50, y).lineTo(545, y).strokeColor("#e5e7eb").stroke();
  y += 10;
  doc.fontSize(11).fillColor("#111111").text("Net Amount", col1, y, { continued: false });
  doc.fontSize(11).fillColor("#0f9d6b").text(`Rs. ${invoice.netAmount.toLocaleString("en-IN")}`, col2, y, { width: 100, align: "right" });

  doc.moveDown(4);
  doc.fontSize(8).fillColor("#999999").text("This is a system-generated invoice from Nexora and does not require a signature.", { align: "center" });

  doc.end();
};
