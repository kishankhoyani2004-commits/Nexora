import Job from "../models/Job.js";
import Proposal from "../models/Proposal.js";
import Contract from "../models/Contract.js";
import Milestone from "../models/Milestone.js";
import WorkspaceTask from "../models/WorkspaceTask.js";
import WorkspaceFile from "../models/WorkspaceFile.js";
import Message from "../models/Message.js";
import User from "../models/User.js";
import { generateText, generateJSON } from "../services/geminiService.js";

const SYS = "You are Nexora AI, an assistant embedded in a freelance marketplace's Freelancer Hub. Be concise, practical, and use markdown formatting.";

const notFound = (res, msg = "Resource not found.") => res.status(404).json({ success: false, message: msg });

// ── Find Work ─────────────────────────────────────────────────────────────────

export const analyzeJobPost = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId).populate("client", "fullName rating reviewCount");
    if (!job) return notFound(res, "Job not found.");

    const prompt = `Analyze this job posting for a freelancer deciding whether to apply:\n\nTitle: ${job.title}\nCategory: ${job.category}\nBudget: ₹${job.budgetMin}-${job.budgetMax} (${job.priceType})\nExperience level: ${job.experienceLevel}\nSkills required: ${job.skills.join(", ")}\nClient: ${job.client?.fullName}, rating ${job.clientRating || "unrated"}, payment verified: ${job.paymentVerified}\nDescription: "${job.description}"\n\nGive: 1) a quick verdict (Good Opportunity / Proceed with Caution / Skip), 2) 2-3 sentence reasoning, 3) one tip for applying.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const jobMatchScore = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return notFound(res, "Job not found.");
    const user = req.user;

    const userSkills = (user.skills || []).map((s) => s.toLowerCase());
    const jobSkills = (job.skills || []).map((s) => s.toLowerCase());
    const matched = jobSkills.filter((s) => userSkills.includes(s));
    const heuristicScore = jobSkills.length > 0 ? Math.round((matched.length / jobSkills.length) * 100) : 50;

    const prompt = `Freelancer profile: skills [${(user.skills || []).join(", ")}], title "${user.title || "N/A"}", experience level inferred from ${user.hourlyRate ? `hourly rate ₹${user.hourlyRate}` : "profile"}.\nJob requires: [${job.skills.join(", ")}], experience level: ${job.experienceLevel}, category: ${job.category}.\nHeuristic skill overlap: ${heuristicScore}%.\n\nGive a final match score (0-100) and a one-sentence reason. Respond as JSON: {"score": number, "reason": "..."}`;
    const result = await generateJSON(prompt, SYS);

    res.status(200).json({
      success: true,
      data: {
        score: typeof result.score === "number" ? result.score : heuristicScore,
        reason: result.reason || `You match ${matched.length} of ${jobSkills.length} required skills.`,
        matchedSkills: matched,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const explainJobMatch = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return notFound(res, "Job not found.");
    const user = req.user;

    const prompt = `Explain in 3-4 sentences why this job is (or isn't) a good match for this freelancer.\n\nFreelancer: skills [${(user.skills || []).join(", ")}], bio: "${user.bio || "N/A"}", location: ${user.location || "N/A"}.\nJob: "${job.title}" — needs [${job.skills.join(", ")}], ${job.experienceLevel} level, ${job.workType || "remote"}, budget ₹${job.budgetMin}-${job.budgetMax}.\n\nBe specific about which skills align and which are missing.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const suggestBetterJobs = async (req, res, next) => {
  try {
    const user = req.user;
    const candidates = await Job.find({ status: "open", skills: { $in: user.skills || [] } })
      .sort({ createdAt: -1 })
      .limit(15)
      .select("title category skills budgetMin budgetMax experienceLevel proposalsCount");

    if (candidates.length === 0) {
      return res.status(200).json({ success: true, data: { content: "No strong skill-matched open jobs found right now — try widening your listed skills." } });
    }

    const list = candidates.map((j, i) => `${i + 1}. "${j.title}" (${j.category}) — ₹${j.budgetMin}-${j.budgetMax}, ${j.experienceLevel}, needs: ${j.skills.join(", ")}, ${j.proposalsCount || 0} proposals so far`).join("\n");

    const prompt = `Freelancer skills: ${(user.skills || []).join(", ")}.\n\nHere are open jobs matching their skills:\n${list}\n\nRecommend the top 3 best-fit jobs from this list and explain briefly why each is worth applying to (consider low competition and skill match).`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply, candidateCount: candidates.length } });
  } catch (error) {
    next(error);
  }
};

