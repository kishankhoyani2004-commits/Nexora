import { useNavigate } from "react-router-dom";
import type { LucideIcon } from "lucide-react";
import {
  Briefcase, FileText, Rocket, Wallet, Sparkles,
  PlusCircle, Eye, Layers, CheckCircle2, Clock,
  BarChart2, Bell, Loader2, ArrowRight, FolderKanban,
  Activity, MessageSquare, Star,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CLIENT_NAV } from "@/constants/nav";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/constants/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { clientDashboardService } from "@/services/dashboard.service";
import { jobService } from "@/services/job.service";
import { proposalService } from "@/services/proposal.service";
import { contractService } from "@/services/contract.service";
import { useNotification } from "@/context/NotificationContext";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { getTimeBasedGreeting, getPortalTagline } from "@/utils/greeting";
import type { JobStatus, Proposal } from "@/types";

// ── Status badge helpers ──────────────────────────────────────────────────────
const STATUS_TONE: Record<JobStatus, "neutral" | "warning" | "success" | "brand" | "info" | "danger"> = {
  draft:       "neutral",
  open:        "success",
  in_progress: "brand",
  completed:   "info",
  closed:      "danger",
};
const STATUS_LABEL: Record<JobStatus, string> = {
  draft: "Draft", open: "Open", in_progress: "In Progress",
  completed: "Completed", closed: "Closed",
};

// ── Activity timeline icon per event type (keyed by string for forward-compat) ──
const ACTIVITY_ICON: Record<string, LucideIcon> = {
  job_posted:         Briefcase,
  proposal_submitted: FileText,
  proposal_accepted:  CheckCircle2,
  proposal_rejected:  FileText,
  contract_started:   Rocket,
  contract_completed: CheckCircle2,
  payment_received:   Wallet,
  message_received:   MessageSquare,
  review_received:    Star,
  notification:       Bell,
};

