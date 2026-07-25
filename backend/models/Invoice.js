import mongoose from "mongoose";

// One Invoice is created per released Earning (see invoiceService.generateInvoiceForEarning,
// called from paymentService on milestone/contract release). It carries the
// full fee breakdown (platform fee + tax) that the Earning ledger itself does
// not persist, and is what both the freelancer's "Invoices" tab and the
// client's "Invoices" tab read from — same document, viewed from either side.
const invoiceSchema = new mongoose.Schema(
  {
    invoiceNumber: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    earning: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Earning",
      required: true,
      unique: true,
    },
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Milestone",
      default: null,
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
      index: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    // Gross amount released to the freelancer for this line item.
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    platformFeeRate: {
      type: Number,
      required: true,
    },
    platformFee: {
      type: Number,
      required: true,
      min: 0,
    },
    taxRate: {
      type: Number,
      default: 0,
    },
    taxAmount: {
      type: Number,
      default: 0,
      min: 0,
    },
    // amount - platformFee - taxAmount — what the freelancer actually nets.
    netAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    currency: {
      type: String,
      default: "INR",
    },
    status: {
      type: String,
      enum: ["paid", "refunded"],
      default: "paid",
    },
    issuedAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

invoiceSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Invoice = mongoose.model("Invoice", invoiceSchema);
export default Invoice;
