import Contract from "../models/Contract.js";
import Milestone from "../models/Milestone.js";
import Earning from "../models/Earning.js";
import Job from "../models/Job.js";
import { refundPaymentIntent } from "./stripeService.js";
import { logActivity } from "./workspaceService.js";
import { notifyUser } from "./notificationService.js";
import { generateInvoiceForEarning, markInvoiceRefunded } from "./invoiceService.js";

const otherPartyId = (contract, userId) =>
  contract.client.toString() === userId ? contract.freelancer.toString() : contract.client.toString();

// If every milestone on a contract is now approved/completed, the project is
// done — release the whole escrow and close the job. Shared by both the
// per-milestone release path and the manual whole-contract release.
export const maybeAutoCompleteContract = async (contract, actorId, io) => {
  const allMilestones = await Milestone.find({ contract: contract._id });
  if (allMilestones.length === 0) return;

  const allDone = allMilestones.every((m) => m.status === "approved" || m.status === "completed");
  if (!allDone || contract.status === "completed") return;

  contract.status = "completed";
  contract.escrowStatus = "released";
  await contract.save();
  await Job.findByIdAndUpdate(contract.job, { status: "completed" });
  await logActivity(contract._id, actorId, "project_completed", "All milestones approved — project marked completed.");
  await notifyUser({
    io,
    recipient: otherPartyId(contract, actorId.toString()),
    title: "Project completed",
    message: `"${contract.title}" is complete — all milestones approved.`,
    type: "project",
    link: `/workspace/${contract._id}?tab=Overview`,
  });
};

// The single source of truth for "release this milestone's payment" — used
// by both the Workspace milestone-review flow (approve ⇒ pay) and the
// dedicated Payments dashboard action, so there is exactly one place that
// creates/updates the Earning ledger entry.
export const releaseMilestonePayment = async ({ milestoneId, actorId, io }) => {
  const milestone = await Milestone.findById(milestoneId);
  if (!milestone) {
    const err = new Error("Milestone not found.");
    err.status = 404;
    throw err;
  }

  if (!["submitted", "approved"].includes(milestone.status)) {
    const err = new Error("Only submitted milestones can have payment released.");
    err.status = 400;
    throw err;
  }

  const contract = await Contract.findById(milestone.contract);
  if (!contract) {
    const err = new Error("Contract not found.");
    err.status = 404;
    throw err;
  }

  let earning = await Earning.findOne({ contract: contract._id, milestone: milestone._id });
  if (earning && earning.status === "released") {
    const err = new Error("Payment for this milestone has already been released.");
    err.status = 400;
    throw err;
  }

  // Stripe isn't wired for per-milestone transfers (that needs Stripe
  // Connect payouts, out of scope here) — but if this contract was funded
  // through a real PaymentIntent, label the ledger entry accordingly so the
  // Payments UI reflects reality instead of implying escrow-only.
  const method = contract.stripePaymentIntentId ? "stripe" : "escrow";
  const paidAt = new Date();

  if (earning) {
    earning.status = "released";
    earning.method = method;
    earning.paidAt = paidAt;
  } else {
    earning = new Earning({
      freelancer: contract.freelancer,
      contract: contract._id,
      milestone: milestone._id,
      job: contract.job,
      client: contract.client,
      amount: milestone.budget,
      status: "released",
      method,
      paidAt,
      description: `Milestone payment: ${milestone.title}`,
    });
  }
  await earning.save();
  await generateInvoiceForEarning(earning);

  milestone.status = "approved";
  milestone.progress = 100;
  await milestone.save();

  await maybeAutoCompleteContract(contract, actorId, io);

  return earning;
};

// Releases whatever portion of a contract's budget hasn't been paid out yet
// as a single final Earning entry — used when a client approves a whole
// Project Submission (as opposed to releasing milestone-by-milestone).
// Caps the amount at (budget - already released) so it never double-pays a
// contract that already had some milestones released individually, and
// reuses the original whole-contract escrow entry created at contract
// creation time when one is still outstanding.
export const releaseContractPayment = async ({ contractId, actorId, io }) => {
  const contract = await Contract.findById(contractId);
  if (!contract) {
    const err = new Error("Contract not found.");
    err.status = 404;
    throw err;
  }

  const releasedAgg = await Earning.aggregate([
    { $match: { contract: contract._id, status: { $in: ["released", "withdrawn"] } } },
    { $group: { _id: null, total: { $sum: "$amount" } } },
  ]);
  const alreadyReleased = releasedAgg[0]?.total || 0;
  const remaining = Math.max(0, contract.budget - alreadyReleased);

  if (remaining <= 0) return null;

  const method = contract.stripePaymentIntentId ? "stripe" : "escrow";
  const paidAt = new Date();

  let earning = await Earning.findOne({
    contract: contract._id,
    milestone: null,
    status: { $in: ["pending", "in_escrow"] },
  });

  if (earning) {
    earning.amount = remaining;
    earning.status = "released";
    earning.method = method;
    earning.paidAt = paidAt;
  } else {
    earning = new Earning({
      freelancer: contract.freelancer,
      contract: contract._id,
      milestone: null,
      job: contract.job,
      client: contract.client,
      amount: remaining,
      status: "released",
      method,
      paidAt,
      description: `Final project payment: ${contract.title}`,
    });
  }
  await earning.save();
  await generateInvoiceForEarning(earning);

  return earning;
};

// Reverses a released (or still-escrowed) payment. Refunding is a client
// action taken from the Payments dashboard — separate from milestone
// approval/rejection, which only affects the Workspace review flow.
export const refundEarning = async ({ earningId, actorId, io }) => {
  const earning = await Earning.findById(earningId);
  if (!earning) {
    const err = new Error("Transaction not found.");
    err.status = 404;
    throw err;
  }
  if (earning.status === "refunded") {
    const err = new Error("This transaction has already been refunded.");
    err.status = 400;
    throw err;
  }

  const contract = await Contract.findById(earning.contract);

  if (contract?.stripePaymentIntentId) {
    await refundPaymentIntent(contract.stripePaymentIntentId);
  }

  earning.status = "refunded";
  earning.paidAt = new Date();
  await earning.save();
  await markInvoiceRefunded(earning._id);

  if (contract) {
    // Only cascade the contract-level escrow status when nothing else on it
    // has actually been released — a partial per-milestone refund shouldn't
    // silently undo other milestones' completed payments.
    const siblingEarnings = await Earning.find({ contract: contract._id });
    const anyReleased = siblingEarnings.some((e) => e.status === "released");
    if (!anyReleased) {
      contract.escrowStatus = "refunded";
      contract.status = "cancelled";
      await contract.save();
    }

    await logActivity(contract._id, actorId, "payment_refunded", `Refund issued for "${earning.description || contract.title}".`);
    await notifyUser({
      io,
      recipient: otherPartyId(contract, actorId.toString()),
      title: "Payment refunded",
      message: `A refund of ${earning.amount} was issued for "${contract.title}".`,
      type: "project",
      link: `/client/payments`,
    });
  }

  return earning;
};
