import BillingMethod from "../models/BillingMethod.js";
import User from "../models/User.js";

const toSafe = (m) => {
  const obj = m.toJSON ? m.toJSON() : m;
  return obj;
};

export const listBillingMethods = async (userId) => {
  const methods = await BillingMethod.find({ user: userId }).sort({ isDefault: -1, createdAt: -1 });
  return methods.map(toSafe);
};

export const addBillingMethod = async (userId, payload) => {
  const { type } = payload;
  if (!["card", "upi", "netbanking"].includes(type)) {
    const err = new Error("Select a valid payment method type.");
    err.status = 400;
    throw err;
  }

  const data = { user: userId, type, label: payload.label || "" };

  if (type === "card") {
    const { cardNumber, cardBrand, expiryMonth, expiryYear } = payload;
    if (!cardNumber || cardNumber.replace(/\s/g, "").length < 12) {
      const err = new Error("Enter a valid card number.");
      err.status = 400;
      throw err;
    }
    if (!expiryMonth || !expiryYear) {
      const err = new Error("Card expiry month and year are required.");
      err.status = 400;
      throw err;
    }
    const digitsOnly = cardNumber.replace(/\s/g, "");
    data.last4 = digitsOnly.slice(-4);
    data.cardBrand = cardBrand || "Card";
    data.expiryMonth = Number(expiryMonth);
    data.expiryYear = Number(expiryYear);
    // The full card number is never persisted — only the masked last4 above.
  } else if (type === "upi") {
    if (!payload.upiId || !payload.upiId.includes("@")) {
      const err = new Error("Enter a valid UPI ID.");
      err.status = 400;
      throw err;
    }
    data.upiId = payload.upiId;
  } else if (type === "netbanking") {
    if (!payload.bankName) {
      const err = new Error("Select a bank.");
      err.status = 400;
      throw err;
    }
    data.bankName = payload.bankName;
  }

  const existingCount = await BillingMethod.countDocuments({ user: userId });
  data.isDefault = existingCount === 0 || !!payload.isDefault;

  if (data.isDefault) {
    await BillingMethod.updateMany({ user: userId }, { isDefault: false });
  }

  const method = await BillingMethod.create(data);
  return toSafe(method);
};

export const deleteBillingMethod = async (userId, methodId) => {
  const method = await BillingMethod.findOne({ _id: methodId, user: userId });
  if (!method) {
    const err = new Error("Payment method not found.");
    err.status = 404;
    throw err;
  }
  await method.deleteOne();

  if (method.isDefault) {
    const next = await BillingMethod.findOne({ user: userId }).sort({ createdAt: -1 });
    if (next) {
      next.isDefault = true;
      await next.save();
    }
  }
  return true;
};

export const setDefaultBillingMethod = async (userId, methodId) => {
  const method = await BillingMethod.findOne({ _id: methodId, user: userId });
  if (!method) {
    const err = new Error("Payment method not found.");
    err.status = 404;
    throw err;
  }
  await BillingMethod.updateMany({ user: userId }, { isDefault: false });
  method.isDefault = true;
  await method.save();
  return toSafe(method);
};

// Billing profile (address / GST) reuses the existing User fields rather
// than duplicating them in a new collection.
export const getBillingProfile = async (userId) => {
  const user = await User.findById(userId).select("companyName address gstId country state city");
  return {
    companyName: user.companyName || "",
    address: user.address || "",
    gstId: user.gstId || "",
    country: user.country || "",
    state: user.state || "",
    city: user.city || "",
  };
};

export const updateBillingProfile = async (userId, payload) => {
  const allowed = ["companyName", "address", "gstId", "country", "state", "city"];
  const update = {};
  for (const key of allowed) {
    if (payload[key] !== undefined) update[key] = payload[key];
  }
  const user = await User.findByIdAndUpdate(userId, update, { new: true }).select("companyName address gstId country state city");
  return {
    companyName: user.companyName || "",
    address: user.address || "",
    gstId: user.gstId || "",
    country: user.country || "",
    state: user.state || "",
    city: user.city || "",
  };
};
