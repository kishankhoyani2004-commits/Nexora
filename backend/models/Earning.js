import mongoose from "mongoose";

const earningSchema = new mongoose.Schema(
  {
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    // Null for a whole-contract earning record; set when this payment is
    // tied to releasing one specific milestone's funds.
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Milestone",
      default: null,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    status: {
      type: String,
      enum: ["pending", "in_escrow", "released", "withdrawn", "refunded"],
      default: "pending",
    },
    // How the funds moved — "stripe" once a real PaymentIntent backs the
    // contract, "escrow" for the internal-ledger-only path used today.
    method: {
      type: String,
      enum: ["escrow", "stripe", "card", "bank_transfer"],
      default: "escrow",
    },
    // When the payment actually left escrow (release) or was reversed
    // (refund) — distinct from createdAt, which is when the ledger entry
    // was first opened (e.g. contract funding time).
    paidAt: {
      type: Date,
      default: null,
    },
    description: {
      type: String,
      default: "",
    },
    notes: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

earningSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Earning = mongoose.model("Earning", earningSchema);
export default Earning;
