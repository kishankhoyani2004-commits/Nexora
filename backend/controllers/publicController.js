import User from "../models/User.js";
import Job from "../models/Job.js";
import Review from "../models/Review.js";
import { CATEGORY_TAXONOMY, categoryRegex } from "../utils/categoryTaxonomy.js";

// Fields safe to expose on a public freelancer directory — never send email,
// password, tokens, sessions, notification/privacy settings, etc.
const PUBLIC_FREELANCER_FIELDS =
  "fullName avatar bio skills location title hourlyRate rating reviewCount availability createdAt";

/**
 * GET /api/public/stats
 * Aggregate, non-sensitive platform counters for marketing pages
 * (landing, pricing). No auth required — nothing here is per-user data.
 */
export const getPlatformStats = async (req, res, next) => {
  try {
    const [totalFreelancers, totalClients, totalJobsPosted, totalCompletedJobs] = await Promise.all([
      User.countDocuments({ role: "freelancer" }),
      User.countDocuments({ role: "client" }),
      Job.countDocuments({}),
      Job.countDocuments({ status: "closed" }),
    ]);

    res.status(200).json({
      success: true,
      data: { totalFreelancers, totalClients, totalJobsPosted, totalCompletedJobs },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/freelancers
 * Public, filterable directory of freelancers for the "Find Talent" page.
 * No auth required — only publicly-safe fields are ever selected.
 */
export const listFreelancers = async (req, res, next) => {
  try {
    const {
      search,
      skill,
      category,
      minRate,
      maxRate,
      minRating,
      availability,
      location,
      sortBy = "rating",
      page = 1,
      limit = 12,
    } = req.query;

    const query = {
      role: "freelancer",
      "accountDeletionScheduled.scheduled": { $ne: true },
    };

    if (search && search.trim()) {
      const re = new RegExp(search.trim(), "i");
      query.$or = [{ fullName: re }, { title: re }, { bio: re }, { skills: re }];
    }
    if (skill) {
      const arr = Array.isArray(skill) ? skill : [skill];
      query.skills = { $in: arr.map((s) => new RegExp(`^${s}$`, "i")) };
    }
    if (category) {
      const taxon = CATEGORY_TAXONOMY.find((c) => c.slug === category);
      if (taxon) {
        const re = categoryRegex(taxon.matchers);
        query.$or = (query.$or || []).concat([{ title: re }, { skills: re }, { bio: re }]);
      }
    }
    if (minRate || maxRate) {
      query.hourlyRate = {};
      if (minRate) query.hourlyRate.$gte = parseFloat(minRate);
      if (maxRate) query.hourlyRate.$lte = parseFloat(maxRate);
    }
    if (minRating) query.rating = { $gte: parseFloat(minRating) };
    if (availability) query.availability = availability;
    if (location) query.location = { $regex: location, $options: "i" };

    const SORT_MAP = {
      rating: { rating: -1, reviewCount: -1 },
      newest: { createdAt: -1 },
      rateLow: { hourlyRate: 1 },
      rateHigh: { hourlyRate: -1 },
    };
    const sort = SORT_MAP[sortBy] || SORT_MAP.rating;

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.min(50, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [total, items] = await Promise.all([
      User.countDocuments(query),
      User.find(query).select(PUBLIC_FREELANCER_FIELDS).sort(sort).skip(skip).limit(limitNum),
    ]);

    res.status(200).json({
      success: true,
      data: { items, total, page: pageNum, pageSize: limitNum, pages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/categories
 * Canonical, de-duplicated categories with live job + freelancer counts,
 * for the Categories page and category chips elsewhere.
 */
export const listCategories = async (req, res, next) => {
  try {
    const results = await Promise.all(
      CATEGORY_TAXONOMY.map(async (cat) => {
        const re = categoryRegex(cat.matchers);
        const [jobCount, freelancerCount] = await Promise.all([
          Job.countDocuments({ status: "open", category: re }),
          User.countDocuments({
            role: "freelancer",
            "accountDeletionScheduled.scheduled": { $ne: true },
            $or: [{ title: re }, { skills: re }],
          }),
        ]);
        return { slug: cat.slug, label: cat.label, icon: cat.icon, jobCount, freelancerCount };
      })
    );

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/testimonials
 * Top-rated, commented reviews across the whole platform (not scoped to one
 * user) for marketing sections. `authoredBy` selects whose voice the
 * testimonial is in (who WROTE the review) — `client` (default) returns
 * quotes written by clients about freelancers they hired (for Find Talent);
 * `freelancer` returns quotes written by freelancers about clients they
 * worked with (freelancer success stories for Find Work).
 */
export const getTestimonials = async (req, res, next) => {
  try {
    const { authoredBy = "client", limit = 6 } = req.query;
    const limitNum = Math.min(20, parseInt(limit, 10));

    const reviewerUsers = await User.find({ role: authoredBy }).select("_id");
    const reviewerIds = reviewerUsers.map((u) => u._id);

    const reviews = await Review.find({
      reviewer: { $in: reviewerIds },
      comment: { $ne: "" },
      rating: { $gte: 4 },
    })
      .populate("reviewer", "fullName avatar title")
      .populate("reviewee", "fullName avatar title")
      .sort({ rating: -1, createdAt: -1 })
      .limit(limitNum);

    res.status(200).json({ success: true, data: reviews });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/public/trending-skills
 * Most-requested skills across currently open jobs — derived live from real
 * postings (Job.skills), not a hardcoded list, for the Find Work page.
 */
export const getTrendingSkills = async (req, res, next) => {
  try {
    const { limit = 10 } = req.query;
    const limitNum = Math.min(30, parseInt(limit, 10));

    const results = await Job.aggregate([
      { $match: { status: "open" } },
      { $unwind: "$skills" },
      { $group: { _id: "$skills", jobCount: { $sum: 1 } } },
      { $sort: { jobCount: -1 } },
      { $limit: limitNum },
      { $project: { _id: 0, skill: "$_id", jobCount: 1 } },
    ]);

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};
