import User from "../models/User.js";
import SupportTicket from "../models/SupportTicket.js";
import bcrypt from "bcrypt";

// Get user settings
export const getSettings = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    res.status(200).json({
      success: true,
      data: {
        notificationPreferences: user.notificationPreferences || {},
        privacySettings: user.privacySettings || {},
        connectedAccounts: user.connectedAccounts || {},
        twoFactorEnabled: user.twoFactorEnabled || false,
        preferences: user.preferences || { theme: "system", language: "en" },
        accountDeletionScheduled: user.accountDeletionScheduled || { scheduled: false, scheduledFor: null },
      },
    });
  } catch (error) {
    next(error);
  }
};

// Update theme / language preferences
export const updatePreferences = async (req, res, next) => {
  try {
    const { theme, language } = req.body;

    if (theme && !["light", "dark", "system"].includes(theme)) {
      return res.status(400).json({ success: false, message: "Invalid theme value." });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (theme) user.preferences.theme = theme;
    if (language) user.preferences.language = language;
    await user.save();

    res.status(200).json({
      success: true,
      message: "Preferences updated.",
      data: user.preferences,
    });
  } catch (error) {
    next(error);
  }
};

// Update notification preferences
export const updateNotificationPreferences = async (req, res, next) => {
  try {
    const { emailNotifications, pushNotifications, emailDigest, jobAlerts, proposalUpdates, projectUpdates, paymentUpdates, messageNotifications, reviewNotifications } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        notificationPreferences: {
          emailNotifications: emailNotifications ?? true,
          pushNotifications: pushNotifications ?? false,
          emailDigest: emailDigest ?? "weekly",
          jobAlerts: jobAlerts ?? true,
          proposalUpdates: proposalUpdates ?? true,
          projectUpdates: projectUpdates ?? true,
          paymentUpdates: paymentUpdates ?? true,
          messageNotifications: messageNotifications ?? true,
          reviewNotifications: reviewNotifications ?? true,
        },
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Notification preferences updated.",
      data: user.notificationPreferences,
    });
  } catch (error) {
    next(error);
  }
};

// Update privacy settings
export const updatePrivacySettings = async (req, res, next) => {
  try {
    const { profileVisibility, showEmail, showPhone, allowMessages, allowInvitations, showActivityStatus } = req.body;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        privacySettings: {
          profileVisibility: profileVisibility ?? "public",
          showEmail: showEmail ?? false,
          showPhone: showPhone ?? false,
          allowMessages: allowMessages ?? true,
          allowInvitations: allowInvitations ?? true,
          showActivityStatus: showActivityStatus ?? true,
        },
      },
      { new: true, runValidators: true }
    );

    res.status(200).json({
      success: true,
      message: "Privacy settings updated.",
      data: user.privacySettings,
    });
  } catch (error) {
    next(error);
  }
};

// Change password
export const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: "Current and new password are required.",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters long.",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    if (user.provider !== "local") {
      return res.status(400).json({
        success: false,
        message: "Password change is only available for email/password accounts.",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect.",
      });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    res.status(200).json({
      success: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    next(error);
  }
};

// Get login activity
export const getLoginActivity = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const loginHistory = (user.loginHistory || []).slice(-50).reverse();

    res.status(200).json({
      success: true,
      data: loginHistory,
    });
  } catch (error) {
    next(error);
  }
};

// Get active sessions
export const getActiveSessions = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const sessions = (user.sessions || []).map((s) => ({
      sessionId: s.sessionId,
      device: s.device,
      ipAddress: s.ipAddress,
      lastActive: s.lastActive,
      createdAt: s.createdAt,
    }));

    res.status(200).json({
      success: true,
      data: sessions,
    });
  } catch (error) {
    next(error);
  }
};

// Logout from specific session
export const logoutSession = async (req, res, next) => {
  try {
    const { sessionId } = req.body;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Session ID is required.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        $pull: { sessions: { sessionId } },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Session terminated.",
    });
  } catch (error) {
    next(error);
  }
};

// Logout from all devices
export const logoutAllDevices = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        sessions: [],
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Logged out from all devices.",
    });
  } catch (error) {
    next(error);
  }
};

// Connect OAuth account (Google/GitHub)
export const connectOAuthAccount = async (req, res, next) => {
  try {
    const { provider, accountId } = req.body;

    if (!provider || !accountId) {
      return res.status(400).json({
        success: false,
        message: "Provider and account ID are required.",
      });
    }

    if (!["google", "github"].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider. Must be 'google' or 'github'.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        [`connectedAccounts.${provider}`]: accountId,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account connected.`,
      data: user.connectedAccounts,
    });
  } catch (error) {
    next(error);
  }
};

// Disconnect OAuth account
export const disconnectOAuthAccount = async (req, res, next) => {
  try {
    const { provider } = req.body;

    if (!provider || !["google", "github"].includes(provider)) {
      return res.status(400).json({
        success: false,
        message: "Invalid provider.",
      });
    }

    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        [`connectedAccounts.${provider}`]: null,
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: `${provider.charAt(0).toUpperCase() + provider.slice(1)} account disconnected.`,
      data: user.connectedAccounts,
    });
  } catch (error) {
    next(error);
  }
};

// Schedule account deletion
export const scheduleAccountDeletion = async (req, res, next) => {
  try {
    const { password } = req.body;

    if (!password) {
      return res.status(400).json({
        success: false,
        message: "Password is required for account deletion.",
      });
    }

    const user = await User.findById(req.user.id);
    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Password is incorrect.",
      });
    }

    // Schedule deletion for 30 days from now
    const deletionDate = new Date();
    deletionDate.setDate(deletionDate.getDate() + 30);

    user.accountDeletionScheduled = {
      scheduled: true,
      scheduledFor: deletionDate,
    };
    await user.save();

    res.status(200).json({
      success: true,
      message: `Your account will be permanently deleted on ${deletionDate.toLocaleDateString()}.`,
      scheduledFor: deletionDate,
    });
  } catch (error) {
    next(error);
  }
};

// Cancel account deletion
export const cancelAccountDeletion = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.user.id,
      {
        accountDeletionScheduled: {
          scheduled: false,
          scheduledFor: null,
        },
      },
      { new: true }
    );

    res.status(200).json({
      success: true,
      message: "Account deletion cancelled.",
    });
  } catch (error) {
    next(error);
  }
};

// Submit feedback / contact-support / bug-report — all persisted as a
// SupportTicket, distinguished by `type` so the Help Center's three forms
// (Contact Support, Report a Problem, Feedback) share one backend record.
export const submitFeedback = async (req, res, next) => {
  try {
    const { type, subject, message, email } = req.body;

    if (!subject || !message) {
      return res.status(400).json({
        success: false,
        message: "Subject and message are required.",
      });
    }

    const ticket = await SupportTicket.create({
      user: req.user.id,
      type: ["contact", "bug", "feedback"].includes(type) ? type : "contact",
      subject,
      message,
      email: email || req.user.email || "",
    });

    res.status(201).json({
      success: true,
      message: "Thank you — we'll review it shortly.",
      ticketId: ticket.id,
      data: ticket,
    });
  } catch (error) {
    next(error);
  }
};

// Get the current user's own support tickets
export const getSupportTickets = async (req, res, next) => {
  try {
    const tickets = await SupportTicket.find({ user: req.user.id }).sort({ createdAt: -1 });
    res.status(200).json({
      success: true,
      data: tickets,
    });
  } catch (error) {
    next(error);
  }
};
