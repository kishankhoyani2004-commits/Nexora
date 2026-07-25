import mongoose from "mongoose";

const projectSubmissionSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
      unique: true,
      index: true,
    },
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    notes: {
      type: String,
      default: "",
    },
    links: {
      type: [String],
      default: [],
    },
    files: [
      {
        name: String,
        url: String,
        mimetype: String,
        size: String,
      },
    ],
    status: {
      type: String,
      enum: ["pending", "approved", "revision_requested"],
      default: "pending",
    },
    clientFeedback: {
      type: String,
      default: "",
    },
    reviewedAt: {
      type: Date,
      default: null,
    },
  },
  { timestamps: true }
);

projectSubmissionSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const ProjectSubmission = mongoose.model("ProjectSubmission", projectSubmissionSchema);
export default ProjectSubmission;
