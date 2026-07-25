import mongoose from "mongoose";

const withdrawalSchema = new mongoose.Schema(
  {
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: ["bank", "upi", "paypal"],
      required: true,
    },
    // Only the details relevant to the chosen method are populated.
    // Numbers are masked before being returned to the client (see
    // withdrawalService) — full account/UPI values are never sent back down.
    destination: {
      // bank
      accountHolderName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
      ifscCode: { type: String, default: "" },
      bankName: { type: String, default: "" },
      // upi
      upiId: { type: String, default: "" },
      // paypal (future-ready — accepted but not yet payable)
      paypalEmail: { type: String, default: "" },
    },
    status: {
      type: String,
      enum: ["pending", "processing", "completed", "failed", "rejected"],
      default: "pending",
      index: true,
    },
    failureReason: {
      type: String,
      default: "",
    },
    // System-generated reference shown to the user, independent of Mongo's _id format.
    reference: {
      type: String,
      required: true,
      unique: true,
    },
    processedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

withdrawalSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Withdrawal = mongoose.model("Withdrawal", withdrawalSchema);
export default Withdrawal;
