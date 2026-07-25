import Job from "../models/Job.js";
import Proposal from "../models/Proposal.js";
import Contract from "../models/Contract.js";

// ── Tool scopes — keeps the general chat's advice strictly within the tools
// each role actually has, matching the dedicated Client/Freelancer AI panels. ──
const CLIENT_TOOLS = [
  "Generate Job Description", "Improve Job Description", "Estimate Project Budget",
  "Suggest Required Skills", "Recommend Best Freelancer", "Compare Proposals",
  "Summarize Proposals", "Hiring Advice", "Generate Client Messages",
  "Project Progress Summary",
];

const FREELANCER_TOOLS = [
  "Generate Proposal", "Improve Proposal", "Analyze Job Description", "Job Match Score",
  "Suggest Better Bid Amount", "Estimate Delivery Time", "Improve Portfolio",
  "Improve Resume", "Improve Profile", "Career Advice", "Generate Client Replies",
  "Project Task Breakdown",
];

// ── Real, live data snapshot — no mock data. Kept compact so the prompt stays
// cheap, but specific enough that questions like "which proposal is best?" or
// "how much budget should I set?" can be answered with actual names/numbers
// instead of generic advice. ─────────────────────────────────────────────────
export async function buildRoleContext(user) {
  if (user.role === "client") {
    const jobs = await Job.find({ client: user._id })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("title status budgetMin budgetMax proposalsCount category experienceLevel");

    const jobIds = jobs.map((j) => j._id);
    const proposals = jobIds.length
      ? await Proposal.find({ job: { $in: jobIds } })
          .populate("freelancer", "fullName rating reviewCount")
          .populate("job", "title")
          .sort({ createdAt: -1 })
          .limit(20)
      : [];

    const contracts = await Contract.find({ client: user._id })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("freelancer", "fullName")
      .select("title status budget freelancer");

    const jobLines = jobs.map((j) =>
      `- "${j.title}" [${j.status}] category:${j.category} budget:₹${j.budgetMin}-${j.budgetMax} level:${j.experienceLevel} proposals:${j.proposalsCount}`
    ).join("\n") || "(no jobs posted yet)";

    const proposalLines = proposals.map((p) =>
      `- On "${p.job?.title}": ${p.freelancer?.fullName} bid ₹${p.bidAmount}, delivery ${p.estimatedDelivery}, rating ${p.freelancer?.rating || "unrated"} (${p.freelancer?.reviewCount || 0} reviews), status:${p.status}`
    ).join("\n") || "(no proposals received yet)";

    const contractLines = contracts.map((c) =>
      `- "${c.title}" with ${c.freelancer?.fullName} [${c.status}] budget ₹${c.budget}`
    ).join("\n") || "(no active/past projects yet)";

    return `YOUR POSTED JOBS:\n${jobLines}\n\nPROPOSALS RECEIVED:\n${proposalLines}\n\nYOUR PROJECTS:\n${contractLines}`;
  }

  if (user.role === "freelancer") {
    const proposals = await Proposal.find({ freelancer: user._id })
      .sort({ createdAt: -1 })
      .limit(8)
      .populate("job", "title budgetMin budgetMax status");

    const contracts = await Contract.find({ freelancer: user._id })
      .sort({ updatedAt: -1 })
      .limit(5)
      .populate("client", "fullName")
      .select("title status budget client");

    const openJobs = await Job.find({ status: "open", skills: { $in: user.skills || [] } })
      .sort({ createdAt: -1 })
      .limit(8)
      .select("title category budgetMin budgetMax experienceLevel skills proposalsCount");

    const profileLine = `Skills: ${(user.skills || []).join(", ") || "none listed"}. Title: "${user.title || "N/A"}". Hourly rate: ₹${user.hourlyRate || "N/A"}. Bio: "${(user.bio || "").slice(0, 200) || "(empty)"}"`;

    const proposalLines = proposals.map((p) =>
      `- "${p.job?.title}" bid ₹${p.bidAmount}, delivery ${p.estimatedDelivery}, status:${p.status}`
    ).join("\n") || "(no proposals sent yet)";

    const contractLines = contracts.map((c) =>
      `- "${c.title}" with ${c.client?.fullName} [${c.status}] budget ₹${c.budget}`
    ).join("\n") || "(no active/past projects yet)";

    const jobLines = openJobs.map((j) =>
      `- "${j.title}" (${j.category}) budget ₹${j.budgetMin}-${j.budgetMax}, level:${j.experienceLevel}, skills:${j.skills.join(", ")}, ${j.proposalsCount || 0} proposals so far`
    ).join("\n") || "(no open jobs currently match your listed skills)";

    return `YOUR PROFILE:\n${profileLine}\n\nYOUR RECENT PROPOSALS:\n${proposalLines}\n\nYOUR PROJECTS:\n${contractLines}\n\nOPEN JOBS MATCHING YOUR SKILLS:\n${jobLines}`;
  }

  return "";
}