export default function ClientDashboard() {
  const { user }   = useAuth();
  const navigate   = useNavigate();
  const clientId   = user?.id || user?._id;

  // ── 1. Client dashboard KPI stats from real backend ──────────────────────
  const { data: statsRes, isLoading: isLoadingStats } = useQuery({
    queryKey: ["clientDashboardStats"],
    queryFn:  async () => {
      const res = await clientDashboardService.getClientStats();
      return res.data.data;
    },
  });

  // ── 2. Client's recent jobs for "Recently Posted" section ────────────────
  const { data: jobsRes, isLoading: isLoadingJobs } = useQuery({
    queryKey: ["clientJobs", clientId, "recent"],
    queryFn:  async () => {
      const res = await jobService.list({ client: clientId, limit: 5, sortBy: "newest" });
      return res.data.data?.items ?? [];
    },
    enabled: !!clientId,
  });

  // ── 3. Client activity timeline (reuses /dashboard/client/activity) ───────
  const { data: activityRes, isLoading: isLoadingActivity } = useQuery({
    queryKey: ["clientActivity", clientId],
    queryFn:  async () => {
      const res = await clientDashboardService.getClientActivity({ limit: 6 });
      return res.data.data?.items ?? [];
    },
    enabled: !!clientId,
  });

  const stats          = statsRes;
  const recentJobs     = jobsRes ?? [];
  const recentActivity = activityRes ?? [];

  const { notify } = useNotification();
  const queryClient = useQueryClient();

  // ── 4. Client's received applications/proposals ────────────────────────────
  const { data: proposalsRes, isLoading: isLoadingProposals } = useQuery({
    queryKey: ["proposals", "received", clientId],
    queryFn: async () => {
      const res = await proposalService.listReceived();
      return res.data.data as Proposal[];
    },
    enabled: !!clientId,
  });

  const allProposals = proposalsRes ?? [];
  const pendingApplications = allProposals.filter(
    (p) => p.status === "submitted" || p.status === "shortlisted"
  );

  const acceptMutation = useMutation({
    mutationFn: (proposalId: string) => contractService.create(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals", "received"] });
      queryClient.invalidateQueries({ queryKey: ["clientDashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
      queryClient.invalidateQueries({ queryKey: ["freelancer-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["freelancerDashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      notify("Application accepted! Active project created and added to Freelancer portal.", "success");
    },
    onError: (err: any) => {
      notify(err.response?.data?.message || "Failed to accept application.", "error");
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (proposalId: string) => proposalService.reject(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals", "received"] });
      notify("Application rejected.", "info");
    },
    onError: () => notify("Failed to reject application.", "error"),
  });

  // ── Stat cards built from live data ──────────────────────────────────────
  const statCards = [
    {
      id: "active",    label: "Active Jobs",      icon: Briefcase,
      value: String(stats?.openJobs ?? 0),         tone: "brand"    as const,
    },
    {
      id: "draft",     label: "Draft Jobs",       icon: FileText,
      value: String(stats?.draftJobs ?? 0),         tone: "warning"  as const,
    },
    {
      id: "proposals", label: "Total Proposals",  icon: BarChart2,
      value: String(stats?.totalProposals ?? 0),    tone: "info"     as const,
    },
    {
      id: "projects",  label: "Active Projects",  icon: FolderKanban,
      value: String(stats?.activeProjects ?? 0),    tone: "success"  as const,
    },
    {
      id: "completed", label: "Completed Jobs",   icon: CheckCircle2,
      value: String(stats?.completedJobs ?? 0),     tone: "success"  as const,
    },
    {
      id: "spending",  label: "Total Spending",   icon: Wallet,
      value: formatCurrency(stats?.totalSpending ?? 0), tone: "warning" as const,
    },
    {
      id: "inprogress",label: "In Progress",      icon: Clock,
      value: String(stats?.inProgressJobs ?? 0),    tone: "brand"    as const,
    },
    {
      id: "total",     label: "Total Jobs",       icon: Layers,
      value: String(stats?.totalJobs ?? 0),         tone: "info"     as const,
    },
  ];

  const firstName = user?.fullName?.split(" ")[0] ?? "there";

  return (
    <DashboardLayout
      navItems={CLIENT_NAV}
      tagline="Freelance Marketplace"
      searchPlaceholder="Search talents or projects..."
      topbarRightSlot={
        <Button size="sm" icon={<PlusCircle className="h-4 w-4" />} iconPosition="left"
          onClick={() => navigate(ROUTES.CLIENT_POST_JOB)}>
          Post New Job
        </Button>
      }
    >
      {/* ── Welcome banner ── */}
      <div className="mb-6 flex flex-col gap-4 rounded-2xl border border-surface-border bg-surface-card p-7 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">
            {getTimeBasedGreeting()}, {firstName}! 👋
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-ink-500">
            {getPortalTagline("client")}
          </p>
        </div>
        <div className="flex gap-3">
          <Button variant="secondary" icon={<Sparkles className="h-4 w-4" />} iconPosition="left"
            onClick={() => navigate(ROUTES.AI_ASSISTANT)}>
            Ask Nexora AI
          </Button>
          <Button icon={<PlusCircle className="h-4 w-4" />} iconPosition="left"
            onClick={() => navigate(ROUTES.CLIENT_POST_JOB)}>
            Post a Job
          </Button>
        </div>
      </div>

      {/* ── Stats grid ── */}
      {isLoadingStats ? (
        <div className="mb-6 flex h-40 items-center justify-center rounded-2xl border border-surface-border bg-surface-card">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
        </div>
      ) : (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-4">
          {statCards.slice(0, 4).map((s) => (
            <StatCard key={s.id} label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
          ))}
        </div>
      )}

      {/* ── Second stats row ── */}
      {!isLoadingStats && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4 xl:grid-cols-4">
          {statCards.slice(4).map((s) => (
            <StatCard key={s.id} label={s.label} value={s.value} icon={s.icon} tone={s.tone} />
          ))}
        </div>
      )}

      {/* ── Main content grid ── */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">

        {/* Recently Posted Jobs — col span 2 */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Recently Posted Jobs</h2>
            <button onClick={() => navigate(ROUTES.CLIENT_MY_JOBS)}
              className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
              View All <ArrowRight className="h-4 w-4" />
            </button>
          </div>

          {isLoadingJobs ? (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-surface-border bg-surface-card">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : recentJobs.length === 0 ? (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-surface-card py-12 text-center">
              <Briefcase className="mb-3 h-10 w-10 text-ink-300" />
              <p className="text-base font-bold text-ink-700">No jobs posted yet</p>
              <p className="mt-1 text-sm text-ink-400">Start by posting your first job to find great talent.</p>
              <Button className="mt-5" size="sm" onClick={() => navigate(ROUTES.CLIENT_POST_JOB)}>
                Post Your First Job
              </Button>
            </div>
          ) : (
            recentJobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                      {job.category}
                    </span>
                    <h3 className="mt-0.5 text-base font-bold text-ink-900 truncate">{job.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-500">
                      <span className="flex items-center gap-1">
                        <Wallet className="h-3.5 w-3.5" />
                        {formatCurrency(job.budgetMin)}{job.priceType === "hourly" ? "/hr" : ""}
                      </span>
                      <span className="flex items-center gap-1">
                        <BarChart2 className="h-3.5 w-3.5" />
                        {job.proposalsCount ?? 0} proposals
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3.5 w-3.5" />
                        {job.views ?? 0} views
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatRelativeTime(job.createdAt ?? job.postedAt ?? "")}
                      </span>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge tone={STATUS_TONE[job.status]} dot>
                      {STATUS_LABEL[job.status]}
                    </Badge>
                    <button
                      onClick={() => navigate(ROUTES.CLIENT_MY_JOBS)}
                      className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                      Manage <ArrowRight className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            ))
          )}

          {/* ── Pending Applications / Proposals Section ── */}
          <div className="mt-8 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-extrabold text-ink-900 flex items-center gap-2">
                <FileText className="h-5 w-5 text-brand-600" />
                <span>Job Applications ({pendingApplications.length})</span>
              </h2>
              <button
                onClick={() => navigate(ROUTES.CLIENT_APPLICATIONS)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700 flex items-center gap-1"
              >
                View All Proposals <ArrowRight className="h-3.5 w-3.5" />
              </button>
            </div>

            {isLoadingProposals ? (
              <div className="flex h-32 items-center justify-center rounded-2xl border border-surface-border bg-surface-card">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : pendingApplications.length === 0 ? (
              <div className="rounded-2xl border border-dashed border-surface-border bg-surface-card p-6 text-center text-xs text-ink-500">
                No pending applications at this time. Applications submitted by freelancers will appear here.
              </div>
            ) : (
              pendingApplications.map((proposal: any) => {
                const proposalId = proposal.id || proposal._id;
                const jobTitle = proposal.job?.title || "Job Application";
                const freelancer = proposal.freelancer || {};
                return (
                  <div key={proposalId} className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <span className="text-[10px] font-extrabold uppercase tracking-wider text-brand-600">
                          {proposal.job?.category || "Job Post"}
                        </span>
                        <h3 className="text-sm font-bold text-ink-900 truncate mt-0.5">{jobTitle}</h3>
                      </div>
                      <Badge tone="warning" dot className="capitalize shrink-0">
                        {proposal.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-3 bg-surface-muted p-3 rounded-xl border border-surface-border">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs shrink-0">
                        {freelancer.fullName?.charAt(0) || "F"}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-ink-900 truncate">{freelancer.fullName || "Freelancer"}</p>
                        <p className="text-[10px] text-ink-500 truncate">{freelancer.email || ""}</p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-xs font-extrabold text-brand-600">{formatCurrency(proposal.bidAmount)}</p>
                        <p className="text-[10px] text-ink-400">Est. {proposal.estimatedDelivery || "N/A"}</p>
                      </div>
                    </div>

                    <p className="text-xs text-ink-600 line-clamp-2 leading-relaxed">
                      {proposal.description || proposal.coverLetter}
                    </p>

                    <div className="flex items-center justify-end gap-2 pt-1 border-t border-surface-border">
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={rejectMutation.isPending}
                        onClick={() => rejectMutation.mutate(proposalId)}
                      >
                        Reject
                      </Button>
                      <Button
                        size="sm"
                        disabled={acceptMutation.isPending}
                        onClick={() => acceptMutation.mutate(proposalId)}
                        icon={acceptMutation.isPending && acceptMutation.variables === proposalId ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : undefined}
                      >
                        Accept Application & Hire
                      </Button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Right column: Quick Actions + Recent Activity */}
        <div className="space-y-5">

          {/* Quick Actions */}
          <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
            <h2 className="mb-4 text-base font-bold text-ink-900">Quick Actions</h2>
            <div className="space-y-2.5">
              <button onClick={() => navigate(ROUTES.CLIENT_POST_JOB)}
                className="flex w-full items-center gap-3 rounded-xl border border-surface-border p-3 text-left hover:border-brand-400 hover:bg-brand-50 transition-colors group">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600 group-hover:bg-brand-200">
                  <PlusCircle className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">Post New Job</p>
                  <p className="text-xs text-ink-400">Find the right freelancer fast</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-ink-300 group-hover:text-brand-500" />
              </button>

              <button onClick={() => navigate(ROUTES.CLIENT_MY_JOBS)}
                className="flex w-full items-center gap-3 rounded-xl border border-surface-border p-3 text-left hover:border-brand-400 hover:bg-brand-50 transition-colors group">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200">
                  <Briefcase className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">View My Jobs</p>
                  <p className="text-xs text-ink-400">Manage all your active postings</p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-ink-300 group-hover:text-brand-500" />
              </button>

              <button onClick={() => navigate(ROUTES.CLIENT_APPLICATIONS)}
                className="flex w-full items-center gap-3 rounded-xl border border-surface-border p-3 text-left hover:border-brand-400 hover:bg-brand-50 transition-colors group">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-sky-100 text-sky-600 group-hover:bg-sky-200">
                  <FileText className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">Review Proposals</p>
                  <p className="text-xs text-ink-400">
                    {stats?.totalProposals ?? 0} total received
                  </p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-ink-300 group-hover:text-brand-500" />
              </button>

              <button onClick={() => navigate(ROUTES.WORKSPACE)}
                className="flex w-full items-center gap-3 rounded-xl border border-surface-border p-3 text-left hover:border-brand-400 hover:bg-brand-50 transition-colors group">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-600 group-hover:bg-violet-200">
                  <Rocket className="h-5 w-5" />
                </span>
                <div>
                  <p className="text-sm font-semibold text-ink-900">Active Projects</p>
                  <p className="text-xs text-ink-400">
                    {stats?.activeProjects ?? 0} running contracts
                  </p>
                </div>
                <ArrowRight className="ml-auto h-4 w-4 text-ink-300 group-hover:text-brand-500" />
              </button>
            </div>
          </div>

          {/* Latest Notifications */}
          <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-base font-bold text-ink-900">Latest Notifications</h2>
              <button onClick={() => navigate(ROUTES.NOTIFICATIONS)}
                className="text-xs font-semibold text-brand-600 hover:text-brand-700">
                View All
              </button>
            </div>

            {isLoadingStats ? (
              <div className="flex h-20 items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
              </div>
            ) : (stats?.recentActivity ?? []).length === 0 ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Bell className="mb-2 h-8 w-8 text-ink-300" />
                <p className="text-sm text-ink-400">No recent notifications</p>
              </div>
            ) : (
              <div className="space-y-3">
                {(stats?.recentActivity ?? []).slice(0, 5).map((item) => (
                  <div key={item.id}
                    className={`flex items-start gap-3 rounded-xl p-3 transition-colors ${item.read ? "bg-surface-muted" : "bg-brand-50 border border-brand-100"}`}>
                    <span className={`mt-0.5 flex h-2 w-2 shrink-0 rounded-full ${item.read ? "bg-ink-300" : "bg-brand-500"}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-ink-800 truncate">{item.title}</p>
                      <p className="text-xs text-ink-500 truncate">{item.description}</p>
                      <p className="mt-0.5 text-xs text-ink-400">{formatRelativeTime(item.createdAt)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>

      {/* ── Recent Activity timeline ── */}
      <div className="mt-6 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
        <div className="mb-5 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-brand-600" />
            <h2 className="text-lg font-bold text-ink-900">Recent Activity</h2>
          </div>
          <button onClick={() => navigate(ROUTES.CLIENT_ACTIVITY)}
            className="flex items-center gap-1 text-sm font-semibold text-brand-600 hover:text-brand-700">
            View All <ArrowRight className="h-4 w-4" />
          </button>
        </div>

        {isLoadingActivity ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </div>
        ) : recentActivity.length === 0 ? (
          <div className="flex flex-col items-center py-8 text-center">
            <Activity className="mb-2 h-8 w-8 text-ink-300" />
            <p className="text-sm font-semibold text-ink-600">No activity yet</p>
            <p className="mt-0.5 text-sm text-ink-400">
              Post a job or receive a proposal to start building your timeline.
            </p>
          </div>
        ) : (
          <ol className="relative ml-1 space-y-5 border-l border-surface-border pl-6">
            {recentActivity.map((item) => {
              const Icon = ACTIVITY_ICON[item.type] ?? Activity;
              return (
                <li key={item.id} className="relative">
                  <span className="absolute -left-[31px] flex h-6 w-6 items-center justify-center rounded-full bg-brand-100 text-brand-600 ring-4 ring-surface-card">
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="flex flex-wrap items-center justify-between gap-1">
                    <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                    <span className="shrink-0 text-xs text-ink-400">
                      {formatRelativeTime(item.createdAt)}
                    </span>
                  </div>
                  <p className="mt-0.5 text-sm text-ink-500">{item.description}</p>
                  {item.meta && <p className="mt-0.5 text-xs text-ink-400">{item.meta}</p>}
                </li>
              );
            })}
          </ol>
        )}
      </div>
    </DashboardLayout>
  );
}
