import mongoose from "mongoose";

// Saved payment methods for a client's Billing tab. Deliberately never stores
// a full card number, CVV, or expiry in a way that could be replayed — only
// a display-safe masked representation, matching how a real PCI-compliant
// integration (Stripe Elements, etc.) would hand back a token + last4.
// UPI/Net Banking are accepted as "future-ready" per spec — no live gateway
// call is made against them yet, same as PayPal on the withdrawal side.
const billingMethodSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ["card", "upi", "netbanking"],
      required: true,
    },
    isDefault: {
      type: Boolean,
      default: false,
    },
    label: {
      type: String,
      default: "",
    },
    // card
    cardBrand: { type: String, default: "" },
    last4: { type: String, default: "" },
    expiryMonth: { type: Number, default: null },
    expiryYear: { type: Number, default: null },
    // upi
    upiId: { type: String, default: "" },
    // netbanking
    bankName: { type: String, default: "" },
  },
  {
    timestamps: true,
  }
);

billingMethodSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const BillingMethod = mongoose.model("BillingMethod", billingMethodSchema);
export default BillingMethod;
