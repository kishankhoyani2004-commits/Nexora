import jwt from "jsonwebtoken";
import crypto from "crypto";
import User from "../models/User.js";
import bcrypt from "bcrypt";
import generateToken, { generateAccessToken, generateRefreshToken } from "../utils/generateToken.js";
import { sendVerificationEmail, sendOtpEmail } from "../services/emailService.js";

// Helper to set cookie options
const getCookieOptions = () => {
  return {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  };
};

// Best-effort device label from the User-Agent header — good enough for a
// human-readable "Active Sessions" / "Login Activity" list, not a full UA parser.
const getDeviceLabel = (userAgent = "") => {
  if (!userAgent) return "Unknown device";
  const browser =
    /Edg\//.test(userAgent) ? "Edge" :
    /Chrome\//.test(userAgent) ? "Chrome" :
    /Firefox\//.test(userAgent) ? "Firefox" :
    /Safari\//.test(userAgent) ? "Safari" : "Browser";
  const os =
    /Windows/.test(userAgent) ? "Windows" :
    /Mac OS X/.test(userAgent) ? "macOS" :
    /Android/.test(userAgent) ? "Android" :
    /iPhone|iPad/.test(userAgent) ? "iOS" :
    /Linux/.test(userAgent) ? "Linux" : "Unknown OS";
  return `${browser} on ${os}`;
};

const getClientIp = (req) =>
  req.headers["x-forwarded-for"]?.split(",")[0]?.trim() || req.ip || req.socket?.remoteAddress || "";

// Records a login attempt + (on success) an active session, capping both
// arrays so they don't grow unbounded on a long-lived account.
const recordLoginActivity = async (user, req, status, reason = "") => {
  const userAgent = req.headers["user-agent"] || "";
  const ipAddress = getClientIp(req);
  const device = getDeviceLabel(userAgent);

  user.loginHistory = user.loginHistory || [];
  user.loginHistory.push({ timestamp: new Date(), ipAddress, device, status, reason });
  if (user.loginHistory.length > 50) {
    user.loginHistory = user.loginHistory.slice(-50);
  }

  if (status === "success") {
    user.sessions = user.sessions || [];
    user.sessions.push({
      sessionId: crypto.randomUUID(),
      device,
      ipAddress,
      userAgent,
      lastActive: new Date(),
      createdAt: new Date(),
    });
    if (user.sessions.length > 10) {
      user.sessions = user.sessions.slice(-10);
    }
  }
};

