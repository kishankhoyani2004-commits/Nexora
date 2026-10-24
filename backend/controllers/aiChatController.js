import fs from "fs/promises";
import AiChat from "../models/AiChat.js";
import { generateText, generateTextStream, generateJSON } from "../services/geminiService.js";
import { extractTextFromFile } from "../services/fileParserService.js";
import { buildRoleContext, buildSystemInstruction } from "../services/aiContextService.js";

// Context cache — avoids 3 heavy DB queries on every single AI message.
// Expires after 2 minutes so data stays reasonably fresh during a session.
const contextCache = new Map();
const CACHE_TTL_MS = 2 * 60 * 1000;

// Builds a fresh, role-scoped, real-data-grounded system instruction for the
// requesting user — so the same general chat endpoint answers a client's
// "which proposal is best?" and a freelancer's "estimate my delivery time?"
// with the correct toolset and actual live data, never mock content.
const getSystemInstruction = async (user) => {
  const cacheKey = `${user._id}_${user.role}`;
  const cached = contextCache.get(cacheKey);
  if (cached && Date.now() - cached.ts < CACHE_TTL_MS) return cached.instruction;

  const role = user.role === "client" ? "client" : "freelancer";
  const dataContext = await buildRoleContext(user);
  const instruction = buildSystemInstruction(role, dataContext, user.fullName);

  contextCache.set(cacheKey, { instruction, ts: Date.now() });
  return instruction;
};

// Find a chat scoped to the current user — 404s instead of 403 so we never
// leak whether a chat id exists for someone else's account.
const findOwnedChat = async (chatId, userId) => {
  const chat = await AiChat.findOne({ _id: chatId, userId });
  return chat;
};

const deriveTitle = (firstMessage) => {
  const clean = (firstMessage || "").replace(/\s+/g, " ").trim();
  if (!clean) return "New Chat";
  return clean.length > 48 ? clean.slice(0, 48) + "…" : clean;
};

// ── Chat CRUD ────────────────────────────────────────────────────────────────

export const createChat = async (req, res, next) => {
  try {
    const { title, context } = req.body;
    const chat = await AiChat.create({
      userId: req.user.id,
      title: title || "New Chat",
      context: context || "general",
      messages: [],
    });
    res.status(201).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

export const listChats = async (req, res, next) => {
  try {
    const chats = await AiChat.find({ userId: req.user.id })
      .sort({ pinned: -1, lastMessageAt: -1 })
      .select("title context pinned lastMessageAt createdAt messages");

    const summaries = chats.map((c) => {
      const last = c.messages[c.messages.length - 1];
      return {
        id: c.id,
        title: c.title,
        context: c.context,
        pinned: c.pinned,
        lastMessageAt: c.lastMessageAt,
        createdAt: c.createdAt,
        messageCount: c.messages.length,
        preview: last ? last.content.slice(0, 100) : "",
      };
    });

    res.status(200).json({ success: true, data: summaries });
  } catch (error) {
    next(error);
  }
};

export const searchChats = async (req, res, next) => {
  try {
    const q = (req.query.q || "").trim();
    if (!q) {
      return res.status(200).json({ success: true, data: [] });
    }

    const chats = await AiChat.find(
      { userId: req.user.id, $text: { $search: q } },
      { score: { $meta: "textScore" } }
    )
      .sort({ score: { $meta: "textScore" } })
      .limit(30)
      .select("title context pinned lastMessageAt messages");

    const results = chats.map((c) => {
      const matchedMessage = c.messages.find((m) =>
        m.content.toLowerCase().includes(q.toLowerCase())
      );
      return {
        id: c.id,
        title: c.title,
        context: c.context,
        lastMessageAt: c.lastMessageAt,
        snippet: matchedMessage ? matchedMessage.content.slice(0, 140) : c.title,
      };
    });

    res.status(200).json({ success: true, data: results });
  } catch (error) {
    next(error);
  }
};

export const getChat = async (req, res, next) => {
  try {
    const chat = await findOwnedChat(req.params.chatId, req.user.id);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });
    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

export const renameChat = async (req, res, next) => {
  try {
    const { title } = req.body;
    if (!title || !title.trim()) {
      return res.status(400).json({ success: false, message: "Title is required." });
    }
    const chat = await findOwnedChat(req.params.chatId, req.user.id);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });

    chat.title = title.trim().slice(0, 100);
    await chat.save();
    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

export const togglePinChat = async (req, res, next) => {
  try {
    const chat = await findOwnedChat(req.params.chatId, req.user.id);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });
    chat.pinned = !chat.pinned;
    await chat.save();
    res.status(200).json({ success: true, data: chat });
  } catch (error) {
    next(error);
  }
};

export const deleteChat = async (req, res, next) => {
  try {
    const chat = await AiChat.findOneAndDelete({ _id: req.params.chatId, userId: req.user.id });
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });
    res.status(200).json({ success: true, message: "Chat deleted." });
  } catch (error) {
    next(error);
  }
};

