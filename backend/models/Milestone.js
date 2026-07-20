import mongoose from "mongoose";

const milestoneSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    title: {
      type: String,
      required: true,
    },
    description: {
      type: String,
    },
    budget: {
      type: Number,
      required: true,
      min: 0,
    },
    dueDate: {
      type: Date,
      required: true,
    },
    status: {
      type: String,
      enum: ["pending", "in_progress", "submitted", "approved", "rejected", "completed"],
      default: "pending",
    },
    submissionText: {
      type: String,
      default: "",
    },
    submissionUrl: {
      type: String,
      default: "",
    },
    clientFeedback: {
      type: String,
      default: "",
    },
    progress: {
      type: Number,
      default: 0,
      min: 0,
      max: 100,
    },
  },
  {
    timestamps: true,
  }
);

milestoneSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Milestone = mongoose.model("Milestone", milestoneSchema);
export default Milestone;
