import mongoose from "mongoose";

const jobSchema = new mongoose.Schema(
  {
    client: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    title: { type: String, required: true, trim: true },
    description: { type: String, required: true },
    category: { type: String, required: true, trim: true },
    budgetMin: { type: Number, required: true, min: 0 },
    budgetMax: { type: Number, required: true, min: 0 },
    priceType: { type: String, enum: ["fixed", "hourly"], default: "fixed" },
    experienceLevel: {
      type: String,
      enum: ["entry", "intermediate", "expert"],
      default: "intermediate",
    },
    skills: { type: [String], default: [] },
    duration: { type: String, default: "1-3 months" },
    // ── New fields ──────────────────────────────────────────────────────────
    location: { type: String, default: "Remote" },
    workType: {
      type: String,
      enum: ["remote", "hybrid", "onsite"],
      default: "remote",
    },
    deadline: { type: Date, default: null },
    clientRating: { type: Number, default: 0, min: 0, max: 5 },
    paymentVerified: { type: Boolean, default: false },
    // ─────────────────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ["draft", "open", "in_progress", "completed", "closed"],
      default: "open",
    },
    proposalsCount: { type: Number, default: 0 },
  },
  { timestamps: true }
);

// Text index for fast full-text search
jobSchema.index(
  { title: "text", description: "text", category: "text", skills: "text" },
  { weights: { title: 10, skills: 8, category: 5, description: 1 } }
);

jobSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const Job = mongoose.model("Job", jobSchema);
export default Job;
