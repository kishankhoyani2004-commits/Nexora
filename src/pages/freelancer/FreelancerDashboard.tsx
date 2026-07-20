import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Wallet, FolderKanban, MessageSquare, FileText, BellRing,
  Calendar, Sparkles, Bell, ArrowRight, Bookmark, ChevronRight,
  Search, LayoutGrid, Clock, TrendingUp,
  CheckCircle2, AlertCircle, RefreshCw, ExternalLink,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { dashboardService } from "@/services/dashboard.service";
import { jobService } from "@/services/job.service";
import { contractService } from "@/services/contract.service";
import { messageService } from "@/services/message.service";
import { notificationService } from "@/services/notification.service";
import { savedJobService } from "@/services/savedJob.service";
import { jobAlertService } from "@/services/jobAlert.service";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import { ROUTES } from "@/constants/routes";
import type { Contract } from "@/types";
import type { RecommendedJob } from "@/services/job.service";

// ── Helpers ────────────────────────────────────────────────────────────────

function contractProgress(c: Contract): number {
  if (c.status === "completed") return 100;
  if (c.status === "active")    return 55;
  if (c.status === "pending")   return 10;
  return 0;
}

function statusTone(status: string): "success" | "warning" | "info" | "neutral" {
  if (status === "completed") return "success";
  if (status === "active")    return "info";
  if (status === "pending")   return "warning";
  return "neutral";
}

const QUICK_ACTIONS = [
  { label: "Browse Jobs",      icon: Search,       href: ROUTES.JOBS,                              tone: "brand"   },
  { label: "Recommended",      icon: Sparkles,     href: ROUTES.RECOMMENDED_JOBS,                  tone: "violet"  },
  { label: "My Proposals",     icon: FileText,     href: ROUTES.PROPOSALS,                         tone: "info"    },
  { label: "Messages",         icon: MessageSquare,href: ROUTES.MESSAGES,                          tone: "success" },
  { label: "Withdraw Funds",   icon: Wallet,       href: `${ROUTES.FREELANCER_EARNINGS}?tab=withdraw`, tone: "warning" },
] as const;

// ── Component ──────────────────────────────────────────────────────────────

