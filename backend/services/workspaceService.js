import Workspace from "../models/Workspace.js";
import WorkspaceActivity from "../models/WorkspaceActivity.js";
import Job from "../models/Job.js";

// Activity logging must never break the action that triggered it (task
// creation, milestone review, etc.), so failures here are swallowed.
export const logActivity = async (contractId, actorId, action, message) => {
  try {
    return await WorkspaceActivity.create({ contract: contractId, actor: actorId || null, action, message });
  } catch {
    return null;
  }
};

// Called from every "proposal accepted → contract created" path so an
// Active Project always has a linked Workspace, regardless of which
// accept flow created it.
export const ensureWorkspaceForContract = async (contract) => {
  const existing = await Workspace.findOne({ contract: contract._id });
  if (existing) return existing;

  const job = await Job.findById(contract.job);

  const workspace = await Workspace.create({
    contract: contract._id,
    job: contract.job,
    client: contract.client,
    freelancer: contract.freelancer,
    dueDate: job?.expectedCompletionDate || job?.deadline || null,
  });

  await logActivity(contract._id, contract.client, "project_started", "Proposal accepted — project workspace created.");

  return workspace;
};