// ── Proposals ─────────────────────────────────────────────────────────────────

export const generateProposalForJob = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId).populate("client", "fullName companyName");
    if (!job) return notFound(res, "Job not found.");
    const user = req.user;

    const clientName = job.client?.companyName || (job.client?.fullName ? job.client.fullName.split(" ")[0] : "Hiring Manager");
    const freelancerName = user.fullName || "Freelancer";
    const requiredSkills = (job.skills || []).join(", ") || "software development and design";
    const freelancerSkills = (user.skills || []).join(", ") || user.title || "full-stack development";

    const prompt = `You are an elite proposal strategist helping a top freelancer win high-value contracts on a competitive freelance marketplace.
Write an exceptionally persuasive, customized, high-converting proposal cover letter for ${freelancerName} applying for this specific project:

=== TARGET JOB DETAILS ===
- Job Title: "${job.title}"
- Description: "${job.description}"
- Category: "${job.category || 'General'}"
- Required Skills: ${requiredSkills}
- Scope / Level: ${job.experienceLevel || 'Intermediate'}
- Price Type: ${job.priceType || 'fixed'}

=== FREELANCER PROFILE ===
- Full Name: ${freelancerName}
- Title: "${user.title || 'Senior Specialist'}"
- Skills & Tech Stack: ${freelancerSkills}
- Profile Bio: "${user.bio || ''}"

=== INSTRUCTIONS FOR THE PROPOSAL ===
1. Salutation: "Dear ${clientName}," or "Hi ${clientName},"
2. Hook (Paragraph 1): Open with genuine enthusiasm and demonstrate precise understanding of their project requirements and core objective. Avoid clichés like "I am writing to apply for your job".
3. Why I'm the Best Fit (Paragraph 2): Highlight 2-3 specific, matching competencies from the freelancer's profile (${freelancerSkills}) that directly align with the job's requirements (${requiredSkills}). Reference relevant technical approaches.
4. Actionable 3-Phase Execution Plan (Bulleted):
   - Phase 1: Architecture, Scoping & Initial Milestone Setup
   - Phase 2: Core Development, Implementation & Weekly Iteration
   - Phase 3: Comprehensive Testing, QA, Polish & Deployment Handoff
5. Communication & Quality Assurance: Guarantee proactive daily/weekly updates, clear milestone deliverables, and post-delivery assistance.
6. Call to Action: Friendly, low-friction invitation for a quick 10-minute discovery chat to align on requirements and kick off immediately.
7. Sign off cleanly:
Best regards,
${freelancerName}
${user.title ? user.title : ''}

CRITICAL RULES:
- Tailor the letter deeply to "${job.title}".
- DO NOT use any placeholders like [Your Name], [Client Name], or [Insert Portfolio Link].
- Keep the tone confident, articulate, and client-centric.`;

    const reply = await generateText(prompt, "You are an elite freelance proposal strategist. Write high-converting, professional proposal cover letters formatted cleanly with Markdown.");
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const improveProposalText = async (req, res, next) => {
  try {
    const { proposalText } = req.body;
    if (!proposalText) return res.status(400).json({ success: false, message: "proposalText is required." });

    const prompt = `Improve this freelance proposal cover letter — make it more persuasive, concise, and professional, while keeping the freelancer's original intent:\n\n"""${proposalText}"""\n\nReturn only the improved version.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const rewriteProfessionally = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: "text is required." });

    const prompt = `Rewrite this text in a clear, professional, confident tone suitable for client-facing communication. Keep the same meaning and length roughly the same:\n\n"""${text}"""\n\nReturn only the rewritten text.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const estimateBidAmount = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return notFound(res, "Job not found.");
    const user = req.user;

    const prompt = `Job budget range: ₹${job.budgetMin}-${job.budgetMax} (${job.priceType}), experience level: ${job.experienceLevel}.\nFreelancer's own hourly rate: ₹${user.hourlyRate || "not set"}.\n\nSuggest a competitive bid amount within or near the budget range that balances winning the job with fair pay. Respond as JSON: {"suggestedBid": number, "reasoning": "1-2 sentences"}`;
    const result = await generateJSON(prompt, SYS);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

export const estimateDeliveryTime = async (req, res, next) => {
  try {
    const job = await Job.findById(req.params.jobId);
    if (!job) return notFound(res, "Job not found.");

    const prompt = `Job: "${job.title}", scope: "${job.description.slice(0, 500)}", duration hint: "${job.duration}".\n\nSuggest a realistic delivery timeframe a freelancer should propose. Respond as JSON: {"estimatedDelivery": "e.g. 2 weeks", "reasoning": "short explanation"}`;
    const result = await generateJSON(prompt, SYS);
    res.status(200).json({ success: true, data: result });
  } catch (error) {
    next(error);
  }
};

// ── Profile ───────────────────────────────────────────────────────────────────

export const improveBio = async (req, res, next) => {
  try {
    const { currentBio } = req.body;
    const user = req.user;

    const prompt = `Improve this freelancer's professional bio. Their title: "${user.title || "Freelancer"}", skills: ${(user.skills || []).join(", ")}.\n\nCurrent bio: "${currentBio || user.bio || "(empty)"}"\n\nRewrite it to be compelling, specific, and client-facing (3-5 sentences). Return only the improved bio text.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const suggestProfileSkills = async (req, res, next) => {
  try {
    const user = req.user;
    const proposals = await Proposal.find({ freelancer: user._id }).populate("job", "category skills").limit(30);
    const categoriesWorked = [...new Set(proposals.map((p) => p.job?.category).filter(Boolean))];

    const prompt = `Freelancer's current skills: ${(user.skills || []).join(", ") || "none listed"}. They've applied to jobs in categories: ${categoriesWorked.join(", ") || "none yet"}.\n\nSuggest exactly 5 additional skills that would strengthen this profile and increase hireability. Respond as JSON: {"skills": ["...", ...]}`;
    const result = await generateJSON(prompt, SYS);
    res.status(200).json({ success: true, data: { skills: Array.isArray(result.skills) ? result.skills.slice(0, 6) : [] } });
  } catch (error) {
    next(error);
  }
};

export const improvePortfolioDescription = async (req, res, next) => {
  try {
    const { title, description } = req.body;
    if (!description) return res.status(400).json({ success: false, message: "description is required." });

    const prompt = `Improve this portfolio project description for title "${title || "Project"}":\n\n"""${description}"""\n\nMake it results-focused, specific, and impressive to potential clients (2-4 sentences). Return only the improved description.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const improveResumeText = async (req, res, next) => {
  try {
    const { resumeText } = req.body;
    if (!resumeText) return res.status(400).json({ success: false, message: "resumeText is required." });

    const prompt = `Review and improve this resume/CV text for a freelancer profile. Improve clarity, add quantifiable impact where plausible, and fix structure:\n\n"""${resumeText.slice(0, 8000)}"""\n\nReturn the improved version in markdown.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

// ── Active Projects ───────────────────────────────────────────────────────────

export const generateProjectUpdate = async (req, res, next) => {
  try {
    const contract = await Contract.findById(req.params.contractId).populate("client", "fullName");
    if (!contract) return notFound(res, "Project not found.");
    if (contract.freelancer.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized." });

    const milestones = await Milestone.find({ contract: contract._id }).sort({ dueDate: 1 });
    const completed = milestones.filter((m) => m.status === "completed" || m.status === "approved").length;

    const prompt = `Write a short, professional progress update message for ${contract.client?.fullName} about project "${contract.title}". Progress: ${completed}/${milestones.length} milestones complete. Keep it under 100 words, positive but honest, ready to send.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const generateClientReply = async (req, res, next) => {
  try {
    const { incomingMessage, tone } = req.body;
    if (!incomingMessage) return res.status(400).json({ success: false, message: "incomingMessage is required." });

    const contract = await Contract.findById(req.params.contractId).populate("client", "fullName");
    if (!contract) return notFound(res, "Project not found.");
    if (contract.freelancer.toString() !== req.user.id) return res.status(403).json({ success: false, message: "Not authorized." });

    const prompt = `The client ${contract.client?.fullName} sent this message on project "${contract.title}": "${incomingMessage}"\n\nDraft a professional reply from the freelancer. Tone: ${tone || "helpful and professional"}. Keep under 100 words.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const explainTask = async (req, res, next) => {
  try {
    const task = await WorkspaceTask.findById(req.params.taskId);
    if (!task) return notFound(res, "Task not found.");

    const prompt = `Explain what needs to be done for this project task in clear, actionable terms:\n\nTask: "${task.title}"\nLabel: "${task.label || "none"}"\nCurrent status: ${task.column.replace("_", " ")}\n\nGive a 2-3 sentence explanation plus one tip for completing it efficiently.`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const breakDownTask = async (req, res, next) => {
  try {
    const task = await WorkspaceTask.findById(req.params.taskId);
    if (!task) return notFound(res, "Task not found.");

    const prompt = `Break this large project task down into 4-6 smaller, concrete sub-tasks:\n\nTask: "${task.title}" (${task.label || "no label"})\n\nRespond as JSON: {"subtasks": ["...", ...]}`;
    const result = await generateJSON(prompt, SYS);
    res.status(200).json({ success: true, data: { subtasks: Array.isArray(result.subtasks) ? result.subtasks : [] } });
  } catch (error) {
    next(error);
  }
};

// ── Workspace ─────────────────────────────────────────────────────────────────

export const summarizeWorkspaceConversation = async (req, res, next) => {
  try {
    const messages = await Message.find({ contract: req.params.projectId })
      .populate("sender", "fullName")
      .sort({ createdAt: -1 })
      .limit(60);

    if (messages.length === 0) {
      return res.status(200).json({ success: true, data: { content: "No conversation history yet on this project." } });
    }

    const transcript = messages.reverse().map((m) => `${m.sender?.fullName || "User"}: ${m.content}`).join("\n");
    const prompt = `Summarize this project conversation into key points, decisions made, and any open questions:\n\n${transcript.slice(-8000)}`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply, messageCount: messages.length } });
  } catch (error) {
    next(error);
  }
};

export const summarizeWorkspaceFiles = async (req, res, next) => {
  try {
    const files = await WorkspaceFile.find({ projectId: req.params.projectId }).populate("uploadedBy", "fullName").sort({ createdAt: -1 });

    if (files.length === 0) {
      return res.status(200).json({ success: true, data: { content: "No files have been uploaded to this project yet." } });
    }

    const list = files.map((f) => `- "${f.name}" (${f.size}) uploaded by ${f.uploadedBy?.fullName || "someone"} on ${new Date(f.createdAt).toLocaleDateString()}`).join("\n");
    const prompt = `Here is the file activity log for a project workspace:\n${list}\n\nSummarize what kind of deliverables/files have been shared and note any gaps (e.g. no recent uploads, missing final deliverable).`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply, fileCount: files.length } });
  } catch (error) {
    next(error);
  }
};

export const generateMeetingNotes = async (req, res, next) => {
  try {
    const { rawNotes } = req.body;
    if (!rawNotes) return res.status(400).json({ success: false, message: "rawNotes is required." });

    const prompt = `Turn these raw meeting notes/transcript into structured meeting notes with sections: Attendees (if mentioned), Key Discussion Points, Decisions Made, Action Items (with owner if mentioned).\n\nRaw notes:\n"""${rawNotes.slice(0, 6000)}"""`;
    const reply = await generateText(prompt, SYS);
    res.status(200).json({ success: true, data: { content: reply } });
  } catch (error) {
    next(error);
  }
};

export const createTaskListFromText = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text) return res.status(400).json({ success: false, message: "text is required." });

    const prompt = `Break this project description/brief into a concrete task list for a kanban board:\n\n"""${text.slice(0, 4000)}"""\n\nRespond as JSON: {"tasks": [{"title": "...", "label": "..."}, ...]} with 4-8 tasks.`;
    const result = await generateJSON(prompt, SYS);
    res.status(200).json({ success: true, data: { tasks: Array.isArray(result.tasks) ? result.tasks : [] } });
  } catch (error) {
    next(error);
  }
};