export function buildSystemInstruction(role, dataContext, fullName) {
  const isClient = role === "client";
  const toolList = isClient ? CLIENT_TOOLS : FREELANCER_TOOLS;
  const otherRole = isClient ? "freelancer" : "client";
  const firstName = (fullName || "").trim().split(/\s+/)[0] || null;

  return (
    `You are the official Nexora AI Assistant — the built-in assistant for Nexora, an AI-powered freelance marketplace. ` +
    `You are NOT a generic programming assistant. You are a warm, conversational, ChatGPT-like product assistant embedded inside the Nexora platform, and you should always talk like one — natural sentences, no boilerplate section headers like "SPECIFICATION" or "TECHNICAL ASSISTANT", never dry documentation, unless the user explicitly asks a coding/programming question.\n\n` +

    `USER_NAME: ${firstName || "there"}\n` +
    `The current logged-in user's role is: ${role.toUpperCase()}.${firstName ? ` Their name is ${firstName} — greet them by name naturally, the way a helpful colleague would, not in every single message.` : ""}\n\n` +

    `GREETING BEHAVIOR: If the user opens with a simple greeting or small talk (e.g. "hi", "hello", "how are you?"), do NOT dive into a tool list dump or ask what they want to build. Respond warmly and briefly, welcome them back to Nexora by name, and mention in one natural sentence a few of the things you can help with as a ${role} — then ask what they'd like to do today. For example, if this were a ${role}, a good greeting reply looks like:\n` +
    (isClient
      ? `"Hello ${firstName || "there"}! Welcome back to Nexora. I can help you create better job posts, estimate project budgets, compare freelancer proposals, manage your projects, and answer any questions about hiring. What would you like to do today?"\n\n`
      : `"Hello ${firstName || "there"}! Welcome back to Nexora. I'm your AI assistant. I can help you write proposals, analyze jobs, improve your profile, estimate delivery time, or answer any questions about your freelance projects. How can I help you today?"\n\n`) +

    `You must ONLY act as a ${role} assistant. Your available tools/capabilities for this user are exactly:\n` +
    toolList.map((t) => `- ${t}`).join("\n") +
    `\n\nNever offer ${otherRole}-side tools or advice (e.g. ${isClient ? "writing proposals, bidding, or freelancer career advice" : "hiring, comparing proposals, or client budgeting advice"}) — if the user asks for something outside your role's tools, briefly explain that's a ${otherRole}-side feature and redirect to what you *can* help with as a ${role}.\n\n` +

    `REAL DATA ONLY: This user's actual live jobs, proposals, projects, and profile are provided below. When the user asks something like "which proposal is best?", "estimate my budget", "explain this project", or "summarize my workspace", you MUST answer using these real specifics (actual names, titles, numbers) — never invent generic placeholder answers when real data is available below. If the snapshot doesn't contain what you need to answer precisely, ask the user a short clarifying question rather than guessing or giving generic advice.\n\n` +
    `--- LIVE DATA SNAPSHOT ---\n${dataContext || "(no data yet)"}\n--- END SNAPSHOT ---\n\n` +

    `Do not generate programming documentation, code samples, or developer/API instructions unless the user's message is clearly a coding or technical programming question. Everything else — including questions about proposals, jobs, budgets, hiring, or the platform — should get a natural, conversational, business-focused answer, not a technical one.\n\n` +
    `Be direct and practical. Format responses with clean markdown (bold, bullet lists) where it helps readability, and fenced code blocks only for actual code. Use the conversation history for context and refer back to earlier messages naturally.`
  );
}
