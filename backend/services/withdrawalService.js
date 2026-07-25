import crypto from "crypto";
import mongoose from "mongoose";
import Earning from "../models/Earning.js";
import Withdrawal from "../models/Withdrawal.js";

export const MIN_WITHDRAWAL_AMOUNT = 500;

// No live payout gateway is wired up (bank/UPI transfers and PayPal are all
// "future-ready" per spec), so processing is simulated: a request is created
// as "processing" immediately (funds are already validated/reserved) and
// flips to "completed" after a short delay, mirroring the real multi-stage
// lifecycle a payout would go through without needing a queue/cron worker.
const SIMULATED_PROCESSING_MS = 8000;

const generateReference = () => `WD-${Date.now().toString(36).toUpperCase()}-${crypto.randomBytes(2).toString("hex").toUpperCase()}`;

const maskAccountNumber = (value) => (value && value.length > 4 ? `••••${value.slice(-4)}` : value);
const maskUpi = (value) => {
  if (!value || !value.includes("@")) return value;
  const [name, handle] = value.split("@");
  return `${name.slice(0, 2)}${"•".repeat(Math.max(1, name.length - 2))}@${handle}`;
};

// Strips raw destination details down to what's safe to ever send back to
// the client — the full account number/UPI id are write-only.
const toSafeWithdrawal = (w) => {
  const obj = w.toJSON ? w.toJSON() : w;
  const destination = { ...obj.destination };
  if (destination.accountNumber) destination.accountNumber = maskAccountNumber(destination.accountNumber);
  if (destination.upiId) destination.upiId = maskUpi(destination.upiId);
  if (destination.paypalEmail) destination.paypalEmail = destination.paypalEmail;
  return { ...obj, destination };
};

// Released-and-not-yet-withdrawn balance. Withdrawals in any non-terminal-failed
// state (pending/processing/completed) reserve funds so a user can't request
// more than they actually have available, even before a request completes.
export const getAvailableBalance = async (freelancerId) => {
  const [releasedAgg, reservedAgg] = await Promise.all([
    Earning.aggregate([
      { $match: { freelancer: new mongoose.Types.ObjectId(freelancerId), status: "released" } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
    Withdrawal.aggregate([
      { $match: { freelancer: new mongoose.Types.ObjectId(freelancerId), status: { $in: ["pending", "processing", "completed"] } } },
      { $group: { _id: null, total: { $sum: "$amount" } } },
    ]),
  ]);

  const released = releasedAgg[0]?.total || 0;
  const reserved = reservedAgg[0]?.total || 0;
  return Math.max(0, released - reserved);
};

export const requestWithdrawal = async ({ freelancerId, amount, method, destination }) => {
  if (!amount || amount <= 0) {
    const err = new Error("Enter a valid withdrawal amount.");
    err.status = 400;
    throw err;
  }
  if (amount < MIN_WITHDRAWAL_AMOUNT) {
    const err = new Error(`Minimum withdrawal amount is ₹${MIN_WITHDRAWAL_AMOUNT.toLocaleString("en-IN")}.`);
    err.status = 400;
    throw err;
  }
  if (!["bank", "upi", "paypal"].includes(method)) {
    const err = new Error("Select a valid withdrawal method.");
    err.status = 400;
    throw err;
  }

  if (method === "bank" && (!destination?.accountNumber || !destination?.ifscCode || !destination?.accountHolderName)) {
    const err = new Error("Bank account number, IFSC code, and account holder name are required.");
    err.status = 400;
    throw err;
  }
  if (method === "upi" && !destination?.upiId) {
    const err = new Error("UPI ID is required.");
    err.status = 400;
    throw err;
  }
  if (method === "paypal" && !destination?.paypalEmail) {
    const err = new Error("PayPal email is required.");
    err.status = 400;
    throw err;
  }
  if (method === "paypal") {
    const err = new Error("PayPal withdrawals are coming soon — please use Bank Transfer or UPI for now.");
    err.status = 400;
    throw err;
  }

  const available = await getAvailableBalance(freelancerId);
  if (amount > available) {
    const err = new Error(`Insufficient balance. You have ₹${available.toLocaleString("en-IN")} available to withdraw.`);
    err.status = 400;
    throw err;
  }

  const withdrawal = await Withdrawal.create({
    freelancer: freelancerId,
    amount,
    method,
    destination: destination || {},
    status: "processing",
    reference: generateReference(),
  });

  // Simulated payout settlement — no real bank/UPI rail is integrated.
  setTimeout(async () => {
    try {
      await Withdrawal.findByIdAndUpdate(withdrawal._id, { status: "completed", processedAt: new Date() });
    } catch {
      // best-effort — a failed status flip here shouldn't crash the process
    }
  }, SIMULATED_PROCESSING_MS);

  return toSafeWithdrawal(withdrawal);
};

export const listWithdrawals = async (freelancerId) => {
  const withdrawals = await Withdrawal.find({ freelancer: freelancerId }).sort({ createdAt: -1 });
  return withdrawals.map(toSafeWithdrawal);
};
