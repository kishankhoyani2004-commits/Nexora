import { apiClient } from "@/lib/axios";

export const settingsService = {
  // Get all settings
  getSettings: async () => {
    const res = await apiClient.get("/settings");
    return res.data;
  },

  // Update notification preferences
  updateNotifications: async (preferences: {
    emailNotifications?: boolean;
    pushNotifications?: boolean;
    emailDigest?: "daily" | "weekly" | "monthly" | "never";
    jobAlerts?: boolean;
    proposalUpdates?: boolean;
    projectUpdates?: boolean;
    paymentUpdates?: boolean;
    messageNotifications?: boolean;
    reviewNotifications?: boolean;
  }) => {
    const res = await apiClient.patch("/settings/notifications", preferences);
    return res.data;
  },

  // Update privacy settings
  updatePrivacy: async (settings: {
    profileVisibility?: "public" | "private" | "connections";
    showEmail?: boolean;
    showPhone?: boolean;
    allowMessages?: boolean;
    allowInvitations?: boolean;
    showActivityStatus?: boolean;
  }) => {
    const res = await apiClient.patch("/settings/privacy", settings);
    return res.data;
  },

  // Update theme / language preferences
  updatePreferences: async (preferences: { theme?: "light" | "dark" | "system"; language?: string }) => {
    const res = await apiClient.patch("/settings/preferences", preferences);
    return res.data;
  },

  // Change password
  changePassword: async (currentPassword: string, newPassword: string) => {
    const res = await apiClient.post("/settings/change-password", {
      currentPassword,
      newPassword,
    });
    return res.data;
  },

  // Get login activity
  getLoginActivity: async () => {
    const res = await apiClient.get("/settings/login-activity");
    return res.data;
  },

  // Get active sessions
  getActiveSessions: async () => {
    const res = await apiClient.get("/settings/sessions");
    return res.data;
  },

  // Logout from specific session
  logoutSession: async (sessionId: string) => {
    const res = await apiClient.post("/settings/sessions/logout", { sessionId });
    return res.data;
  },

  // Logout from all devices
  logoutAllDevices: async () => {
    const res = await apiClient.post("/settings/sessions/logout-all");
    return res.data;
  },

  // Connect OAuth account
  connectOAuth: async (provider: "google" | "github", accountId: string) => {
    const res = await apiClient.post("/settings/oauth/connect", {
      provider,
      accountId,
    });
    return res.data;
  },

  // Disconnect OAuth account
  disconnectOAuth: async (provider: "google" | "github") => {
    const res = await apiClient.post("/settings/oauth/disconnect", { provider });
    return res.data;
  },

  // Schedule account deletion
  scheduleAccountDeletion: async (password: string) => {
    const res = await apiClient.post("/settings/account/schedule-deletion", { password });
    return res.data;
  },

  // Cancel account deletion
  cancelAccountDeletion: async () => {
    const res = await apiClient.post("/settings/account/cancel-deletion");
    return res.data;
  },

  // Submit feedback / contact-support / bug-report
  submitFeedback: async (type: "contact" | "bug" | "feedback", subject: string, message: string, email?: string) => {
    const res = await apiClient.post("/settings/feedback", { type, subject, message, email });
    return res.data;
  },

  // Get support tickets
  getSupportTickets: async () => {
    const res = await apiClient.get("/settings/tickets");
    return res.data;
  },
};
