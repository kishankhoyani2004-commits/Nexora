import mongoose from "mongoose";

// Real multi-conversation chat storage for the AI Assistant — replaces the
// old fixed "#channel" single-thread model with proper ChatGPT-style chats:
// each document is one named conversation a user can rename, delete, and
// search across, with full message history for Gemini context memory.
const aiChatMessageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    content: {
      type: String,
      required: true,
    },
    attachments: {
      type: [
        {
          filename: { type: String },
          mimetype: { type: String },
          // Extracted text content (PDF/DOCX/TXT) fed to Gemini as context —
          // stored so the same attachment doesn't need re-parsing on reload.
          extractedText: { type: String, default: "" },
        },
      ],
      default: [],
    },
  },
  { timestamps: true }
);

const aiChatSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    title: {
      type: String,
      default: "New Chat",
      trim: true,
    },
    // Tags which module/page originated this chat (dashboard, post-job,
    // proposal, workspace, general...) — purely informational, does not
    // gate which endpoints can write to it.
    context: {
      type: String,
      default: "general",
    },
    pinned: {
      type: Boolean,
      default: false,
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
      index: true,
    },
    messages: {
      type: [aiChatMessageSchema],
      default: [],
    },
  },
  { timestamps: true }
);

// Full-text search across chat titles and message content for "Search Chat History".
aiChatSchema.index({ title: "text", "messages.content": "text" });

aiChatSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const AiChat = mongoose.model("AiChat", aiChatSchema);
export default AiChat;
