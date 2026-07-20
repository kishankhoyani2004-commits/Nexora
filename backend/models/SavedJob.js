import mongoose from "mongoose";

const savedJobSchema = new mongoose.Schema(
  {
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    job: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Job",
      required: true,
    },
  },
  { timestamps: true }
);

// One save per freelancer per job
savedJobSchema.index({ freelancer: 1, job: 1 }, { unique: true });

savedJobSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const SavedJob = mongoose.model("SavedJob", savedJobSchema);
export default SavedJob;
