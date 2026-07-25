import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;
let aiInstance = null;

if (apiKey) {
  aiInstance = new GoogleGenerativeAI(apiKey);
} else {
  console.log("⚠️ [GEMINI] GEMINI_API_KEY missing. Falling back to local generative simulation model.");
}

// ── Streaming variant — yields incremental text chunks for real typing-effect
// responses instead of the fake client-side setInterval typewriter. ──────────
export const generateTextStream = async function* (prompt, systemInstruction = "", history = []) {
  if (aiInstance) {
    const cleanInstruction = (systemInstruction || "You are Nexora AI, a professional freelance assistant.") +
      " Format responses using clean markdown (headers, bold, code blocks, lists) where helpful.";

    const model = aiInstance.getGenerativeModel({
      model: "gemini-flash-latest",
      systemInstruction: cleanInstruction,
    });

    const formattedHistory = history.map(h => ({
      role: h.role === "assistant" || h.role === "model" ? "model" : "user",
      parts: [{ text: h.content || h.parts?.[0]?.text || "" }]
    }));

    const chat = model.startChat({ history: formattedHistory });
    const result = await chat.sendMessageStream(prompt);

    for await (const chunk of result.stream) {
      const text = chunk.text();
      if (text) yield text;
    }
    return;
  }

  // No API key — degrade gracefully by chunking the non-streaming fallback text.
  const fallback = await generateText(prompt, systemInstruction, history);
  const words = fallback.split(" ");
  for (let i = 0; i < words.length; i += 4) {
    yield words.slice(i, i + 4).join(" ") + " ";
  }
};

// ── Structured JSON helper — for features that need a parseable result
// (match scores, skill lists, budget estimates) rather than free-form prose.
// Always returns a plain object; never throws for malformed model output —
// callers get `{ _raw }` as a safe fallback instead. ─────────────────────────
export const generateJSON = async (prompt, systemInstruction = "") => {
  const instruction =
    (systemInstruction || "You are Nexora AI.") +
    " Respond with ONLY valid raw JSON — no markdown code fences, no commentary, no leading/trailing text.";

  const raw = await generateText(prompt, instruction, []);
  const cleaned = raw.replace(/```json/gi, "").replace(/```/g, "").trim();

  try {
    return JSON.parse(cleaned);
  } catch {
    // Try to salvage a JSON object embedded in extra prose.
    const match = cleaned.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[0]);
      } catch {
        // fall through
      }
    }
    return { _raw: raw };
  }
};

// ── Role detection for the offline fallback simulator ────────────────────────
// The real Gemini model reads the systemInstruction's role scoping directly,
// but the no-API-key fallback below is pure keyword matching — without this
// it would answer a CLIENT's "which freelancer should I hire?" with a
// freelancer-side "here is my proposal cover letter" template, mixing the
// two roles' tools together. Both aiContextService's buildSystemInstruction
// ("role is: CLIENT/FREELANCER") and the dedicated Client/Freelancer
// controllers' SYS strings ("Client Portal" / "Freelancer Hub") are detected.
function detectRole(systemInstruction = "") {
  if (/role is:\s*client\b/i.test(systemInstruction) || /client portal/i.test(systemInstruction)) return "client";
  if (/role is:\s*freelancer\b/i.test(systemInstruction) || /freelancer hub/i.test(systemInstruction)) return "freelancer";
  return null;
}

function extractName(systemInstruction = "") {
  const m = systemInstruction.match(/USER_NAME:\s*([^\n]+)/i);
  const name = m ? m[1].trim() : null;
  return name && name.toLowerCase() !== "there" ? name : null;
}

function extractSnapshot(systemInstruction = "") {
  const m = systemInstruction.match(/--- LIVE DATA SNAPSHOT ---\n([\s\S]*?)\n--- END SNAPSHOT ---/);
  return m ? m[1].trim() : "";
}

