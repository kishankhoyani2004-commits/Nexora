import mongoose from "mongoose";

const workspaceActivitySchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    actor: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    action: {
      type: String,
      required: true,
    },
    message: {
      type: String,
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

workspaceActivitySchema.index({ contract: 1, createdAt: -1 });

workspaceActivitySchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const WorkspaceActivity = mongoose.model("WorkspaceActivity", workspaceActivitySchema);
export default WorkspaceActivity;
