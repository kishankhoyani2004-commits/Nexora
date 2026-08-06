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
const FindTalent = lazy(() => import("@/pages/FindTalent"));
const FindWork = lazy(() => import("@/pages/FindWork"));
const Categories = lazy(() => import("@/pages/Categories"));
const Pricing = lazy(() => import("@/pages/Pricing"));

// Client pages
const ClientDashboard = lazy(() => import("@/pages/client/ClientDashboard"));
const ClientActivityFeed = lazy(() => import("@/pages/client/ClientActivityFeed"));
const ClientAnalytics = lazy(() => import("@/pages/client/ClientAnalytics"));
const ClientReports = lazy(() => import("@/pages/client/ClientReports"));
const ClientTeamPerformance = lazy(() => import("@/pages/client/ClientTeamPerformance"));
const ClientPayments  = lazy(() => import("@/pages/client/ClientPayments"));
const ClientPostJob   = lazy(() => import("@/pages/client/PostJob"));
const ClientMyJobs    = lazy(() => import("@/pages/client/MyJobs"));
const ClientApplications = lazy(() => import("@/pages/client/ClientApplications"));
const ClientShortlistedFreelancers = lazy(() => import("@/pages/client/ShortlistedFreelancers"));
const ClientMilestones = lazy(() => import("@/pages/client/ClientMilestones"));
const ClientContracts = lazy(() => import("@/pages/client/ClientContracts"));
const ClientProjectFiles = lazy(() => import("@/pages/client/ClientProjectFiles"));
const ClientActiveProjects = lazy(() => import("@/pages/client/ActiveProjects"));
const ClientCompletedProjects = lazy(() => import("@/pages/client/CompletedProjects"));
const ClientCompanyProfile = lazy(() => import("@/pages/client/ClientCompanyProfile"));
const ClientReviews = lazy(() => import("@/pages/client/ClientReviews"));
const ClientSavedFreelancers = lazy(() => import("@/pages/client/SavedFreelancers"));
const ClientSubmittedProjects = lazy(() => import("@/pages/client/SubmittedProjects"));
const ClientSettings = lazy(() => import("@/pages/client/ClientSettings"));

// Freelancer pages
const FreelancerDashboard = lazy(() => import("@/pages/freelancer/FreelancerDashboard"));
const FreelancerActivityFeed = lazy(() => import("@/pages/freelancer/FreelancerActivityFeed"));
const FreelancerInvitations = lazy(() => import("@/pages/freelancer/FreelancerInvitations"));
const FreelancerAnalytics = lazy(() => import("@/pages/freelancer/FreelancerAnalytics"));
const FreelancerEarnings = lazy(() => import("@/pages/freelancer/FreelancerEarnings"));
const FreelancerReviews = lazy(() => import("@/pages/freelancer/FreelancerReviews"));
const FreelancerActiveProjects = lazy(() => import("@/pages/freelancer/ActiveProjects"));
const FreelancerCompletedProjects = lazy(() => import("@/pages/freelancer/CompletedProjects"));
const FreelancerMilestones = lazy(() => import("@/pages/freelancer/Milestones"));
const FreelancerDeliverables = lazy(() => import("@/pages/freelancer/Deliverables"));
const FreelancerTimeTracking = lazy(() => import("@/pages/freelancer/TimeTracking"));

// Shared feature pages
const BrowseJobs = lazy(() => import("@/pages/jobs/BrowseJobs"));
const RecommendedJobs = lazy(() => import("@/pages/jobs/RecommendedJobs"));
const SavedJobs = lazy(() => import("@/pages/jobs/SavedJobs"));
const JobAlerts = lazy(() => import("@/pages/jobs/JobAlerts"));
const JobDetails = lazy(() => import("@/pages/jobs/JobDetails"));
const ProposalsList = lazy(() => import("@/pages/proposals/ProposalsList"));
const SubmitProposal = lazy(() => import("@/pages/proposals/SubmitProposal"));
const Messages = lazy(() => import("@/pages/messages/Messages"));
const Workspace = lazy(() => import("@/pages/workspace/Workspace"));
const FreelancerProfilePage = lazy(() => import("@/pages/profile/FreelancerProfilePage"));
const Settings = lazy(() => import("@/pages/settings/Settings"));
const SecuritySettings = lazy(() => import("@/pages/settings/SecuritySettings"));
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
        <Route path={ROUTES.FIND_TALENT} element={<FindTalent />} />
        <Route path={ROUTES.FIND_WORK} element={<FindWork />} />
        <Route path={ROUTES.CATEGORIES} element={<Categories />} />
        <Route path={ROUTES.PRICING} element={<Pricing />} />



        {/* ── Client ─────────────────────────────────────────────── */}
        <Route
          path={ROUTES.CLIENT_DASHBOARD}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientDashboard /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_ACTIVITY}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientActivityFeed /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_ANALYTICS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientAnalytics /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_REPORTS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientReports /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_TEAM_PERFORMANCE}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientTeamPerformance /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_PAYMENTS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientPayments /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_POST_JOB}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientPostJob /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_MY_JOBS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientMyJobs /></ProtectedRoute>}
        />
        {/* CLIENT_PROPOSALS is kept as an alias of CLIENT_APPLICATIONS for any
            existing links; both render the same consolidated Applications page. */}
        <Route
          path={ROUTES.CLIENT_PROPOSALS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientApplications /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_APPLICATIONS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientApplications /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_SHORTLISTED_FREELANCERS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientShortlistedFreelancers /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_ACTIVE_PROJECTS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientActiveProjects /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_COMPLETED_PROJECTS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientCompletedProjects /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_PROFILE}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientCompanyProfile /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_REVIEWS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientReviews /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_SAVED_FREELANCERS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientSavedFreelancers /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_SUBMITTED_PROJECTS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientSubmittedProjects /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_MILESTONES}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientMilestones /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_CONTRACTS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientContracts /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_PROJECT_FILES}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientProjectFiles /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.CLIENT_SETTINGS}
          element={<ProtectedRoute allowedRoles={["client"]}><ClientSettings /></ProtectedRoute>}
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
          path={ROUTES.FREELANCER_INVITATIONS}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><FreelancerInvitations /></ProtectedRoute>}
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
        <Route
          path={ROUTES.FREELANCER_ACTIVE_PROJECTS}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><FreelancerActiveProjects /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.FREELANCER_COMPLETED_PROJECTS}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><FreelancerCompletedProjects /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.FREELANCER_MILESTONES}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><FreelancerMilestones /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.FREELANCER_DELIVERABLES}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><FreelancerDeliverables /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.FREELANCER_TIME_TRACKING}
          element={<ProtectedRoute allowedRoles={["freelancer"]}><FreelancerTimeTracking /></ProtectedRoute>}
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
          element={<ProtectedRoute allowedRoles={["client"]}><ClientPostJob /></ProtectedRoute>}
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
          path={ROUTES.WORKSPACE_PROJECT}
          element={<ProtectedRoute allowedRoles={["client", "freelancer"]}><Workspace /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.PROFILE}
          element={<ProtectedRoute><FreelancerProfilePage /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.PROFILE_VIEW}
          element={<ProtectedRoute><FreelancerProfilePage /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.SETTINGS}
          element={<ProtectedRoute><Settings /></ProtectedRoute>}
        />
        <Route
          path={ROUTES.SETTINGS_SECURITY}
          element={<ProtectedRoute><SecuritySettings /></ProtectedRoute>}
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
