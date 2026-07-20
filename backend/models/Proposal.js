import mongoose from "mongoose";

const proposalSchema = new mongoose.Schema(
  {
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    bidAmount: {
      type: Number,
      required: true,
      min: 0,
    },
    estimatedDelivery: {
      type: String,
      required: true,
    },
    milestones: [
      {
        name: { type: String, required: true },
        amount: { type: Number, required: true, min: 0 },
      },
    ],
    status: {
      type: String,
      enum: ["draft", "submitted", "shortlisted", "accepted", "rejected", "withdrawn"],
      default: "submitted",
    },
    matchScore: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

proposalSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Proposal = mongoose.model("Proposal", proposalSchema);
export default Proposal;
