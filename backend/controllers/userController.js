import User from "../models/User.js";
import { uploadFile } from "../services/cloudinaryService.js";

export const getUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).select("-password");
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }
    res.status(200).json({ success: true, user });
  } catch (error) {
    next(error);
  }
};

export const updateUserProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Authorization check
    if (req.user.id !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to update this profile." });
    }

    const { fullName, bio, skills, location, portfolio, socialLinks, title, hourlyRate, experience, education, certifications, languages } = req.body;

    if (fullName) user.fullName = fullName;
    if (bio !== undefined) user.bio = bio;
    if (skills) user.skills = skills;
    if (location !== undefined) user.location = location;
    if (title !== undefined) user.title = title;
    if (hourlyRate !== undefined) user.hourlyRate = Number(hourlyRate);
    if (portfolio) user.portfolio = portfolio;
    if (experience) user.experience = experience;
    if (education) user.education = education;
    if (certifications) user.certifications = certifications;
    if (languages) user.languages = languages;
    if (socialLinks) user.socialLinks = { ...user.socialLinks, ...socialLinks };

    await user.save();
    res.status(200).json({ success: true, message: "Profile updated successfully.", user });
  } catch (error) {
    next(error);
  }
};

export const uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ success: false, message: "Please upload an avatar image." });
    }

    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (req.user.id !== req.params.id && req.user.role !== "admin") {
      return res.status(403).json({ success: false, message: "Not authorized to edit this profile." });
    }

    const result = await uploadFile(req.file.path, "avatars");
    user.avatar = result.url;
    await user.save();

    res.status(200).json({ success: true, message: "Avatar uploaded successfully.", avatar: result.url });
  } catch (error) {
    next(error);
  }
};
