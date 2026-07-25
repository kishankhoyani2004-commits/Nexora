import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    contract: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Contract",
      required: true,
    },
    reviewer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    reviewee: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    // Overall Rating (1-5)
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    communication: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    qualityOfWork: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    deliveryTime: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    professionalism: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
    },
    // Only meaningful for a client reviewing a freelancer — null when a
    // freelancer is reviewing a client.
    recommend: {
      type: Boolean,
      default: null,
    },
    comment: {
      type: String,
      default: "",
    },
  },
  {
    timestamps: true,
  }
);

// One review per reviewer per contract — prevents a client (or freelancer)
// from submitting duplicate reviews for the same project.
reviewSchema.index({ contract: 1, reviewer: 1 }, { unique: true });

reviewSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Review = mongoose.model("Review", reviewSchema);
export default Review;