function extractSection(snapshot, header) {
  const idx = snapshot.indexOf(header);
  if (idx === -1) return [];
  const rest = snapshot.slice(idx + header.length);
  const nextBlank = rest.search(/\n\n/);
  const block = (nextBlank === -1 ? rest : rest.slice(0, nextBlank)).trim();
  return block.split("\n").map((l) => l.trim()).filter((l) => l.startsWith("-"));
}

function isGreeting(prompt) {
  const p = prompt.trim().toLowerCase();
  if (p.length > 40) return false;
  return /^(hi+|hey+|hello|yo|howdy|sup|good\s?(morning|afternoon|evening))\b/.test(p) || p.includes("how are you");
}

function isCodingQuestion(promptLower) {
  return /\b(code|function|bug|error|debug|api endpoint|javascript|typescript|python code|react component|stack trace|exception|syntax error|compile|npm install|package\.json|regex|useeffect|react query)\b/.test(promptLower);
}

function greetingReply(role, name) {
  const who = name ? name.split(" ")[0] : "there";
  if (role === "client") {
    return `Hello ${who}! Welcome back to Nexora. I can help you create better job posts, estimate project budgets, compare freelancer proposals, manage your projects, and answer any questions about hiring. What would you like to do today?`;
  }
  return `Hello ${who}! Welcome back to Nexora. I'm your AI assistant. I can help you write proposals, analyze jobs, improve your profile, estimate delivery time, or answer any questions about your freelance projects. How can I help you today?`;
}

// ── Real-data parsers for the offline fallback — mirrors the exact line
// formats produced by aiContextService.buildRoleContext, so answers like
// "which proposal is best?" use the user's actual jobs/proposals instead of
// generic advice, even when no GEMINI_API_KEY is configured. ────────────────
function parseClientProposalLines(lines) {
  return lines.map((line) => {
    const m = line.match(/^- On "(.+?)":\s*(.+?)\s+bid\s+₹([\d,]+),\s*delivery\s+(.+?),\s*rating\s+([\d.]+|unrated)\s*\((\d+)\s*reviews\),\s*status:(\w+)$/);
    if (!m) return null;
    return { job: m[1], freelancer: m[2].trim(), bid: Number(m[3].replace(/,/g, "")), delivery: m[4].trim(), rating: m[5] === "unrated" ? 0 : Number(m[5]), reviews: Number(m[6]), status: m[7] };
  }).filter(Boolean);
}

function parseClientJobLines(lines) {
  return lines.map((line) => {
    const m = line.match(/^- "(.+?)"\s*\[(\w+)\]\s*category:(.+?)\s*budget:₹([\d,]+)-([\d,]+)\s*level:(\w+)\s*proposals:(\d+)$/);
    if (!m) return null;
    return { title: m[1], status: m[2], category: m[3].trim(), min: Number(m[4].replace(/,/g, "")), max: Number(m[5].replace(/,/g, "")), level: m[6], proposals: Number(m[7]) };
  }).filter(Boolean);
}

function parseContractLines(lines) {
  return lines.map((line) => {
    const m = line.match(/^- "(.+?)"\s+with\s+(.+?)\s+\[(\w+)\]\s+budget\s+₹([\d,]+)$/);
    if (!m) return null;
    return { title: m[1], with: m[2].trim(), status: m[3], budget: Number(m[4].replace(/,/g, "")) };
  }).filter(Boolean);
}

function parseFreelancerProposalLines(lines) {
  return lines.map((line) => {
    const m = line.match(/^- "(.+?)"\s+bid\s+₹([\d,]+),\s*delivery\s+(.+?),\s*status:(\w+)$/);
    if (!m) return null;
    return { job: m[1], bid: Number(m[2].replace(/,/g, "")), delivery: m[3].trim(), status: m[4] };
  }).filter(Boolean);
}

function parseOpenJobLines(lines) {
  return lines.map((line) => {
    const m = line.match(/^- "(.+?)"\s*\((.+?)\)\s*budget\s+₹([\d,]+)-([\d,]+),\s*level:(\w+),\s*skills:(.*?),\s*(\d+)\s*proposals so far$/);
    if (!m) return null;
    return { title: m[1], category: m[2], min: Number(m[3].replace(/,/g, "")), max: Number(m[4].replace(/,/g, "")), level: m[5], skills: m[6].trim(), proposals: Number(m[7]) };
  }).filter(Boolean);
}