// ── Messaging (non-streaming) ─────────────────────────────────────────────────

export const sendMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Message content is required." });
    }

    const chat = await findOwnedChat(req.params.chatId, req.user.id);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });

    const history = chat.messages.map((m) => ({ role: m.role, content: m.content }));
    const systemInstruction = await getSystemInstruction(req.user);

    const reply = await generateText(content, systemInstruction, history);

    chat.messages.push({ role: "user", content });
    chat.messages.push({ role: "assistant", content: reply });
    if (chat.messages.length === 2) chat.title = deriveTitle(content);
    chat.lastMessageAt = new Date();
    await chat.save();

    res.status(200).json({ success: true, data: { reply, chat } });
  } catch (error) {
    next(error);
  }
};

// ── Messaging (Server-Sent Events streaming) ─────────────────────────────────

export const streamMessage = async (req, res, next) => {
  try {
    const { content } = req.body;
    if (!content || !content.trim()) {
      return res.status(400).json({ success: false, message: "Message content is required." });
    }

    const chat = await findOwnedChat(req.params.chatId, req.user.id);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });

    const history = chat.messages.map((m) => ({ role: m.role, content: m.content }));
    const systemInstruction = await getSystemInstruction(req.user);

    res.writeHead(200, {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    });

    let fullText = "";
    try {
      for await (const chunk of generateTextStream(content, systemInstruction, history)) {
        fullText += chunk;
        res.write(`data: ${JSON.stringify({ chunk })}\n\n`);
      }
    } catch (streamErr) {
      res.write(`data: ${JSON.stringify({ error: streamErr.message })}\n\n`);
    }

    const finalContent = fullText.trim() || "I'm here to help with any questions about your projects, hiring, and proposals!";
    chat.messages.push({ role: "user", content });
    chat.messages.push({ role: "assistant", content: finalContent });
    if (chat.messages.length === 2) chat.title = deriveTitle(content);
    chat.lastMessageAt = new Date();
    await chat.save();

    res.write(`data: ${JSON.stringify({ done: true, chatId: chat.id, title: chat.title })}\n\n`);
    res.end();
  } catch (error) {
    // Headers may already be sent for SSE — fall back to closing the stream.
    if (res.headersSent) {
      res.write(`data: ${JSON.stringify({ error: error.message })}\n\n`);
      res.end();
    } else {
      next(error);
    }
  }
};

// ── File upload — real text extraction, fed to Gemini as context ────────────

export const uploadChatFile = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "No file uploaded." });
    }

    const chat = await findOwnedChat(req.params.chatId, req.user.id);
    if (!chat) return res.status(404).json({ success: false, message: "Chat not found." });

    const extractedText = await extractTextFromFile(req.file.buffer || req.file.path, req.file.originalname, req.file.mimetype);
    const userQuestion = (req.body.question || "").trim() || `Analyze the uploaded file "${req.file.originalname}" and summarize the key points.`;

    const history = chat.messages.map((m) => ({ role: m.role, content: m.content }));
    const systemInstruction = await getSystemInstruction(req.user);
    const prompt = `${userQuestion}\n\n--- FILE CONTENT: ${req.file.originalname} ---\n${extractedText}\n--- END FILE CONTENT ---`;

    const reply = await generateText(prompt, systemInstruction, history);

    chat.messages.push({
      role: "user",
      content: `📎 Uploaded "${req.file.originalname}"\n${userQuestion}`,
      attachments: [{ filename: req.file.originalname, mimetype: req.file.mimetype, extractedText }],
    });
    chat.messages.push({ role: "assistant", content: reply });
    if (chat.messages.length === 2) chat.title = deriveTitle(`File: ${req.file.originalname}`);
    chat.lastMessageAt = new Date();
    await chat.save();

    // Clean up temp file if disk storage was used (memory storage has no path).
    if (req.file.path) fs.unlink(req.file.path).catch(() => {});

    res.status(200).json({ success: true, data: { reply, chat } });
  } catch (error) {
    next(error);
  }
};

// ── Suggested follow-up questions ────────────────────────────────────────────

export const suggestFollowups = async (req, res, next) => {
  try {
    const chat = await findOwnedChat(req.params.chatId, req.user.id);
    if (!chat || chat.messages.length === 0) {
      return res.status(200).json({ success: true, data: { questions: [] } });
    }

    const lastFew = chat.messages.slice(-4).map((m) => `${m.role.toUpperCase()}: ${m.content}`).join("\n\n");
    const prompt = `Based on this recent conversation, suggest exactly 3 short, natural follow-up questions the USER might want to ask next. Keep each under 8 words.\n\n${lastFew}\n\nRespond as JSON: {"questions": ["...", "...", "..."]}`;

    const systemInstruction = await getSystemInstruction(req.user);
    const result = await generateJSON(prompt, systemInstruction);
    const questions = Array.isArray(result.questions) ? result.questions.slice(0, 3) : [];

    res.status(200).json({ success: true, data: { questions } });
  } catch (error) {
    next(error);
  }
};
