export const ROUTES = {
  HOME: "/",
  LOGIN: "/login",
  SIGNUP: "/signup",
  FORGOT_PASSWORD: "/forgot-password",
  ROLE_SELECT: "/role-select",

  CLIENT_DASHBOARD: "/client/dashboard",
  CLIENT_ANALYTICS: "/client/analytics",
  CLIENT_PAYMENTS: "/client/payments",

  FREELANCER_DASHBOARD: "/freelancer/dashboard",
  FREELANCER_ACTIVITY: "/freelancer/activity",
  FREELANCER_ANALYTICS: "/freelancer/analytics",
  FREELANCER_EARNINGS: "/freelancer/earnings",
  FREELANCER_REVIEWS: "/freelancer/reviews",

  JOBS: "/jobs",
  JOB_DETAILS: "/jobs/:id",
  POST_JOB: "/post-job",
  RECOMMENDED_JOBS: "/jobs/recommended",
  SAVED_JOBS: "/jobs/saved",
  JOB_ALERTS: "/jobs/alerts",

  PROPOSALS: "/proposals",
  SUBMIT_PROPOSAL: "/jobs/:id/proposal",

  MESSAGES: "/messages",
  WORKSPACE: "/workspace",
  PROFILE: "/profile",
  SETTINGS: "/settings",
  NOTIFICATIONS: "/notifications",
  HELP: "/help",

  ADMIN_DASHBOARD: "/admin/dashboard",
  ADMIN_USERS: "/admin/users",
  ADMIN_REPORTS: "/admin/reports",
  ADMIN_ANALYTICS: "/admin/analytics",
  ADMIN_SYSTEM_HEALTH: "/admin/system-health",
  ADMIN_AI_USAGE: "/admin/ai-usage",

  AI_ASSISTANT: "/ai-assistant",

  NOT_FOUND: "*",
} as const;

