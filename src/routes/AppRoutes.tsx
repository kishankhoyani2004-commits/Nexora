import { Suspense, lazy } from "react";
import { Routes, Route } from "react-router-dom";
import { ProtectedRoute } from "@/routes/ProtectedRoute";
import { ROUTES } from "@/constants/routes";
import { Skeleton } from "@/components/ui/LoadingSkeleton";

// Auth
const Landing = lazy(() => import("@/pages/Landing"));
const Login = lazy(() => import("@/pages/auth/Login"));
const Signup = lazy(() => import("@/pages/auth/Signup"));
const ForgotPassword = lazy(() => import("@/pages/auth/ForgotPassword"));

// Client pages
const ClientDashboard = lazy(() => import("@/pages/client/ClientDashboard"));
const ClientAnalytics = lazy(() => import("@/pages/client/ClientAnalytics"));
const ClientPayments = lazy(() => import("@/pages/client/ClientPayments"));

// Freelancer pages
const FreelancerDashboard = lazy(() => import("@/pages/freelancer/FreelancerDashboard"));
const FreelancerActivityFeed = lazy(() => import("@/pages/freelancer/FreelancerActivityFeed"));
const FreelancerAnalytics = lazy(() => import("@/pages/freelancer/FreelancerAnalytics"));
const FreelancerEarnings = lazy(() => import("@/pages/freelancer/FreelancerEarnings"));
const FreelancerReviews = lazy(() => import("@/pages/freelancer/FreelancerReviews"));

// Shared feature pages
const BrowseJobs = lazy(() => import("@/pages/jobs/BrowseJobs"));
const RecommendedJobs = lazy(() => import("@/pages/jobs/RecommendedJobs"));
const SavedJobs = lazy(() => import("@/pages/jobs/SavedJobs"));
const JobAlerts = lazy(() => import("@/pages/jobs/JobAlerts"));
const JobDetails = lazy(() => import("@/pages/jobs/JobDetails"));
const PostJob = lazy(() => import("@/pages/jobs/PostJob"));
const ProposalsList = lazy(() => import("@/pages/proposals/ProposalsList"));
const SubmitProposal = lazy(() => import("@/pages/proposals/SubmitProposal"));
const Messages = lazy(() => import("@/pages/messages/Messages"));
const Workspace = lazy(() => import("@/pages/workspace/Workspace"));
const FreelancerProfilePage = lazy(() => import("@/pages/profile/FreelancerProfilePage"));
const Settings = lazy(() => import("@/pages/settings/Settings"));
const Notifications = lazy(() => import("@/pages/notifications/Notifications"));
const HelpCenter = lazy(() => import("@/pages/help/HelpCenter"));
const AiAssistant = lazy(() => import("@/pages/ai-assistant/AiAssistant"));

// Admin pages
const AdminDashboard = lazy(() => import("@/pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("@/pages/admin/AdminUsers"));
const AdminReports = lazy(() => import("@/pages/admin/AdminReports"));
const AdminAnalytics = lazy(() => import("@/pages/admin/AdminAnalytics"));
const AdminSystemHealth = lazy(() => import("@/pages/admin/AdminSystemHealth"));
const AdminAIUsage = lazy(() => import("@/pages/admin/AdminAIUsage"));

const NotFound = lazy(() => import("@/pages/NotFound"));

function PageFallback() {
  return (
    <div className="flex h-screen items-center justify-center bg-surface-app">
      <Skeleton className="h-12 w-12 rounded-full" />
    </div>
  );
}



export function AppRoutes() {
  return (
    <Suspense fallback={<PageFallback />}>
      <Routes>
        {/* ── Public ─────────────────────────────────────────────── */}
        <Route path={ROUTES.HOME} element={<Landing />} />
        <Route path={ROUTES.LOGIN} element={<Login />} />
        <Route path={ROUTES.SIGNUP} element={<Signup />} />
        <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPassword />} />



        {/* ── Client ─────────────────────────────────────────────── */}
        <Route
          path={ROUTES.CLIENT_DASHBOARD}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientDashboard /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_ANALYTICS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientAnalytics /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_PAYMENTS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientPayments /></ProtectedRoute>}
        />

        {/* ── Freelancer ──────────────────────────────────────────── */}
        <Route
          path={ROUTES.FREELANCER_DASHBOARD}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><FreelancerDashboard /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.FREELANCER_ACTIVITY}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><FreelancerActivityFeed /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.FREELANCER_ANALYTICS}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><FreelancerAnalytics /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.FREELANCER_EARNINGS}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><FreelancerEarnings /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.FREELANCER_REVIEWS}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><FreelancerReviews /></ProtectedRoute>}
        />

        {/* ── Jobs / Find Work ─────────────────────────────────────── */}
        <Route
          path={ROUTES.JOBS}
          element={<ProtectedRoute allowedRoles={["client", "freelancer"]}><BrowseJobs /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.RECOMMENDED_JOBS}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><RecommendedJobs /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.SAVED_JOBS}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><SavedJobs /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.JOB_ALERTS}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><JobAlerts /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.JOB_DETAILS}
          element={<ProtectedRoute allowedRoles={["client", "freelancer"]}><JobDetails /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.POST_JOB}
          element={<ProtectedRoute allowedRoles={["client"]}><PostJob /></ProtectedRoute>}
        />

        {/* ── Proposals ───────────────────────────────────────────── */}
        <Route
          path={ROUTES.PROPOSALS}
          element={<ProtectedRoute allowedRoles={["client", "freelancer"]}><ProposalsList /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.SUBMIT_PROPOSAL}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><SubmitProposal /></ProtectedRoute>}
        />

        {/* ── Shared Authenticated ─────────────────────────────────── */}
        <Route
          path={ROUTES.MESSAGES}
          element={<ProtectedRoute><Messages /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.WORKSPACE}
          element={<ProtectedRoute allowedRoles={["client", "freelancer"]}><Workspace /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.PROFILE}
          element={<ProtectedRoute><FreelancerProfilePage /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.SETTINGS}
          element={<ProtectedRoute><Settings /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.NOTIFICATIONS}
          element={<ProtectedRoute><Notifications /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.HELP}
          element={<ProtectedRoute><HelpCenter /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.AI_ASSISTANT}
          element={<ProtectedRoute allowedRoles={["client", "freelancer"]}><AiAssistant /></ProtectedRoute>}
        />

        {/* ── Admin ───────────────────────────────────────────────── */}
        <Route
          path={ROUTES.ADMIN_DASHBOARD}
          element={<ProtectedRoute allowedRoles={["admin"]}><AdminDashboard /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.ADMIN_USERS}
          element={<ProtectedRoute allowedRoles={["admin"]}><AdminUsers /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.ADMIN_REPORTS}
          element={<ProtectedRoute allowedRoles={["admin"]}><AdminReports /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.ADMIN_ANALYTICS}
          element={<ProtectedRoute allowedRoles={["admin"]}><AdminAnalytics /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.ADMIN_SYSTEM_HEALTH}
          element={<ProtectedRoute allowedRoles={["admin"]}><AdminSystemHealth /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.ADMIN_AI_USAGE}
          element={<ProtectedRoute allowedRoles={["admin"]}><AdminAIUsage /></ProtectedRoute>}
        />

        <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
      </Routes>
    </Suspense>
  );
}