export default function FreelancerDashboard() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { notify }  = useNotification();

  // Dashboard search — redirects to BrowseJobs with pre-filled query
  const [dashSearch, setDashSearch] = useState("");

  const firstName = user?.fullName?.split(" ")[0] ?? "there";
  const today     = new Date().toLocaleDateString("en-US", {
    weekday: "long", month: "long", day: "numeric",
  });

  function handleDashboardSearch(e: React.FormEvent) {
    e.preventDefault();
    if (dashSearch.trim()) {
      navigate(`${ROUTES.JOBS}?q=${encodeURIComponent(dashSearch.trim())}`);
    }
  }

  // ── Data fetching ───────────────────────────────────────────────────
  const { data: statsRes, isLoading: statsLoading } = useQuery({
    queryKey: ["freelancerDashboardStats"],
    queryFn:  () => dashboardService.getFreelancerStats(),
    staleTime: 60_000,
  });

  // Real recommended jobs from /api/jobs/recommended
  const { data: recJobsRes, isLoading: jobsLoading } = useQuery({
    queryKey: ["recommendedJobsDashboard"],
    queryFn:  () => jobService.getRecommended(6),
    staleTime: 120_000,
  });

  const { data: contractsRes, isLoading: contractsLoading } = useQuery({
    queryKey: ["freelancerContractsDashboard"],
    queryFn:  () => contractService.list(),
    staleTime: 60_000,
  });

  const { data: convsRes, isLoading: convsLoading } = useQuery({
    queryKey: ["conversationsDashboard"],
    queryFn:  () => messageService.listConversations(),
    staleTime: 30_000,
  });

  const { data: notifsRes } = useQuery({
    queryKey: ["notificationsDashboard"],
    queryFn:  () => notificationService.list(),
    staleTime: 30_000,
  });

  const { data: activityRes } = useQuery({
    queryKey: ["dashboardActivity"],
    queryFn:  () => dashboardService.getFreelancerActivity({ page: 1, limit: 5 }),
    staleTime: 60_000,
  });

  // Saved jobs count for KPI
  const { data: savedIdsRes } = useQuery({
    queryKey: ["savedJobIds"],
    queryFn:  () => savedJobService.getIds(),
    staleTime: 30_000,
  });

  // Job alerts count for KPI
  const { data: alertsRes } = useQuery({
    queryKey: ["jobAlerts"],
    queryFn:  () => jobAlertService.list(),
    staleTime: 60_000,
  });

  // ── Derived data ────────────────────────────────────────────────────
  const stats           = statsRes?.data?.data;
  const recJobs: RecommendedJob[] = (recJobsRes?.data?.data as any)?.items ?? [];
  const allContracts: Contract[]  = (contractsRes?.data?.data as any) ?? [];
  const activeContracts = allContracts.filter((c) => c.status === "active").slice(0, 4);
  const conversations   = (convsRes?.data?.data as any) ?? [];
  const recentConvs     = conversations.slice(0, 3);
  const rawNotifs       = notifsRes?.data as any;
  const notifications: any[] = Array.isArray(rawNotifs?.data)
    ? rawNotifs.data : Array.isArray(rawNotifs) ? rawNotifs : [];
  const unreadNotifs    = notifications.filter((n: any) => !n.read).length;
  const recentActivity  = (activityRes?.data?.data as any)?.items ?? [];
  const userSkills      = user?.skills ?? [];
  const savedCount      = ((savedIdsRes?.data?.data as any) ?? []).length;
  const alertCount      = ((alertsRes?.data?.data as any) ?? []).filter((a: any) => a.active).length;

  // ── Save / unsave on dashboard recommended jobs ──────────────────────
  const savedIdsSet = new Set<string>((savedIdsRes?.data?.data as any) ?? []);
  const saveMutation = useMutation({
    mutationFn: ({ id, saving }: { id: string; saving: boolean }): Promise<any> =>
      (saving ? savedJobService.save(id) : savedJobService.unsave(id)) as Promise<any>,
    onSuccess: (_, { saving }) => {
      queryClient.invalidateQueries({ queryKey: ["savedJobIds"] });
      queryClient.invalidateQueries({ queryKey: ["savedJobs"] });
      notify(saving ? "Job saved!" : "Job removed from saved.", saving ? "success" : "info");
    },
    onError: () => notify("Something went wrong.", "error"),
  });

  const handleSave = (jobId: string) => {
    saveMutation.mutate({ id: jobId, saving: !savedIdsSet.has(jobId) });
  };

  function handleSoftRefresh() {
    queryClient.invalidateQueries();
    notify("Dashboard refreshed.", "success");
  }

  // AI Insights derived from real data
  const aiInsights = useMemo(() => {
    const insights: { icon: string; text: string; type: "tip" | "alert" | "insight" }[] = [];
    if (stats) {
      if (stats.profileCompletion < 80)
        insights.push({ icon: "🎯", text: `Your profile is ${stats.profileCompletion}% complete. A complete profile gets 5× more views.`, type: "tip" });
      if (stats.pendingProposals > 3)
        insights.push({ icon: "📋", text: `You have ${stats.pendingProposals} pending proposals. Follow up to improve your acceptance rate.`, type: "alert" });
      if (stats.acceptanceRate < 30 && stats.pendingProposals > 0)
        insights.push({ icon: "✍️", text: "Your proposal acceptance rate is below average. Try personalising your cover letters.", type: "tip" });
      if (stats.activeProjects > 0)
        insights.push({ icon: "🚀", text: `You have ${stats.activeProjects} active project${stats.activeProjects > 1 ? "s" : ""}. Keep your clients updated to earn top reviews.`, type: "insight" });
      if (stats.unreadMessages > 0)
        insights.push({ icon: "💬", text: `${stats.unreadMessages} unread message${stats.unreadMessages > 1 ? "s" : ""} waiting. Fast replies boost your response score.`, type: "alert" });
      if (stats.jobSuccessScore >= 80)
        insights.push({ icon: "⭐", text: `Your job success score is ${stats.jobSuccessScore}%. You qualify for Top Rated status.`, type: "insight" });
    }
    if (userSkills.length > 0)
      insights.push({ icon: "🔥", text: `Skills like "${userSkills.slice(0, 2).join('" and "')}" are in high demand this week.`, type: "insight" });
    return insights.slice(0, 4);
  }, [stats, userSkills]);

  // ── KPI card definitions ────────────────────────────────────────────
  const kpiCards = [
    {
      label: "Active Projects",    value: stats ? String(stats.activeProjects)       : "—",
      icon: FolderKanban,  tone: "info"    as const, href: ROUTES.WORKSPACE,
      delta: stats?.totalContracts ? `${stats.totalContracts} total` : undefined,
    },
    {
      label: "Pending Proposals",  value: stats ? String(stats.pendingProposals)     : "—",
      icon: FileText,      tone: "warning" as const, href: ROUTES.PROPOSALS,
      delta: stats?.acceptanceRate ? `${stats.acceptanceRate}% acceptance` : undefined,
    },
    {
      label: "Unread Messages",    value: stats ? String(stats.unreadMessages)       : "—",
      icon: MessageSquare, tone: "brand"   as const, href: ROUTES.MESSAGES,
    },
    {
      label: "Total Earnings",     value: stats ? formatCurrency(stats.totalEarnings): "—",
      icon: Wallet,        tone: "success" as const, href: ROUTES.FREELANCER_EARNINGS,
      delta: stats?.inEscrow ? `+ ${formatCurrency(stats.inEscrow)} in escrow` : undefined,
    },
    {
      label: "Saved Jobs",         value: String(savedCount),
      icon: Bookmark,      tone: "info"    as const, href: ROUTES.SAVED_JOBS,
    },
    {
      label: "Active Alerts",      value: String(alertCount),
      icon: BellRing,      tone: "warning" as const, href: ROUTES.JOB_ALERTS,
    },
  ];

  return (
    <DashboardLayout searchPlaceholder="Search jobs, projects…">
      <div className="mx-auto max-w-screen-xl space-y-8 pb-12">

        {/* ── Welcome Header ─────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1 className="text-2xl font-bold text-ink-900">
              Welcome back, {firstName} 👋
            </h1>
            <p className="mt-1 flex items-center gap-1.5 text-sm text-ink-500">
              <Calendar className="h-3.5 w-3.5" />
              {today}
            </p>
          </div>
          <div className="flex flex-col gap-2 sm:items-end">
            {/* Dashboard search → redirects to BrowseJobs with query */}
            <form onSubmit={handleDashboardSearch} className="flex items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
                <input
                  type="text"
                  value={dashSearch}
                  onChange={(e) => setDashSearch(e.target.value)}
                  placeholder="Search jobs, skills, companies…"
                  className="h-10 w-64 rounded-xl border border-surface-border bg-surface-card pl-10 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
                />
              </div>
              <Button type="submit" size="sm" variant="outline">Search</Button>
            </form>
            <div className="flex items-center gap-2">
              <button
                onClick={() => navigate(ROUTES.NOTIFICATIONS)}
                className="relative flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-surface-card text-ink-500 shadow-card hover:bg-surface-muted transition-colors"
                aria-label="Notifications"
              >
                <Bell className="h-5 w-5" />
                {unreadNotifs > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-danger text-[10px] font-bold text-white">
                    {unreadNotifs > 9 ? "9+" : unreadNotifs}
                  </span>
                )}
              </button>
              <button
                onClick={handleSoftRefresh}
                className="flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border bg-surface-card text-ink-500 shadow-card hover:bg-surface-muted transition-colors"
                aria-label="Refresh dashboard"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
              <Button
                variant="primary" size="sm"
                icon={<Sparkles className="h-4 w-4" />} iconPosition="left"
                onClick={() => navigate(ROUTES.AI_ASSISTANT)}
              >
                Ask Nexora AI
              </Button>
            </div>
          </div>
        </div>

        {/* ── KPI Cards ──────────────────────────────────────────────── */}
        <section aria-label="KPI metrics">
          {statsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
            </div>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
              {kpiCards.map((card) => (
                <button
                  key={card.label}
                  onClick={() => navigate(card.href)}
                  className="text-left transition-transform hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500 rounded-2xl"
                >
                  <StatCard
                    label={card.label}
                    value={card.value}
                    icon={card.icon}
                    tone={card.tone}
                    delta={card.delta}
                  />
                </button>
              ))}
            </div>
          )}
        </section>

        {/* ── AI Insights Hero ───────────────────────────────────────── */}
        {aiInsights.length > 0 && (
          <section
            aria-label="AI Insights"
            className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-surface-card to-violet-50 p-6 shadow-card dark:border-surface-border dark:from-surface-muted dark:via-surface-card dark:to-surface-muted"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-pop">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">Nexora AI Insights</p>
                  <p className="text-xs text-ink-500">Personalised recommendations based on your activity</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate(ROUTES.AI_ASSISTANT)}
              >
                Open AI Assistant
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {aiInsights.map((ins, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border p-4",
                    ins.type === "alert"   && "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10",
                    ins.type === "tip"     && "border-brand-200 bg-brand-50 dark:border-brand-900/40 dark:bg-brand-900/10",
                    ins.type === "insight" && "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/10",
                  )}
                >
                  <span className="mb-2 block text-xl">{ins.icon}</span>
                  <p className="text-xs leading-relaxed text-ink-700">{ins.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Recommended Jobs ───────────────────────────────────────── */}
        <section aria-label="Recommended Jobs">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink-900">Recommended Jobs</h2>
              <p className="text-xs text-ink-500">AI-matched to your skills and work history</p>
            </div>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.RECOMMENDED_JOBS)}>
              View all
            </Button>
          </div>

          {jobsLoading ? (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card space-y-3">
                  <div className="h-4 w-3/4 animate-pulse rounded bg-surface-muted" />
                  <div className="h-3 w-1/2 animate-pulse rounded bg-surface-muted" />
                  <div className="h-3 w-2/3 animate-pulse rounded bg-surface-muted" />
                </div>
              ))}
            </div>
          ) : recJobs.length === 0 ? (
            <EmptyState icon={Search} title="No recommendations yet"
              description="Add skills to your profile so we can match you with the right jobs."
              action={<Button variant="primary" size="sm" onClick={() => navigate(ROUTES.JOBS)}>Browse Jobs</Button>} />
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {recJobs.map((job) => {
                const isSaved = savedIdsSet.has(job.id);
                return (
                  <div key={job.id}
                    className="group flex cursor-pointer flex-col rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card transition-all hover:border-brand-400 hover:shadow-pop"
                    onClick={() => navigate(`/jobs/${job.id}`)}>
                    <div className="mb-3 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-semibold text-ink-900 group-hover:text-brand-600 transition-colors">{job.title}</p>
                        <p className="mt-0.5 text-xs text-ink-500">{job.client?.fullName ?? "Client"}</p>
                      </div>
                      <span className={cn(
                        "shrink-0 rounded-full border px-2.5 py-0.5 text-[11px] font-bold",
                        job.matchScore >= 85 ? "border-emerald-200 bg-emerald-100 text-emerald-700"
                        : job.matchScore >= 65 ? "border-amber-200 bg-amber-100 text-amber-700"
                        : "border-surface-border bg-surface-muted text-ink-500"
                      )}>
                        {job.matchScore}%
                      </span>
                    </div>
                    <div className="mb-3 flex flex-wrap gap-1.5">
                      {(job.skills ?? []).slice(0, 3).map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
                      {(job.skills ?? []).length > 3 && <Badge tone="neutral">+{(job.skills ?? []).length - 3}</Badge>}
                    </div>
                    <div className="mt-auto flex items-center justify-between border-t border-surface-border pt-3">
                      <div>
                        <p className="text-sm font-bold text-ink-900">{formatCurrency(job.budgetMin)}–{formatCurrency(job.budgetMax)}</p>
                        <p className="text-[11px] text-ink-400">{formatRelativeTime(job.createdAt ?? job.postedAt ?? "")}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => { e.stopPropagation(); handleSave(job.id); }}
                          aria-label={isSaved ? "Unsave" : "Save"}
                          className={cn("flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                            isSaved ? "bg-brand-100 text-brand-600" : "bg-surface-muted text-ink-400 hover:text-brand-600")}>
                          <Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
                        </button>
                        <Button variant="primary" size="sm"
                          onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}/proposal`); }}>
                          Apply
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Active Projects + Recent Messages ─────────────────────── */}
        <div className="grid gap-6 lg:grid-cols-5">

          {/* Active Projects – 3/5 */}
          <section aria-label="Active Projects" className="lg:col-span-3">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink-900">Active Projects</h2>
                <p className="text-xs text-ink-500">Your current ongoing work</p>
              </div>
              <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate(ROUTES.WORKSPACE)}>
                View all
              </Button>
            </div>

            {contractsLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="rounded-xl border border-surface-border bg-surface-card p-4 animate-pulse space-y-2">
                    <div className="h-4 w-1/2 rounded bg-surface-muted" />
                    <div className="h-2 w-full rounded bg-surface-muted" />
                  </div>
                ))}
              </div>
            ) : activeContracts.length === 0 ? (
              <EmptyState icon={FolderKanban} title="No active projects" description="When a client accepts your proposal, your project will appear here." />
            ) : (
              <div className="space-y-3">
                {activeContracts.map((contract) => {
                  const progress = contractProgress(contract);
                  const clientName = contract.client?.fullName ?? "Client";
                  return (
                    <div key={contract.id} className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-card hover:shadow-pop transition-shadow">
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink-900">{contract.title}</p>
                          <p className="mt-0.5 text-xs text-ink-500">Client: <span className="font-medium text-ink-700">{clientName}</span></p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <Badge tone={statusTone(contract.status)} dot>{contract.status}</Badge>
                          <Button variant="ghost" size="sm" icon={<ExternalLink className="h-3.5 w-3.5" />} onClick={() => navigate(ROUTES.WORKSPACE)}>
                            Open
                          </Button>
                        </div>
                      </div>
                      {/* Progress bar */}
                      <div className="mb-1.5 flex items-center justify-between text-xs text-ink-400">
                        <span>Progress</span>
                        <span className="font-semibold text-ink-700">{progress}%</span>
                      </div>
                      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
                        <div
                          className="h-full rounded-full transition-all duration-700"
                          style={{
                            width: `${progress}%`,
                            background: progress === 100
                              ? "linear-gradient(90deg,#10b981,#059669)"
                              : "linear-gradient(90deg,#6366f1,#8b5cf6)",
                          }}
                        />
                      </div>
                      <div className="mt-2 flex items-center justify-between text-xs text-ink-400">
                        <span className="flex items-center gap-1">
                          <Wallet className="h-3 w-3" />
                          {formatCurrency(contract.budget)}
                        </span>
                        {contract.escrowStatus === "funded" && (
                          <span className="flex items-center gap-1 text-amber-600">
                            <Clock className="h-3 w-3" /> In Escrow
                          </span>
                        )}
                        {contract.escrowStatus === "released" && (
                          <span className="flex items-center gap-1 text-emerald-600">
                            <CheckCircle2 className="h-3 w-3" /> Paid
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </section>

          {/* Recent Messages – 2/5 */}
          <section aria-label="Recent Messages" className="lg:col-span-2">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink-900">Recent Messages</h2>
                <p className="text-xs text-ink-500">Latest conversations</p>
              </div>
              <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate(ROUTES.MESSAGES)}>
                View all
              </Button>
            </div>
            <div className="rounded-2xl border border-surface-border bg-surface-card shadow-card">
              {convsLoading ? (
                <div className="space-y-px divide-y divide-surface-border">
                  {Array.from({ length: 3 }).map((_, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 animate-pulse">
                      <div className="h-9 w-9 rounded-full bg-surface-muted shrink-0" />
                      <div className="flex-1 space-y-1.5">
                        <div className="h-3 w-2/3 rounded bg-surface-muted" />
                        <div className="h-2 w-full rounded bg-surface-muted" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : recentConvs.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <MessageSquare className="h-8 w-8 text-ink-300" />
                  <p className="text-sm text-ink-400">No conversations yet</p>
                </div>
              ) : (
                <ul className="divide-y divide-surface-border">
                  {recentConvs.map((conv: any) => (
                    <li key={conv.id}>
                      <button
                        onClick={() => navigate(ROUTES.MESSAGES)}
                        className="flex w-full items-center gap-3 p-4 text-left transition-colors hover:bg-surface-muted/50"
                      >
                        <Avatar name={conv.partnerName} src={conv.partnerAvatar} size="sm" online={conv.online} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-1">
                            <p className="truncate text-sm font-semibold text-ink-900">{conv.partnerName}</p>
                            {conv.unreadCount > 0 && (
                              <span className="flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                                {conv.unreadCount}
                              </span>
                            )}
                          </div>
                          <p className="truncate text-xs text-ink-500">{conv.lastMessage}</p>
                        </div>
                        <ChevronRight className="h-4 w-4 shrink-0 text-ink-300" />
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* ── Upcoming Meetings + Recent Activity ───────────────────── */}
        <div className="grid gap-6 lg:grid-cols-2">

          {/* Upcoming Meetings */}
          <section aria-label="Upcoming Meetings">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink-900">Upcoming Meetings</h2>
                <p className="text-xs text-ink-500">Interviews & scheduled calls</p>
              </div>
              <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate(`${ROUTES.MESSAGES}?meetings=true`)}>
                View all
              </Button>
            </div>
            <div className="rounded-2xl border border-surface-border bg-surface-card shadow-card">
              {notifications.filter((n: any) => n.title?.toLowerCase().includes("interview") || n.title?.toLowerCase().includes("meeting")).slice(0, 3).length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <Calendar className="h-8 w-8 text-ink-300" />
                  <p className="text-sm text-ink-400">No upcoming meetings</p>
                  <p className="text-xs text-ink-300">Interviews and calls will appear here</p>
                </div>
              ) : (
                <ul className="divide-y divide-surface-border">
                  {notifications
                    .filter((n: any) => n.title?.toLowerCase().includes("interview") || n.title?.toLowerCase().includes("meeting"))
                    .slice(0, 3)
                    .map((n: any) => (
                    <li key={n.id} className="flex items-start gap-3 p-4">
                      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-brand-100 text-brand-600">
                        <Calendar className="h-4 w-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold text-ink-900">{n.title}</p>
                        <p className="mt-0.5 text-xs text-ink-500 line-clamp-2">{n.message}</p>
                        <p className="mt-1 text-[11px] text-ink-400">{formatRelativeTime(n.createdAt)}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {/* Recent Activity */}
          <section aria-label="Recent Activity">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-base font-bold text-ink-900">Recent Activity</h2>
                <p className="text-xs text-ink-500">Latest account events</p>
              </div>
              <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />} onClick={() => navigate(ROUTES.FREELANCER_ACTIVITY)}>
                Full feed
              </Button>
            </div>
            <div className="rounded-2xl border border-surface-border bg-surface-card shadow-card">
              {recentActivity.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-10 text-center">
                  <LayoutGrid className="h-8 w-8 text-ink-300" />
                  <p className="text-sm text-ink-400">No recent activity</p>
                </div>
              ) : (
                <ul className="divide-y divide-surface-border">
                  {recentActivity.map((item: any) => {
                    const isPositive = ["proposal_accepted", "payment_received", "contract_completed", "review_received"].includes(item.type);
                    const isWarning  = ["proposal_rejected"].includes(item.type);
                    return (
                      <li key={item.id} className="flex items-start gap-3 p-4">
                        <span className={cn(
                          "mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-xl",
                          isPositive ? "bg-emerald-100 text-emerald-600" :
                          isWarning  ? "bg-red-100 text-red-500" :
                                       "bg-brand-100 text-brand-600"
                        )}>
                          {isPositive ? <CheckCircle2 className="h-4 w-4" /> :
                           isWarning  ? <AlertCircle className="h-4 w-4" /> :
                                        <TrendingUp className="h-4 w-4" />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-ink-900">{item.title}</p>
                          <p className="mt-0.5 text-xs text-ink-500 line-clamp-1">{item.description}</p>
                          <p className="mt-1 text-[11px] text-ink-400">{formatRelativeTime(item.createdAt)}</p>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </section>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────────── */}
        <section aria-label="Quick Actions">
          <h2 className="mb-4 text-base font-bold text-ink-900">Quick Actions</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {QUICK_ACTIONS.map(({ label, icon: Icon, href, tone }) => (
              <button
                key={label}
                onClick={() => navigate(href)}
                className={cn(
                  "group flex flex-col items-center gap-2.5 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card",
                  "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-pop",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand-500"
                )}
              >
                <span className={cn(
                  "flex h-11 w-11 items-center justify-center rounded-xl transition-colors",
                  tone === "brand"   && "bg-brand-100 text-brand-600 group-hover:bg-brand-600 group-hover:text-white",
                  tone === "info"    && "bg-sky-100 text-sky-600 group-hover:bg-sky-600 group-hover:text-white",
                  tone === "success" && "bg-emerald-100 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white",
                  tone === "warning" && "bg-amber-100 text-amber-600 group-hover:bg-amber-600 group-hover:text-white",
                  tone === "violet"  && "bg-violet-100 text-violet-600 group-hover:bg-violet-600 group-hover:text-white",
                )}>
                  <Icon className="h-5 w-5" />
                </span>
                <span className="text-xs font-semibold text-ink-700 group-hover:text-ink-900 text-center leading-tight">
                  {label}
                </span>
              </button>
            ))}
          </div>
        </section>

      </div>
    </DashboardLayout>
  );
}
