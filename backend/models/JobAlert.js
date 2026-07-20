import mongoose from "mongoose";

const jobAlertSchema = new mongoose.Schema(
  {
    freelancer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    name: { type: String, required: true, trim: true },
    keywords: { type: [String], default: [] },
    skills:   { type: [String], default: [] },
    category: { type: String, default: "" },
    budgetMin: { type: Number, default: 0 },
    budgetMax: { type: Number, default: 0 },
    experienceLevel: {
      type: String,
      enum: ["", "entry", "intermediate", "expert"],
      default: "",
    },
    priceType: {
      type: String,
      enum: ["", "fixed", "hourly"],
      default: "",
    },
    location: { type: String, default: "" },
    workType: {
      type: String,
      enum: ["", "remote", "hybrid", "onsite"],
      default: "",
    },
    frequency: {
      type: String,
      enum: ["instant", "daily", "weekly"],
      default: "daily",
    },
    notifyEmail:  { type: Boolean, default: true },
    notifyInApp:  { type: Boolean, default: true },
    active: { type: Boolean, default: true },
    lastTriggeredAt: { type: Date, default: null },
  },
  { timestamps: true }
);

jobAlertSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
  },
});

const JobAlert = mongoose.model("JobAlert", jobAlertSchema);
export default JobAlert;
