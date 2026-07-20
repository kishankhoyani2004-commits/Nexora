import SavedJob from "../models/SavedJob.js";
import Job from "../models/Job.js";

/**
 * POST /api/saved-jobs/:jobId
 * Save a job. Idempotent — re-saving an already-saved job returns 200.
 */
export const saveJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    const freelancerId = req.user._id;

    const job = await Job.findById(jobId);
    if (!job) {
      return res.status(404).json({ success: false, message: "Job not found." });
    }

    // upsert — avoid duplicate-key errors
    const saved = await SavedJob.findOneAndUpdate(
      { freelancer: freelancerId, job: jobId },
      { freelancer: freelancerId, job: jobId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: saved, message: "Job saved successfully." });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/saved-jobs/:jobId
 * Remove a job from the freelancer's saved list.
 */
export const unsaveJob = async (req, res, next) => {
  try {
    const { jobId } = req.params;
    await SavedJob.findOneAndDelete({ freelancer: req.user._id, job: jobId });
    res.status(200).json({ success: true, message: "Job removed from saved." });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/saved-jobs
 * List all saved jobs for the authenticated freelancer.
 * Supports sortBy: recent | match | expiring
 */
export const listSavedJobs = async (req, res, next) => {
  try {
    const freelancerId = req.user._id;
    const { sortBy = "recent" } = req.query;

    const savedDocs = await SavedJob.find({ freelancer: freelancerId })
      .populate({
        path: "job",
        populate: { path: "client", select: "fullName avatar" },
      })
      .sort({ createdAt: -1 });

    // Filter out docs where the job was deleted
    let items = savedDocs
      .filter((s) => s.job && s.job.status !== "closed" && s.job.status !== "completed")
      .map((s) => ({
        savedId:   s.id,
        savedAt:   s.createdAt,
        job:       s.job,
      }));

    // Sort client-side after filtering
    if (sortBy === "expiring") {
      items = items.sort((a, b) => {
        const da = a.job.deadline ? new Date(a.job.deadline) : new Date("2099-01-01");
        const db = b.job.deadline ? new Date(b.job.deadline) : new Date("2099-01-01");
        return da - db;
      });
    } else if (sortBy === "budget") {
      items = items.sort((a, b) => b.job.budgetMax - a.job.budgetMax);
    }
    // default: recent (already sorted by createdAt desc)

    res.status(200).json({
      success: true,
      data: { items, total: items.length },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/saved-jobs/ids
 * Return only the job IDs the freelancer has saved (lightweight — used for UI state).
 */
export const getSavedJobIds = async (req, res, next) => {
  try {
    const docs = await SavedJob.find({ freelancer: req.user._id }).select("job");
    const ids  = docs.map((d) => d.job.toString());
    res.status(200).json({ success: true, data: ids });
  } catch (error) {
    next(error);
  }
};
