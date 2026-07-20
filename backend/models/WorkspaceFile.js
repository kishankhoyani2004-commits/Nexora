import mongoose from "mongoose";

const workspaceFileSchema = new mongoose.Schema(
  {
    projectId: {
      type: String,
      required: true,
      index: true,
    },
    name: {
      type: String,
      required: true,
    },
    size: {
      type: String,
      required: true,
    },
    url: {
      type: String,
      required: true,
    },
    thumbnailUrl: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

workspaceFileSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const WorkspaceFile = mongoose.model("WorkspaceFile", workspaceFileSchema);
export default WorkspaceFile;
