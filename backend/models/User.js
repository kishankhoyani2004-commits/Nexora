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
      twitter: { type: String, default: "" },
      website: { type: String, default: "" },
    },
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