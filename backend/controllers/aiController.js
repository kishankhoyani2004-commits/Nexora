import { generateText } from "../services/geminiService.js";
import AiConversation from "../models/AiConversation.js";

// Helper to push history and save
const saveToHistory = async (userId, channel, userMessage, assistantMessage) => {
  try {
    let conversation = await AiConversation.findOne({ userId, channel });
    if (!conversation) {
      conversation = new AiConversation({ userId, channel, messages: [] });
    }
    if (userMessage) {
      conversation.messages.push({ role: "user", content: userMessage });
    }
    if (assistantMessage) {
      conversation.messages.push({ role: "assistant", content: assistantMessage });
    }
    await conversation.save();
    return conversation.messages;
  } catch (err) {
    console.error("[AiController] Error saving history:", err.message);
  }
};

export const chat = async (req, res, next) => {
  try {
    const prompt = req.body.prompt || req.body.message;
    const channel = req.body.channel || "#general";
    if (!prompt) {
      return res.status(400).json({ success: false, message: "Prompt or message is required." });
    }

    // Retrieve previous messages to supply conversation memory to Gemini API
    let conversation = await AiConversation.findOne({ userId: req.user.id, channel });
    const history = conversation ? conversation.messages : [];

    const reply = await generateText(
      prompt,
      `You are Nexora AI, a friendly coding and business advisor in a freelance marketplace. You are communicating in the channel: ${channel}. Keep replies clean, contentful, and format using markdown where appropriate.`,
      history
    );

    // Save turn to MongoDB
    await saveToHistory(req.user.id, channel, prompt, reply);

    res.status(200).json({ success: true, reply });
  } catch (error) {
    next(error);
  }
};

export const getHistory = async (req, res, next) => {
  try {
    const channel = req.query.channel || "#general";
    let conversation = await AiConversation.findOne({ userId: req.user.id, channel });
    if (!conversation) {
      conversation = await AiConversation.create({ userId: req.user.id, channel, messages: [] });
    }
    res.status(200).json({ success: true, messages: conversation.messages });
  } catch (error) {
    next(error);
  }
};

export const clearHistory = async (req, res, next) => {
  try {
    const channel = req.body.channel || "#general";
    await AiConversation.deleteOne({ userId: req.user.id, channel });
    res.status(200).json({ success: true, message: "History cleared successfully." });
  } catch (error) {
    next(error);
  }
};

export const generateProposal = async (req, res, next) => {
  try {
    const { jobId, context, jobTitle, jobDescription } = req.body;
    const title = jobTitle || "SaaS App development";
    const desc = jobDescription || context || "Create custom panels";
    const channel = "#proposal-craft";
    
    const prompt = `Write a high-converting project proposal cover letter for the job: "${title}".\nDetails: "${desc}".\nHighlight expertise, roadmap milestones, and call-to-action.`;
    const reply = await generateText(prompt, "You are an expert freelance proposal writer.");
    
    // Save to proposal history channel
    await saveToHistory(req.user.id, channel, `Generate proposal cover letter for "${title}"`, reply);

    res.status(200).json({ success: true, content: reply, reply, proposal: reply });
  } catch (error) {
    next(error);
  }
};

export const generateJobDescription = async (req, res, next) => {
  try {
    const { prompt, title, skills } = req.body;
    const jobTitle = title || prompt || "Developer";
    const finalPrompt = `Generate a modern job description for hiring a "${jobTitle}". Required skills: ${skills ? skills.join(", ") : "general experience"}. Include overview, requirements, and deliverables.`;
    const reply = await generateText(finalPrompt, "You are a professional HR recruiter.");

    // Save to general history channel
    await saveToHistory(req.user.id, "#general", `Generate job description for "${jobTitle}"`, reply);

    res.status(200).json({ success: true, content: reply, reply });
  } catch (error) {
    next(error);
  }
};

export const resumeAnalysis = async (req, res, next) => {
  try {
    const fileName = req.file ? req.file.originalname : "Resume.pdf";
    const prompt = `Analyze this resume file named "${fileName}" for a freelancer profile. Rate it out of 100, summarize key strengths, and list 3 concrete improvements.`;
    const summaryText = await generateText(prompt, "You are a professional technical recruiter auditing resumes.");
    const channel = "#resume-audit";
    const suggestions = [
      "Include links to live GitHub repositories for projects.",
      "Add concrete impact metrics (e.g., 'reduced load time by 30%').",
      "Clearly separate frontend, backend, and AI skills under core expertise."
    ];

    const auditResponseMarkdown = `### Resume Analysis Report

**File Name**: ${fileName}

**Recruiter Assessment Summary**:
${summaryText}

**Concrete Improvement Suggestions**:
${suggestions.map((s, idx) => `- **Suggestion ${idx + 1}**: ${s}`).join("\n")}`;

    // Save to resume history channel
    await saveToHistory(req.user.id, channel, `Uploaded resume: "${fileName}" for AI analysis`, auditResponseMarkdown);
    
    res.status(200).json({
      success: true,
      summary: summaryText,
      suggestions
    });
  } catch (error) {
    next(error);
  }
};

export const careerAdvice = async (req, res, next) => {
  try {
    const { prompt } = req.body;
    const finalPrompt = `Give career advice based on the request: "${prompt || "How to grow as an AI Freelancer in 2026?"}". Include market trends, next skill steps, and actionable goals.`;
    const reply = await generateText(finalPrompt, "You are an elite career development advisor.");
    const channel = "#career-guidance";

    // Save to career advice history channel
    await saveToHistory(req.user.id, channel, prompt || "Request general career growth advice.", reply);

    res.status(200).json({ success: true, content: reply, reply });
  } catch (error) {
    next(error);
  }
};

export const skillRecommendation = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const prompt = `Suggest a list of exactly 5 relevant skills or technologies to learn next for a freelancer. Format as a simple summary.`;
    const reply = await generateText(prompt, "You are a technical career path auditor.");
    const channel = "#career-guidance";
    const skills = ["Pinecone Vector Search", "Vite & React Query", "CI/CD GitHub Actions", "Stripe Checkout Integrations", "TypeScript Architecture"];

    const recommendationMarkdown = `### AI Skill Path Recommendations

Based on your freelancer profile, here are the top suggested technologies you should acquire to scale your earnings:

${skills.map((s, i) => `${i + 1}. **${s}**`).join("\n")}

**AI Strategic Overview**:
${reply}`;

    // Save to career path recommendations history channel
    await saveToHistory(req.user.id, channel, "Request personalized skill recommendations", recommendationMarkdown);

    res.status(200).json({
      success: true,
      skills,
      reply
    });
  } catch (error) {
    next(error);
  }
};
