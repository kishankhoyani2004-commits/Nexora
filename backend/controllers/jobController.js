import Job from "../models/Job.js";
import SavedJob from "../models/SavedJob.js";
import { CATEGORY_TAXONOMY, categoryRegex } from "../utils/categoryTaxonomy.js";

// ── Helpers ───────────────────────────────────────────────────────────────
const SORT_MAP = {
  newest:       { createdAt: -1 },
  oldest:       { createdAt:  1 },
  budgetHigh:   { budgetMax:  -1 },
  budgetLow:    { budgetMin:   1 },
  leastCompete: { proposalsCount: 1 },
  relevant:     { score: { $meta: "textScore" } },
};

/**
 * GET /api/jobs
 * Full-featured search + filter + sort + pagination.
 */
export const list = async (req, res, next) => {
  try {
    const {
      search, category, location, workType,
      minBudget, maxBudget, priceType,
      experienceLevel, skills,
      clientRating, paymentVerified,
      postedWithin,           // "today" | "3days" | "week" | "month"
      sortBy = "newest",
      page  = 1,
      limit = 12,
      client,
      status,
    } = req.query;

    const query = {};

    // ── Client-scoped view (client sees their own jobs in any status) ───────
    if (client) {
      query.client = client;
      if (status) query.status = status;
    } else {
      query.status = status || "open";
    }

    // ── Text search ──────────────────────────────────────────────────────────
    if (search && search.trim()) {
      query.$text = { $search: search.trim() };
    }

    // ── Scalar filters ────────────────────────────────────────────────────────
    // `category` accepts either a raw free-text value (regex substring match,
    // for legacy callers) or one of our canonical taxonomy slugs (e.g.
    // "web-development") — matched against every raw category string it
    // normalizes, so it stays consistent with /api/public/categories' counts.
    if (category) {
      const taxon = CATEGORY_TAXONOMY.find((c) => c.slug === category);
      query.category = taxon ? categoryRegex(taxon.matchers) : { $regex: category, $options: "i" };
    }
    if (location)  query.location    = { $regex: location, $options: "i" };
    if (workType)  query.workType    = workType;
    if (priceType) query.priceType   = priceType;

    if (minBudget || maxBudget) {
      query.budgetMin = {};
      if (minBudget) query.budgetMin.$gte = parseFloat(minBudget);
      if (maxBudget) query.budgetMax = { $lte: parseFloat(maxBudget) };
    }

    if (experienceLevel) {
      const levels = Array.isArray(experienceLevel) ? experienceLevel : [experienceLevel];
      query.experienceLevel = { $in: levels };
    }

    if (skills) {
      const arr = Array.isArray(skills) ? skills : [skills];
      query.skills = { $in: arr };
    }

    if (clientRating) {
      query.clientRating = { $gte: parseFloat(clientRating) };
    }

    if (paymentVerified === "true" || paymentVerified === true) {
      query.paymentVerified = true;
    }

    if (postedWithin) {
      const now = new Date();
      const cutoffs = { today: 1, "3days": 3, week: 7, month: 30 };
      const days    = cutoffs[postedWithin];
      if (days) {
        const from = new Date(now);
        from.setDate(from.getDate() - days);
        query.createdAt = { $gte: from };
      }
    }

    // ── Sort ─────────────────────────────────────────────────────────────────
    const sort = SORT_MAP[sortBy] || SORT_MAP.newest;

    const pageNum  = Math.max(1, parseInt(page,  10));
    const limitNum = Math.min(50, parseInt(limit, 10));
    const skip     = (pageNum - 1) * limitNum;

    const [total, items] = await Promise.all([
      Job.countDocuments(query),
      Job.find(query, search?.trim() ? { score: { $meta: "textScore" } } : {})
        .populate("client", "fullName email avatar")
        .sort(sort)
        .skip(skip)
        .limit(limitNum),
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
 * GET /api/jobs/recommended
 * Returns personalised job recommendations for the authenticated freelancer
 * based on their skills, and sorts by text-score / skill overlap.
 * Protected route — freelancers only.
 */
export const getRecommended = async (req, res, next) => {
  try {
    const user   = req.user;
    const skills = user.skills || [];
    const limit  = Math.min(20, parseInt(req.query.limit || "12", 10));

    // Base query: open jobs not yet applied to
    const query = { status: "open" };

    let items;
    if (skills.length > 0) {
      // Primary: skill overlap
      items = await Job.find({ ...query, skills: { $in: skills } })
        .populate("client", "fullName email avatar")
        .sort({ clientRating: -1, proposalsCount: 1, createdAt: -1 })
        .limit(limit * 2);   // fetch extra, then deduplicate/rank

      // If not enough, pad with recent open jobs
      if (items.length < limit) {
        const existing = new Set(items.map((j) => j._id.toString()));
        const pad = await Job.find({
          ...query,
          _id: { $nin: [...existing] },
        })
          .populate("client", "fullName email avatar")
          .sort({ createdAt: -1 })
          .limit(limit - items.length);
        items = [...items, ...pad];
      }
    } else {
      items = await Job.find(query)
        .populate("client", "fullName email avatar")
        .sort({ clientRating: -1, createdAt: -1 })
        .limit(limit);
    }

    // Compute match score & reason per job
    const enriched = items.slice(0, limit).map((job) => {
      const jobSkills  = job.skills || [];
      const matched    = skills.filter((s) =>
        jobSkills.some((js) => js.toLowerCase() === s.toLowerCase())
      );
      const matchPct   = jobSkills.length > 0
        ? Math.min(99, Math.round((matched.length / jobSkills.length) * 100) + 40)
        : 65;

      let reason = "Matches your profile and experience level.";
      if (matched.length >= 3)
        reason = `Recommended because you have strong skills in ${matched.slice(0, 3).join(", ")}.`;
      else if (matched.length > 0)
        reason = `Your skill "${matched[0]}" is required for this project.`;
      else if (user.location && job.location?.toLowerCase().includes(user.location.toLowerCase()))
        reason = "Matches your preferred work location.";

      return { ...job.toJSON(), matchScore: matchPct, matchReason: reason };
    });

    res.status(200).json({ success: true, data: { items: enriched, total: enriched.length } });
  } catch (error) {
    next(error);
  }
};

/** GET /api/jobs/:id */
export const getById = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id).populate("client", "fullName email avatar bio location");
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    res.status(200).json({ success: true, data: job });
  } catch (error) {
    next(error);
  }
};

/** POST /api/jobs */
export const create = async (req, res, next) => {
  try {
    const {
      title, description, budgetMin, budgetMax, priceType,
      experienceLevel, skills, category, duration, subcategory,
      location, workType, deadline, visibility,
      englishLevel, freelancersNeeded, currency, estimatedHours,
      featured, urgent, allowAIMatching, allowMultipleProposals,
      proposalDeadline, projectStartDate, expectedCompletionDate,
    } = req.body;

    const job = await Job.create({
      client: req.user._id,
      title, description, budgetMin, budgetMax, priceType,
      experienceLevel, skills, category, duration, subcategory,
      location:        location  || "Remote",
      workType:        workType  || "remote",
      deadline:        deadline  || null,
      visibility:      visibility || "public",
      clientRating:    0,
      paymentVerified: false,
      status:          "open",
      // Module 2 fields
      englishLevel:        englishLevel || "intermediate",
      freelancersNeeded:   freelancersNeeded || 1,
      currency:            currency || "INR",
      estimatedHours:      estimatedHours || 0,
      featured:            featured || false,
      urgent:              urgent || false,
      allowAIMatching:     allowAIMatching !== false,
      allowMultipleProposals: allowMultipleProposals !== false,
      proposalDeadline:    proposalDeadline || null,
      projectStartDate:    projectStartDate || null,
      expectedCompletionDate: expectedCompletionDate || null,
    });

    res.status(201).json({ success: true, data: job, message: "Job post created successfully." });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/jobs/:id */
export const update = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    if (job.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    const updated = await Job.findByIdAndUpdate(req.params.id, req.body, { new: true });
    res.status(200).json({ success: true, data: updated, message: "Job updated." });
  } catch (error) {
    next(error);
  }
};

/** POST /api/jobs/:id/publish */
export const publish = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    if (job.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    job.status = "open";
    await job.save();
    res.status(200).json({ success: true, data: job, message: "Job published." });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/jobs/:id/close — sets status to "closed" */
export const closeJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    if (job.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    job.status = "closed";
    await job.save();
    res.status(200).json({ success: true, data: job, message: "Job closed." });
  } catch (error) {
    next(error);
  }
};

/** PATCH /api/jobs/:id/draft — saves job as draft (status = draft) */
export const saveDraftJob = async (req, res, next) => {
  try {
    const {
      title, description, budgetMin, budgetMax, priceType,
      experienceLevel, skills, category, subcategory, duration,
      location, workType, deadline, visibility,
      englishLevel, freelancersNeeded, currency, estimatedHours,
      featured, urgent, allowAIMatching, allowMultipleProposals,
      proposalDeadline, projectStartDate, expectedCompletionDate,
    } = req.body;

    const job = await Job.create({
      client: req.user._id,
      title:           title || "Untitled Draft",
      description:     description || "",
      budgetMin:       budgetMin || 0,
      budgetMax:       budgetMax || 0,
      priceType:       priceType || "fixed",
      experienceLevel: experienceLevel || "intermediate",
      skills:          skills || [],
      category:        category || "General",
      subcategory:     subcategory || "",
      duration:        duration || "1-3 months",
      location:        location || "Remote",
      workType:        workType || "remote",
      deadline:        deadline || null,
      visibility:      visibility || "public",
      status:          "draft",
      // Module 2 fields
      englishLevel:        englishLevel || "intermediate",
      freelancersNeeded:   freelancersNeeded || 1,
      currency:            currency || "INR",
      estimatedHours:      estimatedHours || 0,
      featured:            featured || false,
      urgent:              urgent || false,
      allowAIMatching:     allowAIMatching !== false,
      allowMultipleProposals: allowMultipleProposals !== false,
      proposalDeadline:    proposalDeadline || null,
      projectStartDate:    projectStartDate || null,
      expectedCompletionDate: expectedCompletionDate || null,
    });

    res.status(201).json({ success: true, data: job, message: "Job saved as draft." });
  } catch (error) {
    next(error);
  }
};

/** POST /api/jobs/publish-new — creates and immediately publishes a job */
export const createAndPublish = async (req, res, next) => {
  try {
    const {
      title, description, budgetMin, budgetMax, priceType,
      experienceLevel, skills, category, subcategory, duration,
      location, workType, deadline, visibility,
      englishLevel, freelancersNeeded, currency, estimatedHours,
      featured, urgent, allowAIMatching, allowMultipleProposals,
      proposalDeadline, projectStartDate, expectedCompletionDate,
    } = req.body;

    const job = await Job.create({
      client: req.user._id,
      title,
      description,
      budgetMin,
      budgetMax:       budgetMax || budgetMin,
      priceType:       priceType || "fixed",
      experienceLevel: experienceLevel || "intermediate",
      skills:          skills || [],
      category,
      subcategory:     subcategory || "",
      duration:        duration || "1-3 months",
      location:        location || "Remote",
      workType:        workType || "remote",
      deadline:        deadline || null,
      visibility:      visibility || "public",
      clientRating:    0,
      paymentVerified: false,
      status:          "open",
      // Module 2 fields
      englishLevel:        englishLevel || "intermediate",
      freelancersNeeded:   freelancersNeeded || 1,
      currency:            currency || "INR",
      estimatedHours:      estimatedHours || 0,
      featured:            featured || false,
      urgent:              urgent || false,
      allowAIMatching:     allowAIMatching !== false,
      allowMultipleProposals: allowMultipleProposals !== false,
      proposalDeadline:    proposalDeadline || null,
      projectStartDate:    projectStartDate || null,
      expectedCompletionDate: expectedCompletionDate || null,
    });

    res.status(201).json({ success: true, data: job, message: "Job published successfully." });
  } catch (error) {
    next(error);
  }
};

/** DELETE /api/jobs/:id */
export const deleteJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.id);
    if (!job) return res.status(404).json({ success: false, message: "Job not found." });
    if (job.client.toString() !== req.user.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized." });
    }
    await Job.findByIdAndDelete(req.params.id);
    // Clean up any saved-job references
    await SavedJob.deleteMany({ job: req.params.id });
    res.status(200).json({ success: true, message: "Job deleted." });
  } catch (error) {
    next(error);
  }
};
