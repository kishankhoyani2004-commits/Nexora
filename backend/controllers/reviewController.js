import Review from "../models/Review.js";
import Contract from "../models/Contract.js";
import { recalculateUserRating, canEditReview } from "../services/reviewService.js";
import { notifyUser } from "../services/notificationService.js";

const RATING_FIELDS = ["rating", "communication", "qualityOfWork", "deliveryTime", "professionalism"];

const validateRatings = (body) => {
  for (const field of RATING_FIELDS) {
    const value = Number(body[field]);
    if (!value || value < 1 || value > 5) {
      return `${field} must be a rating between 1 and 5.`;
    }
  }
  return null;
};

const serializeReview = (review) => ({ ...review.toJSON(), canEdit: canEditReview(review) });

// POST /api/reviews — only for a completed contract, one review per reviewer.
export const createReview = async (req, res, next) => {
  try {
    const { contractId, comment, recommend } = req.body;

    const validationError = validateRatings(req.body);
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    const contract = await Contract.findById(contractId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Contract not found." });
    }

    const isClient = contract.client.toString() === req.user.id;
    const isFreelancer = contract.freelancer.toString() === req.user.id;

    if (!isClient && !isFreelancer && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to submit a review for this contract." });
    }

    // Requirement: only completed projects can be reviewed.
    if (contract.status !== "completed") {
      return res.status(400).json({ success: false, message: "Only completed projects can be reviewed." });
    }

    const existing = await Review.findOne({ contract: contractId, reviewer: req.user._id });
    if (existing) {
      return res.status(400).json({ success: false, message: "You have already reviewed this project. You can edit your existing review instead." });
    }

    const reviewee = isClient ? contract.freelancer : contract.client;

    const review = await Review.create({
      contract: contractId,
      reviewer: req.user._id,
      reviewee,
      rating: Number(req.body.rating),
      communication: Number(req.body.communication),
      qualityOfWork: Number(req.body.qualityOfWork),
      deliveryTime: Number(req.body.deliveryTime),
      professionalism: Number(req.body.professionalism),
      // "Recommend Freelancer" only applies when a client reviews a freelancer.
      recommend: isClient && typeof recommend === "boolean" ? recommend : null,
      comment: comment || "",
    });

    await recalculateUserRating(reviewee);

    await notifyUser({
      io: req.app.get("io"),
      recipient: reviewee,
      title: "New review received",
      message: `${req.user.fullName} left you a ${review.rating}-star review for "${contract.title}".`,
      type: "approval",
      link: isClient ? "/freelancer/reviews" : "/client/reviews",
    });

    res.status(201).json({ success: true, data: serializeReview(review), message: "Review submitted successfully." });
  } catch (error) {
    if (error.code === 11000) {
      return res.status(400).json({ success: false, message: "You have already reviewed this project." });
    }
    next(error);
  }
};

// PATCH /api/reviews/:id — only the original author, only within the edit window.
export const updateReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ success: false, message: "Review not found." });
    }

    if (review.reviewer.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to edit this review." });
    }

    if (!canEditReview(review) && req.user.role !== "admin") {
      return res.status(400).json({ success: false, message: "The edit window for this review has passed." });
    }

    const validationError = validateRatings({
      rating: req.body.rating ?? review.rating,
      communication: req.body.communication ?? review.communication,
      qualityOfWork: req.body.qualityOfWork ?? review.qualityOfWork,
      deliveryTime: req.body.deliveryTime ?? review.deliveryTime,
      professionalism: req.body.professionalism ?? review.professionalism,
    });
    if (validationError) {
      return res.status(400).json({ success: false, message: validationError });
    }

    for (const field of RATING_FIELDS) {
      if (req.body[field] !== undefined) review[field] = Number(req.body[field]);
    }
    if (req.body.comment !== undefined) review.comment = req.body.comment;
    if (typeof req.body.recommend === "boolean") review.recommend = req.body.recommend;

    await review.save();
    await recalculateUserRating(review.reviewee);

    res.status(200).json({ success: true, data: serializeReview(review), message: "Review updated successfully." });
  } catch (error) {
    next(error);
  }
};

// GET /api/reviews/user/:userId — public: all reviews received by a user
// (used by profile pages).
export const listReviewsForUser = async (req, res, next) => {
  try {
    const reviews = await Review.find({ reviewee: req.params.userId })
      .populate("reviewer", "fullName email avatar")
      .populate("contract", "title")
      .sort({ createdAt: -1 });
    res.status(200).json({ success: true, data: reviews.map(serializeReview) });
  } catch (error) {
    next(error);
  }
};

// GET /api/reviews/mine?type=given|received — the logged-in user's own
// reviews, both directions unless filtered.
export const getMyReviews = async (req, res, next) => {
  try {
    const { type } = req.query;
    const populateOpts = [
      { path: "reviewer", select: "fullName email avatar role" },
      { path: "reviewee", select: "fullName email avatar role" },
      { path: "contract", select: "title budget" },
    ];

    const [given, received] = await Promise.all([
      type === "received" ? [] : Review.find({ reviewer: req.user._id }).populate(populateOpts).sort({ createdAt: -1 }),
      type === "given" ? [] : Review.find({ reviewee: req.user._id }).populate(populateOpts).sort({ createdAt: -1 }),
    ]);

    res.status(200).json({
      success: true,
      data: {
        given: given.map(serializeReview),
        received: received.map(serializeReview),
      },
    });
  } catch (error) {
    next(error);
  }
};

// GET /api/reviews/reviewable — completed contracts belonging to the logged-in
// user that they haven't reviewed yet, so the UI can offer a "Leave a Review"
// action for each one.
export const getReviewableContracts = async (req, res, next) => {
  try {
    const query = req.user.role === "client" ? { client: req.user._id } : { freelancer: req.user._id };
    query.status = "completed";

    const contracts = await Contract.find(query)
      .populate("client", "fullName avatar")
      .populate("freelancer", "fullName avatar")
      .sort({ updatedAt: -1 });

    const myReviews = await Review.find({ reviewer: req.user._id }).select("contract");
    const reviewedContractIds = new Set(myReviews.map((r) => r.contract.toString()));

    const reviewable = contracts.filter((c) => !reviewedContractIds.has(c._id.toString()));

    res.status(200).json({ success: true, data: reviewable });
  } catch (error) {
    next(error);
  }
};
