import Stripe from "stripe";
import PDFDocument from "pdfkit";
import { createPaymentIntent } from "../services/stripeService.js";
import { releaseMilestonePayment, refundEarning } from "../services/paymentService.js";
import Contract from "../models/Contract.js";
import Milestone from "../models/Milestone.js";
import Earning from "../models/Earning.js";
import User from "../models/User.js";

const stripeInstance = process.env.STRIPE_SECRET_KEY ? new Stripe(process.env.STRIPE_SECRET_KEY) : null;

export const createIntent = async (req, res, next) => {
  try {
    const { contractId } = req.body;

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found." });
    }

    const intent = await createPaymentIntent(contract.budget, "usd", {
      contractId: contract._id.toString(),
      clientId: req.user.id,
    });

    contract.stripePaymentIntentId = intent.id;
    await contract.save();

    res.status(200).json({
      success: true,
      data: {
        clientSecret: intent.clientSecret,
        paymentIntentId: intent.id,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const handleWebhook = async (req, res, next) => {
  try {
    let event;

    if (stripeInstance && process.env.STRIPE_WEBHOOK_SECRET) {
      // Real verification path — requires the RAW request body (see the
      // express.raw() mount for this route in app.js, registered before the
      // global express.json() so it isn't pre-parsed).
      const signature = req.headers["stripe-signature"];
      try {
        event = stripeInstance.webhooks.constructEvent(req.body, signature, process.env.STRIPE_WEBHOOK_SECRET);
      } catch (err) {
        console.error("[STRIPE WEBHOOK] Signature verification failed:", err.message);
        return res.status(400).send(`Webhook Error: ${err.message}`);
      }
    } else {
      // No webhook secret configured (dev/mock mode) — parse the raw body
      // as JSON without signature verification.
      const raw = Buffer.isBuffer(req.body) ? req.body.toString("utf8") : JSON.stringify(req.body);
      event = raw ? JSON.parse(raw) : req.body;
    }

    console.log(`[STRIPE WEBHOOK] Received event: ${event.type}`);

    if (event.type === "payment_intent.succeeded") {
      const intent = event.data.object;
      const contractId = intent.metadata?.contractId;

      const contract = contractId ? await Contract.findById(contractId) : null;
      if (contract) {
        contract.escrowStatus = "funded";
        contract.status = "active";
        await contract.save();
        console.log(`✅ [STRIPE SUCCESS] Contract ${contractId} marked as active and funded.`);
      }
    }

    res.status(200).json({ received: true });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/history?status=completed|pending|refunded
// The Earning collection (not Contract) is the real per-milestone/per-contract
// ledger, so it's the single source of truth for transaction history — a
// contract can have many earnings (one per milestone) plus a whole-contract one.
const displayStatus = (rawStatus) => {
  if (rawStatus === "released" || rawStatus === "withdrawn") return "completed";
  if (rawStatus === "refunded") return "refunded";
  return "pending"; // "pending" | "in_escrow"
};

export const listTransactions = async (req, res, next) => {
  try {
    const query = req.user.role === "client" ? { client: req.user._id } : { freelancer: req.user._id };

    const { status } = req.query;
    if (status === "completed") query.status = { $in: ["released", "withdrawn"] };
    else if (status === "pending") query.status = { $in: ["pending", "in_escrow"] };
    else if (status === "refunded") query.status = "refunded";

    const earnings = await Earning.find(query)
      .populate("freelancer", "fullName email avatar")
      .populate("client", "fullName email companyName avatar")
      .populate("job", "title")
      .populate("milestone", "title")
      .populate("contract", "title stripePaymentIntentId")
      .sort({ createdAt: -1 });

    const history = earnings.map((e) => ({
      id: e._id.toString(),
      transactionId: `TXN-${e._id.toString().slice(-8).toUpperCase()}`,
      projectTitle: e.contract?.title || e.job?.title || "Untitled Project",
      projectId: e.job?._id?.toString() || null,
      contractId: e.contract?._id?.toString() || null,
      milestoneId: e.milestone?._id?.toString() || null,
      milestoneTitle: e.milestone?.title || null,
      freelancerName: e.freelancer?.fullName || "Unknown",
      freelancerAvatar: e.freelancer?.avatar || "",
      clientName: e.client?.companyName || e.client?.fullName || "Unknown",
      amount: e.amount,
      method: e.method,
      status: displayStatus(e.status),
      rawStatus: e.status,
      description: e.description,
      // Kept for backward-compat with existing consumers (Settings.tsx earnings
      // tab) that already expect `date`/`amount`/`status`/`projectTitle`.
      date: (e.paidAt || e.updatedAt).toISOString(),
      type: req.user.role === "freelancer" && displayStatus(e.status) === "completed" ? "payout" : "charge",
    }));

    res.status(200).json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};

// GET /api/payments/releasable-milestones
// Milestones the client has received work for (status "submitted") and can
// release payment on directly from the Payments dashboard, without having to
// open each project's Workspace individually.
export const getReleasableMilestones = async (req, res, next) => {
  try {
    if (req.user.role !== "client") {
      return res.status(403).json({ success: false, message: "Only clients can view releasable milestones." });
    }

    const contracts = await Contract.find({ client: req.user._id }).select("_id title freelancer");
    const contractIds = contracts.map((c) => c._id);
    const contractMap = new Map(contracts.map((c) => [c._id.toString(), c]));

    const freelancerIds = [...new Set(contracts.map((c) => c.freelancer.toString()))];
    const freelancers = await User.find({ _id: { $in: freelancerIds } }).select("fullName avatar");
    const freelancerMap = new Map(freelancers.map((f) => [f._id.toString(), f]));

    const milestones = await Milestone.find({ contract: { $in: contractIds }, status: "submitted" }).sort({ updatedAt: -1 });

    const data = milestones.map((m) => {
      const contract = contractMap.get(m.contract.toString());
      const freelancer = contract ? freelancerMap.get(contract.freelancer.toString()) : null;
      return {
        milestoneId: m._id.toString(),
        contractId: contract?._id?.toString() || null,
        projectTitle: contract?.title || "Untitled Project",
        freelancerName: freelancer?.fullName || "Unknown",
        freelancerAvatar: freelancer?.avatar || "",
        title: m.title,
        budget: m.budget,
        dueDate: m.dueDate,
        submissionText: m.submissionText,
        submissionUrl: m.submissionUrl,
      };
    });

    res.status(200).json({ success: true, data });
  } catch (error) {
    next(error);
  }
};

// POST /api/payments/milestones/:milestoneId/release
export const releaseMilestonePaymentHandler = async (req, res, next) => {
  try {
    const milestone = await Milestone.findById(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }

    const contract = await Contract.findById(milestone.contract);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found." });
    }

    if (contract.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to release this payment." });
    }

    const earning = await releaseMilestonePayment({
      milestoneId: milestone._id,
      actorId: req.user._id,
      io: req.app.get("io"),
    });

    res.status(200).json({ success: true, data: earning, message: "Milestone payment released successfully." });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
};

// POST /api/payments/:earningId/refund
export const refundPaymentHandler = async (req, res, next) => {
  try {
    const earning = await Earning.findById(req.params.earningId);
    if (!earning) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    if (earning.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to refund this transaction." });
    }

    const updated = await refundEarning({
      earningId: earning._id,
      actorId: req.user._id,
      io: req.app.get("io"),
    });

    res.status(200).json({ success: true, data: updated, message: "Refund processed successfully." });
  } catch (error) {
    if (error.status) return res.status(error.status).json({ success: false, message: error.message });
    next(error);
  }
};

// GET /api/payments/:earningId/receipt — streams a generated PDF receipt.
export const getReceipt = async (req, res, next) => {
  try {
    const earning = await Earning.findById(req.params.earningId)
      .populate("freelancer", "fullName email")
      .populate("client", "fullName email companyName")
      .populate("job", "title")
      .populate("contract", "title")
      .populate("milestone", "title");

    if (!earning) {
      return res.status(404).json({ success: false, message: "Transaction not found." });
    }

    const isParty = [earning.client?._id?.toString(), earning.freelancer?._id?.toString()].includes(req.user.id);
    if (!isParty && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to view this receipt." });
    }

    const txId = `TXN-${earning._id.toString().slice(-8).toUpperCase()}`;
    const doc = new PDFDocument({ size: "A4", margin: 50 });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="receipt-${txId}.pdf"`);
    doc.pipe(res);

    doc.fontSize(20).fillColor("#4c3fd6").text("Nexora");
    doc.fontSize(10).fillColor("#666666").text("AI-Powered Freelance Marketplace");
    doc.moveDown(1.5);

    doc.fontSize(16).fillColor("#111111").text("Payment Receipt");
    doc.moveDown(0.5);
    doc.fontSize(10).fillColor("#666666").text(`Transaction ID: ${txId}`);
    doc.text(`Date: ${new Date(earning.paidAt || earning.updatedAt).toLocaleString()}`);
    doc.moveDown(1);

    const row = (label, value) => {
      doc.fontSize(10).fillColor("#666666").text(label, { continued: true });
      doc.fillColor("#111111").text(`  ${value}`);
    };

    row("Project:", earning.contract?.title || earning.job?.title || "—");
    if (earning.milestone) row("Milestone:", earning.milestone.title);
    row("Client:", earning.client?.companyName || earning.client?.fullName || "—");
    row("Freelancer:", earning.freelancer?.fullName || "—");
    row("Amount:", `Rs. ${earning.amount.toLocaleString("en-IN")}`);
    row("Payment Method:", earning.method);
    row("Status:", earning.status);

    doc.moveDown(2);
    doc.fontSize(9).fillColor("#999999").text("This is a system-generated receipt from Nexora.", { align: "center" });

    doc.end();
  } catch (error) {
    next(error);
  }
};
