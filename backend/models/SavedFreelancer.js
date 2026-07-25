import mongoose from "mongoose";

const savedFreelancerSchema = new mongoose.Schema(
  {
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
    },
  },
  { timestamps: true }
);

// One save per client per freelancer
savedFreelancerSchema.index({ client: 1, freelancer: 1 }, { unique: true });

savedFreelancerSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const SavedFreelancer = mongoose.model("SavedFreelancer", savedFreelancerSchema);
export default SavedFreelancer;
