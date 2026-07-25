import mongoose from "mongoose";

const userSchema = new mongoose.Schema(
  {
    fullName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: function () {
        return this.provider === "local";
      },
    },
    role: {
      type: String,
      enum: ["client", "freelancer", "admin"],
      default: "freelancer",
    },
    avatar: {
      type: String,
      default: "",
    },
    bio: {
      type: String,
      default: "",
    },
    skills: {
      type: [String],
      default: [],
    },
    location: {
      type: String,
      default: "",
    },
    title: {
      type: String,
      default: "",
    },
    hourlyRate: {
      type: Number,
      default: 0,
    },
    portfolio: [
      {
        title: String,
        description: String,
        url: String,
        imageUrl: String,
      },
    ],
    experience: [
      {
        role: String,
        company: String,
        period: String,
        description: String,
      },
    ],
    education: [
      {
        degree: String,
        institution: String,
        period: String,
      },
    ],
    certifications: [
      {
        name: String,
        issuedDate: String,
      },
    ],
    languages: [
      {
        name: String,
        level: String,
      },
    ],
    socialLinks: {
      github: { type: String, default: "" },
      linkedin: { type: String, default: "" },
      twitter: { type: String, default: "" }, // used as "X" for company profiles
      facebook: { type: String, default: "" },
      instagram: { type: String, default: "" },
      website: { type: String, default: "" },
    },

    // ── Client Company Profile fields ──────────────────────────────────────
    companyName: { type: String, default: "" },
    ownerName: { type: String, default: "" },
    phone: { type: String, default: "" },
    website: { type: String, default: "" },
    industry: { type: String, default: "" },
    companySize: { type: String, default: "" },
    country: { type: String, default: "" },
    state: { type: String, default: "" },
    city: { type: String, default: "" },
    address: { type: String, default: "" },
    gstId: { type: String, default: "" },
    verified: {
      type: Boolean,
      default: false,
    },
    verificationCode: {
      type: String,
      default: null,
    },
    verificationCodeExpires: {
      type: Date,
      default: null,
    },
    provider: {
      type: String,
      enum: ["local", "google", "github", "firebase"],
      default: "local",
    },
    googleId: {
      type: String,
      default: null,
    },
    githubId: {
      type: String,
      default: null,
    },
    firebaseUid: {
      type: String,
      default: null,
    },
    githubUsername: {
      type: String,
      default: null,
    },
    refreshToken: {
      type: String,
      default: null,
    },
    resetOtp: {
      type: String,
      default: null,
    },
    resetOtpExpires: {
      type: Date,
      default: null,
    },
    // Updated on socket disconnect — "online" itself is derived live from
    // the in-memory socket registry, this is only the offline fallback.
    lastSeen: {
      type: Date,
      default: null,
    },
    // Recomputed whenever a Review referencing this user (as reviewee) is
    // created/edited/deleted — see backend/services/reviewService.js. Kept
    // denormalized on the user doc so profile pages can read it directly
    // without an aggregation query on every view.
    rating: {
      type: Number,
      default: 0,
    },
    reviewCount: {
      type: Number,
      default: 0,
    },
    // Freelancer-only: self-reported availability shown on profile cards
    // (e.g. Saved Freelancers). Defaults to available for existing users.
    availability: {
      type: String,
      enum: ["available", "busy", "unavailable"],
      default: "available",
    },
    // ── Settings & Security ────────────────────────────────────────────────
    notificationPreferences: {
      emailNotifications: { type: Boolean, default: true },
      pushNotifications: { type: Boolean, default: false },
      emailDigest: { type: String, enum: ["daily", "weekly", "monthly", "never"], default: "weekly" },
      jobAlerts: { type: Boolean, default: true },
      proposalUpdates: { type: Boolean, default: true },
      projectUpdates: { type: Boolean, default: true },
      paymentUpdates: { type: Boolean, default: true },
      messageNotifications: { type: Boolean, default: true },
      reviewNotifications: { type: Boolean, default: true },
    },
    privacySettings: {
      profileVisibility: { type: String, enum: ["public", "private", "connections"], default: "public" },
      showEmail: { type: Boolean, default: false },
      showPhone: { type: Boolean, default: false },
      allowMessages: { type: Boolean, default: true },
      allowInvitations: { type: Boolean, default: true },
      showActivityStatus: { type: Boolean, default: true },
    },
    sessions: [
      {
        sessionId: { type: String, required: true, unique: true },
        device: { type: String, default: "Unknown" },
        ipAddress: { type: String, default: "" },
        userAgent: { type: String, default: "" },
        lastActive: { type: Date, default: Date.now },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    loginHistory: [
      {
        timestamp: { type: Date, default: Date.now },
        ipAddress: { type: String, default: "" },
        device: { type: String, default: "Unknown" },
        status: { type: String, enum: ["success", "failed"], default: "success" },
        reason: { type: String, default: "" },
      },
    ],
    twoFactorEnabled: {
      type: Boolean,
      default: false,
    },
    twoFactorSecret: {
      type: String,
      default: null,
    },
    connectedAccounts: {
      google: { type: String, default: null },
      github: { type: String, default: null },
    },
    accountDeletionScheduled: {
      scheduled: { type: Boolean, default: false },
      scheduledFor: { type: Date, default: null },
    },
    preferences: {
      theme: { type: String, enum: ["light", "dark", "system"], default: "system" },
      language: { type: String, default: "en" },
    },
  },
  {
    timestamps: true,
  }
);

// Virtual for ID mapping to ease frontend integrations
userSchema.set("toJSON", {
  virtuals: true,
  transform: (doc, ret) => {
    ret.id = ret._id.toString();
    delete ret._id;
    delete ret.__v;
    delete ret.password; // Do not return password hash
  },
});

const User = mongoose.model("User", userSchema);
export default User;