import Review from "../models/Review.js";
import User from "../models/User.js";

// A review can be edited by its author for this long after creation.
export const REVIEW_EDIT_WINDOW_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

export const canEditReview = (review) =>
  Date.now() - new Date(review.createdAt).getTime() < REVIEW_EDIT_WINDOW_MS;

// Recomputes and persists a user's average rating + review count from every
// Review where they're the reviewee. Called after any create/update/delete
// so `User.rating`/`User.reviewCount` (read directly by profile pages) never
// drift from the real Review collection.
export const recalculateUserRating = async (userId) => {
  const reviews = await Review.find({ reviewee: userId }).select("rating");
  const reviewCount = reviews.length;
  const rating = reviewCount > 0
    ? Math.round((reviews.reduce((sum, r) => sum + r.rating, 0) / reviewCount) * 10) / 10
    : 0;

  await User.findByIdAndUpdate(userId, { rating, reviewCount });
  return { rating, reviewCount };
};
