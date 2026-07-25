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
    views:          { type: Number, default: 0 },

    // ── Client Panel additions ────────────────────────────────────────────────
    subcategory: { type: String, default: "" },
    visibility:  { type: String, enum: ["public", "private"], default: "public" },
    attachments: {
      type: [
        {
          filename: { type: String },
          url:      { type: String },
          mimetype: { type: String },
        },
      ],
      default: [],
    },

    // ── Module 2: Professional Post Job Settings ──────────────────────────────
    englishLevel: {
      type: String,
      enum: ["basic", "intermediate", "advanced", "fluent"],
      default: "intermediate",
    },
    freelancersNeeded: { type: Number, default: 1, min: 1 },
    currency: { type: String, default: "INR" },
    estimatedHours: { type: Number, default: 0 }, // for hourly jobs
    featured: { type: Boolean, default: false },
    urgent: { type: Boolean, default: false },
    allowAIMatching: { type: Boolean, default: true },
    allowMultipleProposals: { type: Boolean, default: true },
    proposalDeadline: { type: Date, default: null },
    projectStartDate: { type: Date, default: null },
    expectedCompletionDate: { type: Date, default: null },

    // ── AI-Ready fields (prepare, don't implement AI yet) ──────────────────────
    suggestedBudget: { type: Number, default: null },
    suggestedSkills: { type: [String], default: [] },
    suggestedDescription: { type: String, default: "" },
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
