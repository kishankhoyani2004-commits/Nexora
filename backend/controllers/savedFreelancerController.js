import SavedFreelancer from "../models/SavedFreelancer.js";
import User from "../models/User.js";
import Contract from "../models/Contract.js";

/**
 * Aggregates completed-project count and success rate per freelancer from
 * the Contract collection. Neither figure is stored on User — they're
 * derived on read so the numbers never drift out of sync with contracts.
 */
async function computeFreelancerStats(freelancerIds) {
  if (freelancerIds.length === 0) return {};

  const rows = await Contract.aggregate([
    { $match: { freelancer: { $in: freelancerIds } } },
    {
      $group: {
        _id: "$freelancer",
        total: { $sum: 1 },
        completed: { $sum: { $cond: [{ $eq: ["$status", "completed"] }, 1, 0] } },
      },
    },
  ]);

  const map = {};
  for (const row of rows) {
    map[row._id.toString()] = {
      completedProjects: row.completed,
      successRate: row.total > 0 ? Math.round((row.completed / row.total) * 100) : 0,
    };
  }
  return map;
}

/**
 * POST /api/saved-freelancers/:freelancerId
 * Save a freelancer. Idempotent — re-saving an already-saved freelancer returns 200.
 */
export const saveFreelancer = async (req, res, next) => {
  try {
    const { freelancerId } = req.params;
    const clientId = req.user._id;

    const freelancer = await User.findById(freelancerId);
    if (!freelancer || freelancer.role !== "freelancer") {
      return res.status(404).json({ success: false, message: "Freelancer not found." });
    }

    const saved = await SavedFreelancer.findOneAndUpdate(
      { client: clientId, freelancer: freelancerId },
      { client: clientId, freelancer: freelancerId },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );

    res.status(200).json({ success: true, data: saved, message: "Freelancer saved successfully." });
  } catch (error) {
    next(error);
  }
};

/**
 * DELETE /api/saved-freelancers/:freelancerId
 * Remove a freelancer from the client's saved list.
 */
export const unsaveFreelancer = async (req, res, next) => {
  try {
    const { freelancerId } = req.params;
    await SavedFreelancer.findOneAndDelete({ client: req.user._id, freelancer: freelancerId });
    res.status(200).json({ success: true, message: "Freelancer removed from saved." });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/saved-freelancers
 * List all saved freelancers for the authenticated client.
 * Supports: search (name/title/skill), sortBy: recent | rating | skills
 */
export const listSavedFreelancers = async (req, res, next) => {
  try {
    const clientId = req.user._id;
    const { search = "", sortBy = "recent" } = req.query;

    const savedDocs = await SavedFreelancer.find({ client: clientId })
      .populate("freelancer", "-password")
      .sort({ createdAt: -1 });

    const withFreelancer = savedDocs.filter((s) => s.freelancer);
    const freelancerIds = withFreelancer.map((s) => s.freelancer._id);
    const statsMap = await computeFreelancerStats(freelancerIds);

    let items = withFreelancer.map((s) => {
      const stats = statsMap[s.freelancer._id.toString()] || { completedProjects: 0, successRate: 0 };
      return {
        savedId: s.id,
        savedAt: s.createdAt,
        freelancer: {
          ...s.freelancer.toJSON(),
          completedProjects: stats.completedProjects,
          successRate: stats.successRate,
        },
      };
    });

    if (search.trim()) {
      const q = search.trim().toLowerCase();
      items = items.filter((item) => {
        const f = item.freelancer;
        return (
          f.fullName?.toLowerCase().includes(q) ||
          f.title?.toLowerCase().includes(q) ||
          (f.skills || []).some((skill) => skill.toLowerCase().includes(q))
        );
      });
    }

    if (sortBy === "rating") {
      items.sort((a, b) => (b.freelancer.rating || 0) - (a.freelancer.rating || 0));
    } else if (sortBy === "skills") {
      items.sort((a, b) => (b.freelancer.skills?.length || 0) - (a.freelancer.skills?.length || 0));
    }
    // default "recent" — already sorted by savedAt desc

    res.status(200).json({ success: true, data: { items, total: items.length } });
  } catch (error) {
    next(error);
  }
};

/**
 * GET /api/saved-freelancers/ids
 * Return only the freelancer ID strings the client has saved (lightweight — for UI toggle state).
 */
export const getSavedFreelancerIds = async (req, res, next) => {
  try {
    const docs = await SavedFreelancer.find({ client: req.user._id }).select("freelancer");
    const ids = docs.map((d) => d.freelancer.toString());
    res.status(200).json({ success: true, data: ids });
  } catch (error) {
    next(error);
  }
};
