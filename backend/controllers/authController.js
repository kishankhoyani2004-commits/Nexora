import jwt from "jsonwebtoken";
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

export const register = async (req, res, next) => {
  try {
    const { fullName, email, password, role } = req.body;
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
      provider: "local",
      verificationCode,
      verificationCodeExpires,
      verified: true, // Bypass verification in local environment
    });

    await sendVerificationEmail(email, fullName, verificationCode);

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("token", accessToken, getCookieOptions());

    res.status(201).json({
      success: true,
      message: "Registration successful.",
      token: accessToken,
      refreshToken,
      user,
    });
  } catch (error) {
    next(error);
  }
};

export const verifyEmail = async (req, res, next) => {
  try {
    const { email, code } = req.body;

    const user = await User.findOne({
      email,
      verificationCode: code,
      verificationCodeExpires: { $gt: new Date() },
    });

    if (!user) {
      return res.status(400).json({ success: false, message: "Invalid or expired verification code." });
    }

    user.verified = true;
    user.verificationCode = null;
    user.verificationCodeExpires = null;
    await user.save();

    // Generate tokens
    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.verified) {
      return res.status(400).json({ success: false, message: "Email is already verified." });
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
    const verificationCodeExpires = new Date(Date.now() + 24 * 60 * 60 * 1000);

    user.verificationCode = verificationCode;
    user.verificationCodeExpires = verificationCodeExpires;
    await user.save();

    await sendVerificationEmail(email, user.fullName, verificationCode);

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
    if (!user || user.provider !== "local") {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    // Check verification status
    if (!user.verified) {
      return res.status(403).json({
        success: false,
        message: "Email is not verified. Please verify your email first.",
        requiresVerification: true,
      });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ success: false, message: "Invalid email or password." });
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
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

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    user.resetOtp = otp;
    user.resetOtpExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 mins
    await user.save();

    await sendOtpEmail(email, otp);

    res.status(200).json({ success: true, message: "OTP sent to your email." });
  } catch (error) {
    next(error);
  }
};

export const resetPassword = async (req, res, next) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({
      email,
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
    const { email, uid, fullName, photoURL } = req.body;
    const normalizedEmail = email ? email.trim().toLowerCase() : "";

    let user = await User.findOne({ $or: [{ firebaseUid: uid }, { email: normalizedEmail }] });

    if (!user) {
      // Brand-new user — freelancer platform, so always assign freelancer role
      user = await User.create({
        firebaseUid: uid,
        email,
        fullName: fullName || "User",
        avatar: photoURL || "",
        provider: "firebase",
        verified: true,
        role: "freelancer",
      });
    } else {
      // Existing user — sync any missing fields
      let dirty = false;
      if (!user.firebaseUid) { user.firebaseUid = uid; dirty = true; }
      if (!user.avatar && photoURL) { user.avatar = photoURL; dirty = true; }
      if (!user.role) { user.role = "freelancer"; dirty = true; }
      if (dirty) await user.save();
    }

    const accessToken = generateAccessToken(user._id);
    const refreshToken = generateRefreshToken(user._id);

    user.refreshToken = refreshToken;
    await user.save();

    res.cookie("token", accessToken, getCookieOptions());

    res.status(200).json({
      success: true,
      token: accessToken,
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