export const register = async (req, res, next) => {
  try {
    const { fullName, email, password, role, location } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours

    const user = await User.create({
      fullName,
      email,
      password: hashedPassword,
      role,
      location: location || "",
      provider: "local",
      verificationCode,
      verificationCodeExpires,
      verified: false,
    });

    await sendVerificationEmail(email, fullName, verificationCode);

    // No token is issued yet — the account must be verified via
    // /auth/verify-email before the user can sign in (see login()).
    res.status(201).json({
      success: true,
      message: "Registration successful. Please check your email for a 6-digit verification code.",
      requiresVerification: true,
      email: user.email,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    const user = await User.findOne({
      email: normalizedEmail,
      verificationCode: code,
      verificationCodeExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }

    user.verified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await recordLoginActivity(user, req, "success");
    await user.save();

    res.cookie("token", accessToken, getCookieOptions());

    res.status(200).json({
      success: true,
      message: "Email verified successfully. You are now logged in.",
      token: accessToken,
      refreshToken,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const resendVerificationCode = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    if (user.verified) {
      return res.status(400).json({ success: false, message: "Email is already verified." });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();

    await sendVerificationEmail(user.email, user.fullName, verificationCode);

    res.status(200).json({ success: true, message: "Verification code resent to your email." });
  } catch (error) {
    next(error);
  }
};

export const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid email address." });
    }

    if (user.provider !== "local") {
      const providerLabel = user.provider.charAt(0).toUpperCase() + user.provider.slice(1);
      return res.status(400).json({
        success: false,
        message: `This account uses ${providerLabel} sign-in. Please continue with that method instead.`,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      await recordLoginActivity(user, req, "failed", "Incorrect password");
      await user.save();
      return res.status(400).json({ success: false, message: "Incorrect password." });
    }

    // Check verification status (after credentials are confirmed correct)
    if (!user.verified) {
      return res.status(403).json({
        success: false,
        message: "Please verify your email address before logging in.",
        requiresVerification: true,
        email: user.email,
      });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await recordLoginActivity(user, req, "success");
    await user.save();

    res.cookie("token", accessToken, getCookieOptions());

    res.status(200).json({
      success: true,
      message: "Login successful.",
      token: accessToken,
      refreshToken,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const refreshToken = async (req, res, next) => {
  try {
    const { token: clientRefreshToken } = req.body;

    if (!clientRefreshToken) {
      return res.status(400).json({ success: false, message: "Refresh token is required." });
    }

    const user = await User.findOne({ refreshToken: clientRefreshToken });
    if (!user) {
      return res.status(401).json({ success: false, message: "Invalid refresh token." });
    }

    // Verify token
    try {
      jwt.verify(clientRefreshToken, process.env.JWT_SECRET || "nexora_secret_key");
    } catch (err) {
      return res.status(401).json({ success: false, message: "Expired or invalid refresh token." });
    }

    const accessToken = generateAccessToken(user._id);
    res.cookie("token", accessToken, getCookieOptions());

    res.status(200).json({
      success: true,
      token: accessToken,
    });
  } catch (error) {
    next(error);
  }
};

export const forgotPassword = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    const user = await User.findOne({ email: normalizedEmail });
    if (!user) {
      return res.status(404).json({ success: false, message: "No account found with this email." });
    }

    if (user.provider !== "local") {
      const providerLabel = user.provider.charAt(0).toUpperCase() + user.provider.slice(1);
      return res.status(400).json({
        success: false,
        message: `This account uses ${providerLabel} sign-in and has no password to reset.`,
      });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    await sendOtpEmail(user.email, otp);

    res.status(200).json({ success: true, message: "OTP sent to your email." });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    const user = await User.findOne({
      email: normalizedEmail,
      resetOtp: otp,
      resetOtpExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired OTP." });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.resetOtp = null;
    user.resetOtpExpires = null;
    await user.save();

    res.status(200).json({ success: true, message: "Password reset successful." });
  } catch (error) {
    next(error);
  }
};

// Self-service password change (requires knowing the current password) —
// distinct from forgotPassword/resetPassword, which is the OTP-based
// recovery path for a user who is NOT logged in.
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ success: false, message: "Current and new password are required." });
    }
    if (newPassword.length < 6) {
      return res.status(400).json({ success: false, message: "New password must be at least 6 characters long." });
    }

    const user = await User.findById(req.user.id);
    if (!user || user.provider !== "local") {
      return res.status(400).json({ success: false, message: "Password change is only available for email/password accounts." });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Current password is incorrect." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({ success: true, message: "Password changed successfully." });
  } catch (error) {
    next(error);
  }
};

// Self-service account deletion. Requires re-entering the current password
// as the confirmation step (a UI "are you sure?" modal alone is not a
// strong enough guard for a destructive, irreversible action).
export const deleteAccount = async (req, res, next) => {
  try {
    const { password } = req.body;
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.provider === "local") {
      if (!password) {
        return res.status(400).json({ success: false, message: "Password is required to delete your account." });
      }
      const isMatch = await bcrypt.compare(password, user.password);
      if (!isMatch) {
        return res.status(400).json({ success: false, message: "Password is incorrect." });
      }
    }

    await User.findByIdAndDelete(req.user.id);

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(200).json({ success: true, message: "Account deleted successfully." });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req, res, next) => {
  try {
    const { token: clientRefreshToken } = req.body;

    if (clientRefreshToken) {
      const user = await User.findOne({ refreshToken: clientRefreshToken });
      if (user) {
        user.refreshToken = null;
        await user.save();
      }
    }

    res.clearCookie("token", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    });

    res.status(200).json({ success: true, message: "Logged out successfully." });
  } catch (error) {
    next(error);
  }
};

export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const firebaseRegister = async (req, res, next) => {
  try {
    const { email, uid, fullName, role, photoURL } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email: normalizedEmail }] });
    if (user) {
      return res.status(400).json({ success: false, message: "Email already registered." });
    }

    user = await User.create({
      firebaseUid: uid,
      email,
      fullName: fullName || "User",
      role: role || "freelancer",
      avatar: photoURL || "",
      provider: "firebase",
      verified: true,
    });

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("token", accessToken, getCookieOptions());

    res.status(201).json({
      success: true,
      token: accessToken,
      refreshToken,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const firebaseLogin = async (req, res, next) => {
  try {
    const { email, uid, fullName, photoURL, role: requestedRole } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email: normalizedEmail }] });

    if (!user) {
      // Brand-new user — use the role passed from the frontend (defaults to "freelancer")
      user = await User.create({
        firebaseUid: uid,
        email,
        fullName:    fullName || "User",
        avatar:      photoURL || "",
        provider:    "firebase",
        verified:    true,
        role:        requestedRole || "freelancer",
      });
    } else {
      // Existing user — NEVER overwrite their stored role.
      // Only sync missing Firebase UID or avatar.
      let dirty = false;
      if (!user.firebaseUid)          { user.firebaseUid = uid;      dirty = true; }
      if (!user.avatar && photoURL)   { user.avatar      = photoURL; dirty = true; }
      // Role is intentionally NOT updated here — the user chose it at registration.
      if (dirty) await user.save();
    }

    const accessToken  = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("token", accessToken, getCookieOptions());

    res.status(200).json({
      success:      true,
      token:        accessToken,
      refreshToken,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const checkEmail = async (req, res, next) => {
  try {
    const { email } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";
    const user = await User.findOne({ email: normalizedEmail });
    res.status(200).json({ success: true, exists: !!user });
  } catch (error) {
    next(error);
  }
};

export const assignRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const userId = req.user._id || req.user.id;

    if (!["client", "freelancer"].includes(role)) {
      return res.status(400).json({ success: false, message: "Invalid role. Must be client or freelancer." });
    }

    const user = await User.findByIdAndUpdate(
      userId,
      { role },
      { new: true }
    );

    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};