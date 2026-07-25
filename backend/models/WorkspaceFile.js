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
    mimetype: {
      type: String,
      default: "",
    },
    sizeBytes: {
      type: Number,
      default: 0,
    },
    // Cloudinary public id (or local filename fallback) — needed to actually
    // delete the underlying asset, not just the DB record.
    publicId: {
      type: String,
      default: "",
    },
    uploadedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
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