function inr(n) {
  return `₹${Number(n).toLocaleString("en-IN")}`;
}

function clientFallback(prompt, promptLower, systemInstruction) {
  const snapshot = extractSnapshot(systemInstruction);
  const proposals = parseClientProposalLines(extractSection(snapshot, "PROPOSALS RECEIVED:"));
  const jobs = parseClientJobLines(extractSection(snapshot, "YOUR POSTED JOBS:"));
  const contracts = parseContractLines(extractSection(snapshot, "YOUR PROJECTS:"));
  const activeProposals = proposals.filter((p) => !["rejected", "withdrawn"].includes(p.status));

  if (promptLower.includes("compare")) {
    if (activeProposals.length === 0) {
      return `You don't have any active proposals to compare yet. Once freelancers start applying to your open jobs, ask me again and I'll break down their bids, delivery times, and ratings side by side.`;
    }
    const rows = activeProposals.map((p) => `| ${p.freelancer} | ${p.job} | ${inr(p.bid)} | ${p.delivery} | ${p.rating || "unrated"} (${p.reviews} reviews) |`);
    return `Here's how your current proposals compare:\n\n| Freelancer | Job | Bid | Delivery | Rating |\n|---|---|---|---|---|\n${rows.join("\n")}\n\nOverall, I'd weigh rating and review count more heavily than the lowest bid — a much cheaper bid on a complex job is often a red flag for under-scoping.`;
  }

  if (promptLower.includes("summariz")) {
    if (activeProposals.length === 0) {
      return `You don't have any proposals to summarize yet. Once you receive some on your open jobs, I'll turn each one into a quick summary of their offer, timeline, and price.`;
    }
    const lines = activeProposals.map((p) => `- **${p.freelancer}** on "${p.job}": bidding ${inr(p.bid)}, delivering in ${p.delivery}, rated ${p.rating || "unrated"} (${p.reviews} reviews).`);
    return `Here's a quick summary of your proposals:\n\n${lines.join("\n")}`;
  }

  if (promptLower.includes("freelancer") || promptLower.includes("hire") || promptLower.includes("proposal") || promptLower.includes("best")) {
    if (activeProposals.length === 0) {
      return `You haven't received any proposals yet on your open jobs, so there's no one to recommend just yet. Once proposals start coming in, ask me "which proposal is best?" and I'll compare them by skill fit, rating, and price to tell you exactly who to hire.`;
    }
    const scored = activeProposals.map((p) => ({ ...p, score: p.rating * 15 + Math.min(p.reviews, 20) - p.bid / 5000 })).sort((a, b) => b.score - a.score);
    const best = scored[0];
    return `Based on your actual proposals, I'd recommend **${best.freelancer}** for "${best.job}" — they're bidding ${inr(best.bid)} with a ${best.delivery} delivery time and a ${best.rating || "unrated"}-star rating across ${best.reviews} reviews. That combination of track record and reasonable pricing beats the other candidates you have right now.${scored.length > 1 ? `\n\nRunner-up: **${scored[1].freelancer}** on "${scored[1].job}" (${inr(scored[1].bid)}, ${scored[1].rating || "unrated"}★).` : ""}`;
  }

  if (promptLower.includes("budget")) {
    if (jobs.length > 0) {
      const avgMin = Math.round(jobs.reduce((s, j) => s + j.min, 0) / jobs.length);
      const avgMax = Math.round(jobs.reduce((s, j) => s + j.max, 0) / jobs.length);
      return `Looking at your posting history, your jobs have averaged a budget of ${inr(avgMin)}–${inr(avgMax)}. For a new job, I'd suggest staying in a similar range unless the scope is notably bigger or smaller — tell me the title and experience level you need and I can narrow it down further.`;
    }
    return `For a fair budget: entry-level work typically runs ${inr(15000)}–${inr(40000)} for a scoped 2-4 week project, intermediate work ${inr(40000)}–${inr(120000)}, and expert/specialized work ${inr(120000)}+. Tell me the job title and scope and I'll narrow that down.`;
  }

  if (promptLower.includes("skill")) {
    return `Tell me the job title and category and I'll suggest the exact skills to require. As a starting point — web apps usually need React/Next.js, Node.js, and API/database experience; mobile apps need React Native or native Swift/Kotlin; data projects need Python and SQL; design work needs Figma and a solid design-system sense.`;
  }

  if (promptLower.includes("job description") || (promptLower.includes("hiring") && promptLower.includes("write"))) {
    let title = "Senior Software Engineer";
    if (promptLower.includes("react") || promptLower.includes("frontend")) title = "Senior Frontend Developer (React)";
    else if (promptLower.includes("node") || promptLower.includes("backend")) title = "Senior Backend Developer (Node.js)";

    return `Here's a draft job description for a ${title}:\n\n**Role Overview**\nWe're looking for a ${title} to help scale our platform — someone who can own technical decisions and collaborate closely with our team.\n\n**What we need**\n- Solid, provable experience shipping production software\n- Strong communication and proactive updates\n- Comfort working independently on a defined scope\n\n**What you'll deliver**\n- Clean, well-tested, maintainable code\n- Regular progress updates against milestones\n\nWant me to tailor this further? Tell me more about the specific project.`;
  }

  if (promptLower.includes("message") || promptLower.includes("reply")) {
    if (contracts.length > 0) {
      const c = contracts[0];
      return `Here's a draft message for "${c.title}" with ${c.with}:\n\nHi ${c.with}, thanks for the update on ${c.title} — appreciate the progress. Could you share a quick status and confirm we're still on track? Happy to hop on a call this week if useful.\n\nBest`;
    }
    return `Tell me which project and what you want to say, and I'll draft a professional message to send to your freelancer.`;
  }

  if (promptLower.includes("progress") || promptLower.includes("milestone") || promptLower.includes("workspace") || promptLower.includes("explain this project")) {
    if (contracts.length === 0) {
      return `You don't have any active or past projects yet. Once you hire a freelancer, I can summarize progress, flag overdue milestones, and suggest next actions here.`;
    }
    const lines = contracts.map((c) => `- **${c.title}** with ${c.with} — ${c.status}, budget ${inr(c.budget)}`);
    return `Here's where your projects stand:\n\n${lines.join("\n")}\n\nWant me to suggest next actions for any of these?`;
  }

  return `I'm here to help you hire and manage freelancers on Nexora — job descriptions, budgets, comparing proposals, hiring recommendations, project progress, and messages to your freelancers. What would you like help with?`;
}

