import Contract from "../models/Contract.js";
import Milestone from "../models/Milestone.js";

const isMember = (contract, user) => {
  if (user.role === "admin") return true;
  const uid = user._id.toString();
  return contract.client.toString() === uid || contract.freelancer.toString() === uid;
};

// Only the client and the assigned freelancer on a contract (i.e. the
// Active Project) may read or mutate its workspace data.
export const authorizeWorkspaceAccess = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.projectId);
    if (!contract) {
      return res.status(404).json({ success: false, message: "Project not found." });
    }
    if (!isMember(contract, req.user)) {
      return res.status(403).json({ success: false, message: "You do not have access to this workspace." });
    }
    req.contract = contract;
    next();
  } catch (error) {
    next(error);
  }
};

// Milestone submit/review routes are keyed by milestoneId, not projectId,
// so membership has to be resolved through the milestone's parent contract.
export const authorizeMilestoneAccess = async (req, res, next) => {
  try {
    const milestone = await Milestone.findById(req.params.milestoneId);
    if (!milestone) {
      return res.status(404).json({ success: false, message: "Milestone not found." });
    }
    const contract = await Contract.findById(milestone.contract);
    if (!contract || !isMember(contract, req.user)) {
      return res.status(403).json({ success: false, message: "You do not have access to this workspace." });
    }
    req.contract = contract;
    req.milestone = milestone;
    next();
  } catch (error) {
    next(error);
  }
};
