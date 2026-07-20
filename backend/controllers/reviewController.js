import Review from "../models/Review.js";
import Contract from "../models/Contract.js";
import User from "../models/User.js";

export const createReview = async (req, res, next) => {
  try {
    const { contractId, rating, comment } = req.body;

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found." });
    }

    const isClient = contract.client.toString() === req.user.id;
    const isFreelancer = contract.freelancer.toString() === req.user.id;

    if (!isClient && !isFreelancer && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to submit a review for this contract." });
    }

    const reviewee = isClient ? contract.freelancer : contract.client;

    const review = await Review.create({
      contract: contractId,
      reviewer: req.user._id,
      reviewee,
      rating,
      comment: comment || "",
    });

    res.status(201).json({ success: true, data: review, message: "Review submitted successfully." });
  } catch (error) {
    next(error);
  }
};

export const listReviewsForUser = async (req, res, next) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId }).populate("reviewer", "fullName email avatar");
    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
};