function freelancerFallback(prompt, promptLower, systemInstruction) {
  const snapshot = extractSnapshot(systemInstruction);
  const myProposals = parseFreelancerProposalLines(extractSection(snapshot, "YOUR RECENT PROPOSALS:"));
  const contracts = parseContractLines(extractSection(snapshot, "YOUR PROJECTS:"));
  const openJobs = parseOpenJobLines(extractSection(snapshot, "OPEN JOBS MATCHING YOUR SKILLS:"));

  if (promptLower.includes("match") || (promptLower.includes("job") && (promptLower.includes("best") || promptLower.includes("fit")))) {
    if (openJobs.length === 0) {
      return `I don't see any open jobs matching your listed skills right now — try broadening your profile skills, or ask me to analyze a specific job you've found.`;
    }
    const ranked = [...openJobs].sort((a, b) => a.proposals - b.proposals).slice(0, 5);
    const lines = ranked.map((j) => {
      const score = Math.max(55, 100 - j.proposals * 4);
      return `- **${j.title}** (${j.category}) — ${inr(j.min)}-${inr(j.max)}, ${j.level} level, ${j.proposals} proposals so far — match score ~${score}%`;
    });
    return `Here are open jobs that best match your skills right now:\n\n${lines.join("\n")}\n\nJobs with fewer proposals so far give you better odds — want a proposal drafted for any of these?`;
  }

  if (promptLower.includes("bid") || (promptLower.includes("budget") && promptLower.includes("charge"))) {
    if (openJobs.length > 0) {
      const j = openJobs[0];
      const mid = Math.round((j.min + j.max) / 2);
      return `For "${j.title}" (budget ${inr(j.min)}-${inr(j.max)}), I'd suggest bidding around ${inr(mid)} — competitive enough to win the job without underpricing your work, especially with ${j.proposals} other proposals already in. Tell me the specific job if you meant a different one.`;
    }
    return `Tell me the job's budget range and scope and I'll suggest a competitive bid that doesn't undersell your work.`;
  }

  if (promptLower.includes("deliver")) {
    return `Tell me the project's scope (or paste the job description) and I'll suggest a realistic delivery timeframe — one that's fast enough to be competitive but doesn't box you into an unrealistic deadline.`;
  }

  if (promptLower.includes("proposal") && (promptLower.includes("improve") || promptLower.includes("rewrite") || promptLower.includes("better"))) {
    return `Paste your current proposal draft and I'll rewrite it to be more persuasive, specific, and professional — tightening the opening, sharpening how you highlight relevant skills, and strengthening the call to action.`;
  }

  if (promptLower.includes("proposal")) {
    let matchedTitle = null;
    const titleMatch = prompt.match(/applying for the job:\s*"([^"]+)"/i) || prompt.match(/job:\s*"([^"]+)"/i);
    if (titleMatch && titleMatch[1]) matchedTitle = titleMatch[1];

    if (!matchedTitle && openJobs.length === 0) {
      return `Happy to help you write a winning proposal — which job is it for? Paste the title and description (or link me to it) and I'll draft a personalized cover letter using your actual skills and experience.`;
    }

    const title = matchedTitle || openJobs[0].title;
    return `Here's a draft proposal for "${title}":\n\nDear Client,\n\nI'd love to help with "${title}". Based on my experience and skill set, I can deliver a clean, well-tested solution that matches exactly what you're looking for.\n\n**Why I'm a good fit:**\n- Direct experience with the core skills this project needs\n- Clear, proactive communication throughout\n- A track record of delivering on scope and on time\n\n**My approach:**\n1. Kick off with a quick scoping call to confirm requirements\n2. Build in clear milestones so you always know where things stand\n3. Deliver, test, and polish before handoff\n\nWould love to jump on a quick call to discuss further.\n\nBest regards`;
  }

  if (promptLower.includes("job description") || promptLower.includes("analyze")) {
    return `Paste the job description (or the job title) and I'll tell you honestly whether it's a good opportunity — considering budget fit, scope clarity, and whether it matches your skills.`;
  }

  if (promptLower.includes("portfolio")) {
    return `Share the portfolio project description you'd like improved, and I'll make it more results-focused — leading with the impact/outcome rather than just listing the tech used.`;
  }

  if (promptLower.includes("resume") || promptLower.includes("cv")) {
    return `Paste your resume text (or upload the file using the paperclip below) and I'll review it for clarity, impact, and ATS-friendliness, then suggest specific improvements.`;
  }

  if (promptLower.includes("profile") || promptLower.includes("bio")) {
    return `Share your current bio, or just say "go ahead" and I'll suggest improvements based on your listed skills and experience to make your profile more attractive to clients.`;
  }

  if (promptLower.includes("career") || promptLower.includes("advice") || promptLower.includes("coaching") || promptLower.includes("grow")) {
    return `A few things that tend to move the needle for freelancers on Nexora:\n\n1. **Specialize** — "AI integrations engineer" gets noticed faster than "full stack developer."\n2. **Show outcomes, not tasks** — 2-3 strong case studies with measurable results beat a long list of small projects.\n3. **Price for value** — milestone-based pricing aligns your incentives with the client's and usually earns more than flat hourly rates.\n\nWant advice tailored to your specific skills and recent work?`;
  }

  if (promptLower.includes("client") && (promptLower.includes("repl") || promptLower.includes("message"))) {
    return `Paste the message your client sent, and I'll draft a professional, friendly reply that keeps the project moving.`;
  }

  if (promptLower.includes("task") && (promptLower.includes("break") || promptLower.includes("split"))) {
    return `Share the project description and I'll break it into a clear list of smaller, actionable tasks you can work through one at a time.`;
  }

  if (promptLower.includes("earning") || promptLower.includes("payment") || promptLower.includes("withdraw")) {
    if (contracts.length > 0) {
      const totalEarned = contracts.filter((c) => c.status === "completed").reduce((s, c) => s + c.budget, 0);
      return `From your completed projects on Nexora, you've earned ${inr(totalEarned)} so far. For anything about pending withdrawals or payout timing, check the Earnings page — I can help interpret what you see there if you have questions.`;
    }
    return `You don't have any completed projects yet to report earnings from. Once you complete your first contract, I can help you track and understand your earnings here.`;
  }

  if (promptLower.includes("review")) {
    return `Your reviews build trust with future clients — delivering consistently and communicating proactively on active projects is the best way to earn strong ones. Want tips on responding to a specific review?`;
  }

  if (isCodingQuestion(promptLower)) {
    return `Happy to help with that. Could you share the specific code, error message, or what you're trying to build? I'll walk through it with you.`;
  }

  return `I'm here to help you find work and succeed as a freelancer on Nexora — writing and improving proposals, analyzing jobs, checking your match score, planning delivery timelines, improving your profile, and more. What would you like help with?`;
}

