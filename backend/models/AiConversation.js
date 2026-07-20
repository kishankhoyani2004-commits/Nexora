import mongoose from "mongoose";

const aiConversationSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    channel: {
      type: String,
      required: true,
    },
    messages: [
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
        createdAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
  },
  { timestamps: true }
);

// Ensure a user has only one conversation document per channel
aiConversationSchema.index({ userId: 1, channel: 1 }, { unique: true });

const AiConversation = mongoose.model("AiConversation", aiConversationSchema);

export default AiConversation;
