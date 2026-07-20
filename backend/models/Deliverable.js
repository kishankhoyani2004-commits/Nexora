import mongoose from "mongoose";

const deliverableSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    milestone: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Milestone",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    fileType: {
      type: String,
      required: true,
    },
    fileSize: {
      type: String,
      required: true,
    },
    fileUrl: {
      type: String,
      default: "",
    },
    gitRepoUrl: {
      type: String,
      default: "",
    },
    liveSiteUrl: {
      type: String,
      default: "",
    },
    version: {
      type: Number,
      default: 1,
    },
    feedback: {
      type: String,
      default: "",
    },
    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

deliverableSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Deliverable = mongoose.model("Deliverable", deliverableSchema);
export default Deliverable;
