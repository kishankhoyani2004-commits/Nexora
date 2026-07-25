import mongoose from "mongoose";

const workspaceTaskSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    title: {
      type: String,
      required: true,
    },
    label: {
      type: String,
      default: "",
    },
    labelColor: {
      type: String,
      default: "",
    },
    assignee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },
    column: {
      type: String,
      enum: ["todo", "in_progress", "review", "completed"],
      default: "todo",
    },
    commentsCount: {
      type: Number,
      default: 0,
    },
    attachmentsCount: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

workspaceTaskSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const WorkspaceTask = mongoose.model("WorkspaceTask", workspaceTaskSchema);
export default WorkspaceTask;