export const generateText = async (prompt, systemInstruction = "", history = []) => {
  try {
    if (aiInstance) {
      const cleanInstruction = (systemInstruction || "You are Nexora AI, a professional freelance assistant.") + 
        " IMPORTANT: Do not output raw markdown headers like ### or nested formatting markers like ***. Use clean CAPITALIZED text headers instead.";

      const model = aiInstance.getGenerativeModel({
        model: "gemini-flash-latest",
        systemInstruction: cleanInstruction,
      });

      // Filter and format history to ensure correct Gemini format: { role: 'user'|'model', parts: [{ text: string }] }
      const formattedHistory = history.map(h => ({
        role: h.role === "assistant" || h.role === "model" ? "model" : "user",
        parts: [{ text: h.content || h.parts?.[0]?.text || "" }]
      }));

      const chat = model.startChat({
        history: formattedHistory,
      });

      const result = await chat.sendMessage(prompt);
      const response = await result.response;
      const rawText = response.text();
      
      // Post-process response to ensure no leaked raw tags
      return rawText
        .replace(/###/g, "")
        .replace(/\*\*\*/g, "")
        .replace(/##/g, "");
    }

    // ── Offline fallback (no GEMINI_API_KEY) — role-scoped and grounded in
    // the real live-data snapshot embedded in systemInstruction, never a
    // generic canned template. Greetings are handled first so "hi"/"hello"
    // never falls through to a tool-specific branch. ─────────────────────────
    const role = detectRole(systemInstruction);
    const name = extractName(systemInstruction);

    if (isGreeting(prompt)) {
      return greetingReply(role === "client" ? "client" : "freelancer", name);
    }

    if (role === "client") {
      return clientFallback(prompt, prompt.toLowerCase(), systemInstruction);
    }

    if (role === "freelancer") {
      return freelancerFallback(prompt, prompt.toLowerCase(), systemInstruction);
    }

    // No role context (legacy unscoped callers) — keep a neutral, warm default.
    const promptLower = prompt.toLowerCase();
    if (isCodingQuestion(promptLower)) {
      return `Happy to help with that. Could you share the specific code, error, or what you're trying to build?`;
    }
    return `Hi! I'm Nexora AI. I can help with proposals, job descriptions, hiring, and managing your freelance projects. What would you like help with?`;
  } catch (error) {
    console.error("Gemini AI API Error:", error.message);
    throw error;
  }
};
