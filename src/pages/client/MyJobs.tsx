import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  Briefcase, PlusCircle, Loader2, Pencil, Trash2,
  Eye, Copy, X, BarChart2, Calendar, DollarSign,
  ChevronDown, ChevronUp, Rocket, Star, MessageCircle, CheckCircle2, XCircle,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Avatar } from "@/components/ui/Avatar";
import { CLIENT_NAV } from "@/constants/nav";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobService } from "@/services/job.service";
import { proposalService } from "@/services/proposal.service";
import { contractService } from "@/services/contract.service";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import type { Job, JobStatus, ExperienceLevel, Proposal } from "@/types";

// ── Tab definitions ──────────────────────────────────────────────────────────
type Tab = { key: JobStatus | "all"; label: string };
const TABS: Tab[] = [
  { key: "all",         label: "All Jobs"    },
  { key: "draft",       label: "Draft"       },
  { key: "open",        label: "Open"        },
  { key: "in_progress", label: "In Progress" },
  { key: "completed",   label: "Completed"   },
  { key: "closed",      label: "Closed"      },
];

// ── Status → badge tone mapping ───────────────────────────────────────────────
const STATUS_TONE: Record<JobStatus, "neutral" | "warning" | "success" | "brand" | "info" | "danger"> = {
  draft:       "neutral",
  open:        "success",
  in_progress: "brand",
  completed:   "info",
  closed:      "danger",
};

const STATUS_LABEL: Record<JobStatus, string> = {
  draft:       "Draft",
  open:        "Open",
  in_progress: "In Progress",
  completed:   "Completed",
  closed:      "Closed",
};

const CATEGORIES = [
  "All Categories", "UI/UX Design", "AI & ML", "Web Development", "Full Stack Development",
  "Backend Development", "Frontend Development", "Mobile Development",
  "Branding & Design", "Data Science", "Graphic Design",
  "Content Writing", "Video Editing", "Cyber Security", "DevOps & Cloud",
  "Marketing & SEO", "Finance & Accounting", "General",
];

// ── Edit modal state type ────────────────────────────────────────────────────
interface EditState {
  job:         Job;
  title:       string;
  category:    string;
  budgetMin:   number;
  budgetMax:   number;
  experience:  ExperienceLevel;
  description: string;
  visibility:  "public" | "private";
}

export default function MyJobs() {
  const { user }          = useAuth();
  const navigate          = useNavigate();
  const queryClient       = useQueryClient();
  const { notify }        = useNotification();

  const clientId = user?.id || user?._id;

  // ── UI state ─────────────────────────────────────────────────────────────
  const [activeTab,    setActiveTab]    = useState<JobStatus | "all">("all");
  const [searchQuery,  setSearchQuery]  = useState("");
  const [filterCat,    setFilterCat]    = useState("All Categories");
  const [expandedId,   setExpandedId]   = useState<string | null>(null);
  const [showAppsId,   setShowAppsId]   = useState<string | null>(null);
  const [editState,    setEditState]    = useState<EditState | null>(null);

  // ── Fetch all client jobs ─────────────────────────────────────────────────
  const { data: jobsRes, isLoading } = useQuery({
    queryKey: ["clientJobs", clientId],
    queryFn:  async () => {
      const res = await jobService.list({ client: clientId, limit: 100 });
      return res.data;
    },
    enabled: !!clientId,
  });

  const allJobs: Job[] = jobsRes?.data?.items ?? [];

  // ── Fetch proposals for a specific job ─────────────────────────────────────
  const { data: proposalsRes } = useQuery({
    queryKey: ["jobProposals", showAppsId],
    queryFn: async () => {
      if (!showAppsId) return [];
      const res = await proposalService.listForJob(showAppsId);
      return res.data;
    },
    enabled: !!showAppsId,
  });

  const jobProposals: Proposal[] = (proposalsRes as Proposal[]) || [];

  // ── Tab counts ────────────────────────────────────────────────────────────
  const tabCounts = TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = t.key === "all"
      ? allJobs.length
      : allJobs.filter((j) => j.status === t.key).length;
    return acc;
  }, {});

  // ── Filtered jobs ─────────────────────────────────────────────────────────
  const filteredJobs = allJobs.filter((j) => {
    const matchTab   = activeTab === "all" || j.status === activeTab;
    const matchSearch = !searchQuery ||
      j.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      j.category.toLowerCase().includes(searchQuery.toLowerCase());
    const matchCat = filterCat === "All Categories" || j.category === filterCat;
    return matchTab && matchSearch && matchCat;
  });

  // ── Mutations ─────────────────────────────────────────────────────────────
  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
      queryClient.invalidateQueries({ queryKey: ["clientDashboardStats"] });
      notify("Job deleted successfully.", "success");
    },
    onError: () => notify("Failed to delete job.", "error"),
  });

  const closeMutation = useMutation({
    mutationFn: (id: string) => jobService.close(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
      queryClient.invalidateQueries({ queryKey: ["clientDashboardStats"] });
      notify("Job closed.", "success");
    },
    onError: () => notify("Failed to close job.", "error"),
  });

  const publishMutation = useMutation({
    mutationFn: (id: string) => jobService.publish(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
      queryClient.invalidateQueries({ queryKey: ["clientDashboardStats"] });
      notify("Job published! Freelancers can now apply.", "success");
    },
    onError: () => notify("Failed to publish job.", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Job> }) =>
      jobService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
      setEditState(null);
      notify("Job updated successfully.", "success");
    },
    onError: () => notify("Failed to update job.", "error"),
  });

  // ── Duplicate: create draft copy ──────────────────────────────────────────
  const duplicateMutation = useMutation({
    mutationFn: (job: Job) =>
      jobService.saveDraft({
        title:           `${job.title} (Copy)`,
        category:        job.category,
        subcategory:     job.subcategory,
        description:     job.description,
        skills:          job.skills,
        priceType:       job.priceType,
        budgetMin:       job.budgetMin,
        budgetMax:       job.budgetMax,
        experienceLevel: job.experienceLevel,
        duration:        job.duration,
        visibility:      job.visibility ?? "public",
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
      notify("Job duplicated as a new draft.", "success");
    },
    onError: () => notify("Failed to duplicate job.", "error"),
  });

  // ── Accept proposal (create contract) ──────────────────────────────────────
  const acceptProposalMutation = useMutation({
    mutationFn: (proposalId: string) => contractService.create(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobProposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
      queryClient.invalidateQueries({ queryKey: ["clientDashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["freelancer-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["freelancerDashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["earnings"] });
      notify("Proposal accepted! Active project created and earnings updated.", "success");
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to accept proposal.", "error"),
  });

  // ── Reject proposal ────────────────────────────────────────────────────────
  const rejectProposalMutation = useMutation({
    mutationFn: (proposalId: string) => proposalService.reject(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobProposals"] });
      queryClient.invalidateQueries({ queryKey: ["proposals"] });
      notify("Proposal rejected.", "info");
    },
    onError: () => notify("Failed to reject proposal.", "error"),
  });

  const openEdit = (job: Job) => setEditState({
    job,
    title:       job.title,
    category:    job.category,
    budgetMin:   job.budgetMin,
    budgetMax:   job.budgetMax,
    experience:  job.experienceLevel,
    description: job.description,
    visibility:  job.visibility ?? "public",
  });

  const handleUpdateSubmit = () => {
    if (!editState) return;
    updateMutation.mutate({
      id: editState.job.id,
      payload: {
        title:           editState.title,
        category:        editState.category,
        budgetMin:       editState.budgetMin,
        budgetMax:       editState.budgetMax,
        experienceLevel: editState.experience,
        description:     editState.description,
        visibility:      editState.visibility,
      },
    });
  };

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
      {/* ── Page header ── */}
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">My Jobs</h1>
        <p className="mt-1 text-sm text-ink-500">
          Manage all your job posts. Data loads live from MongoDB.
        </p>
      </div>

      {/* ── Search & filter bar ── */}
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center">
        <Input
          placeholder="Search by title or category…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select value={filterCat} onChange={(e) => setFilterCat(e.target.value)} className="sm:max-w-xs">
          {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
        </Select>
        {(searchQuery || filterCat !== "All Categories") && (
          <button onClick={() => { setSearchQuery(""); setFilterCat("All Categories"); }}
            className="flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
            <X className="h-4 w-4" /> Clear filters
          </button>
        )}
      </div>

      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-surface-border bg-surface-muted p-1">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              activeTab === tab.key
                ? "bg-surface-card text-brand-600 shadow-sm"
                : "text-ink-500 hover:text-ink-700"
            )}>
            {tab.label}
            <span className={cn(
              "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold",
              activeTab === tab.key ? "bg-brand-100 text-brand-700" : "bg-surface-border text-ink-500"
            )}>
              {tabCounts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Job list ── */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-surface-border bg-surface-card">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
        </div>
      ) : filteredJobs.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-surface-border bg-surface-card py-16 text-center">
          <Briefcase className="mb-4 h-12 w-12 text-ink-300" />
          <p className="text-lg font-bold text-ink-700">No jobs found</p>
          <p className="mt-1 text-sm text-ink-400">
            {activeTab === "all" ? "You haven't posted any jobs yet." : `No ${STATUS_LABEL[activeTab as JobStatus] ?? activeTab} jobs.`}
          </p>
          <Button className="mt-5" size="sm" icon={<PlusCircle className="h-4 w-4" />} iconPosition="left"
            onClick={() => navigate(ROUTES.CLIENT_POST_JOB)}>
            Post Your First Job
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredJobs.map((job) => (
            <div key={job.id} className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card transition-shadow hover:shadow-md">
              <div className="p-6">
                <div className="flex items-start justify-between gap-4">
                  {/* Left info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">{job.category}</span>
                      {job.subcategory && (
                        <span className="text-xs text-ink-400">› {job.subcategory}</span>
                      )}
                    </div>
                    <h3 className="text-base font-bold text-ink-900 truncate">{job.title}</h3>
                    <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
                      <span className="flex items-center gap-1">
                        <DollarSign className="h-3.5 w-3.5" />
                        {formatCurrency(job.budgetMin)}{job.priceType === "hourly" ? "/hr" : ""}
                      </span>
                      <span className="flex items-center gap-1 capitalize">
                        <Briefcase className="h-3.5 w-3.5" />
                        {job.experienceLevel}
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
                        <Calendar className="h-3.5 w-3.5" />
                        {formatRelativeTime(job.createdAt ?? job.postedAt ?? "")}
                      </span>
                    </div>
                  </div>

                  {/* Right: status + actions */}
                  <div className="flex flex-col items-end gap-3 shrink-0">
                    <Badge tone={STATUS_TONE[job.status]} dot>
                      {STATUS_LABEL[job.status]}
                    </Badge>
                    <div className="flex items-center gap-1.5">
                      {job.status === "draft" && (
                        <button onClick={() => publishMutation.mutate(job.id)}
                          disabled={publishMutation.isPending}
                          title="Publish job"
                          className="flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-semibold bg-brand-600 text-white hover:bg-brand-700 transition-colors disabled:opacity-50">
                          <Rocket className="h-3.5 w-3.5" />Publish
                        </button>
                      )}
                      <button onClick={() => openEdit(job)} title="Edit job"
                        className="rounded-lg p-2 hover:bg-surface-muted text-ink-500 transition-colors">
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button onClick={() => duplicateMutation.mutate(job)} title="Duplicate job"
                        disabled={duplicateMutation.isPending}
                        className="rounded-lg p-2 hover:bg-surface-muted text-ink-500 transition-colors disabled:opacity-50">
                        <Copy className="h-4 w-4" />
                      </button>
                      {(job.status === "open" || job.status === "in_progress") && (
                        <button onClick={() => closeMutation.mutate(job.id)} title="Close job"
                          disabled={closeMutation.isPending}
                          className="rounded-lg p-2 hover:bg-amber-50 text-amber-500 transition-colors disabled:opacity-50">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <button onClick={() => deleteMutation.mutate(job.id)} title="Delete job"
                        disabled={deleteMutation.isPending}
                        className="rounded-lg p-2 hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50">
                        {deleteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                      </button>
                    </div>
                  </div>
                </div>

                {/* Description preview */}
                <p className="mt-3 text-sm text-ink-600 line-clamp-2">{job.description}</p>

                {/* Skills */}
                {job.skills?.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {job.skills.slice(0, 6).map((s) => (
                      <Badge key={s} tone="neutral">{s}</Badge>
                    ))}
                    {job.skills.length > 6 && <Badge tone="neutral">+{job.skills.length - 6}</Badge>}
                  </div>
                )}

                {/* Expand toggle */}
                <button onClick={() => setExpandedId(expandedId === job.id ? null : job.id)}
                  className="mt-4 flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700">
                  {expandedId === job.id
                    ? <><ChevronUp className="h-4 w-4" /> Hide Details</>
                    : <><ChevronDown className="h-4 w-4" /> View Details</>}
                </button>
              </div>

              {/* Expanded details */}
              {expandedId === job.id && (
                <div className="border-t border-surface-border bg-surface-muted px-6 py-4 space-y-6">
                  {/* Job details grid */}
                  <div className="grid grid-cols-2 gap-4 text-sm sm:grid-cols-4">
                    <div>
                      <p className="text-xs font-bold uppercase text-ink-400 mb-1">Duration</p>
                      <p className="text-ink-700 font-medium">{job.duration}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-ink-400 mb-1">Work Type</p>
                      <p className="text-ink-700 font-medium capitalize">{job.workType ?? "Remote"}</p>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-ink-400 mb-1">Visibility</p>
                      <Badge tone={job.visibility === "private" ? "neutral" : "success"} className="capitalize">
                        {job.visibility ?? "public"}
                      </Badge>
                    </div>
                    <div>
                      <p className="text-xs font-bold uppercase text-ink-400 mb-1">Deadline</p>
                      <p className="text-ink-700 font-medium">
                        {job.deadline ? new Date(job.deadline).toLocaleDateString() : "—"}
                      </p>
                    </div>
                  </div>

                  {/* Applications Section */}
                  <div className="pt-4 border-t border-surface-border">
                    <button
                      onClick={() => setShowAppsId(showAppsId === job.id ? null : job.id)}
                      className="flex items-center gap-2 text-sm font-bold text-brand-600 hover:text-brand-700 mb-3"
                    >
                      {showAppsId === job.id ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      Applications ({job.proposalsCount ?? 0})
                    </button>

                    {showAppsId === job.id && (
                      <div className="space-y-3 mt-3">
                        {job.proposalsCount === 0 || jobProposals.length === 0 ? (
                          <p className="text-sm text-ink-500">No applications yet for this job.</p>
                        ) : (
                          jobProposals.map((proposal: any) => (
                            <div
                              key={proposal.id}
                              className="rounded-lg border border-surface-border bg-surface-card p-4 flex items-start justify-between gap-3"
                            >
                              <div className="flex gap-3 flex-1 min-w-0">
                                <Avatar
                                  src={(proposal.freelancer as any)?.avatar}
                                  name={(proposal.freelancer as any)?.fullName}
                                  size="sm"
                                />
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-semibold text-ink-900">
                                    {(proposal.freelancer as any)?.fullName}
                                  </p>
                                  <div className="flex items-center gap-2 mt-0.5">
                                    {((proposal.freelancer as any)?.rating ?? 0) > 0 && (
                                      <>
                                        <span className="flex items-center gap-1 text-xs text-ink-600">
                                          <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                                          {(proposal.freelancer as any)?.rating?.toFixed(1)} ({(proposal.freelancer as any)?.reviewCount} reviews)
                                        </span>
                                      </>
                                    )}
                                  </div>
                                  <p className="text-xs text-ink-500 mt-1 truncate">
                                    Bid: {formatCurrency((proposal as any)?.bidAmount)} • Delivery: {(proposal as any)?.estimatedDelivery}
                                  </p>
                                </div>
                              </div>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <Badge
                                  tone={
                                    proposal.status === "accepted"
                                      ? "success"
                                      : proposal.status === "rejected"
                                      ? "danger"
                                      : proposal.status === "shortlisted"
                                      ? "warning"
                                      : "info"
                                  }
                                  className="text-xs"
                                >
                                  {proposal.status === "submitted"
                                    ? "Pending"
                                    : proposal.status.charAt(0).toUpperCase() + proposal.status.slice(1)}
                                </Badge>

                                {proposal.status === "submitted" && (
                                  <div className="flex gap-1">
                                    <button
                                      onClick={() => acceptProposalMutation.mutate(proposal.id)}
                                      disabled={acceptProposalMutation.isPending}
                                      className="p-1.5 rounded-lg bg-emerald-50 text-emerald-600 hover:bg-emerald-100 transition-colors disabled:opacity-50"
                                      title="Accept proposal"
                                    >
                                      <CheckCircle2 className="h-4 w-4" />
                                    </button>
                                    <button
                                      onClick={() => rejectProposalMutation.mutate(proposal.id)}
                                      disabled={rejectProposalMutation.isPending}
                                      className="p-1.5 rounded-lg bg-red-50 text-red-600 hover:bg-red-100 transition-colors disabled:opacity-50"
                                      title="Reject proposal"
                                    >
                                      <XCircle className="h-4 w-4" />
                                    </button>
                                  </div>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ══════════════════ EDIT MODAL ══════════════════ */}
      {editState && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-xl rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card max-h-[90vh] overflow-y-auto">
            <button onClick={() => setEditState(null)}
              className="absolute right-4 top-4 rounded-xl p-1.5 hover:bg-surface-muted text-ink-400 hover:text-ink-600">
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-extrabold text-ink-900 mb-5">Edit Job</h3>

            <div className="space-y-4">
              <Input label="Job Title *" value={editState.title}
                onChange={(e) => setEditState({ ...editState, title: e.target.value })} />

              <div className="grid grid-cols-2 gap-4">
                <Select label="Category" value={editState.category}
                  onChange={(e) => setEditState({ ...editState, category: e.target.value })}>
                  {CATEGORIES.filter((c) => c !== "All Categories").map((c) => <option key={c}>{c}</option>)}
                </Select>
                <Select label="Visibility" value={editState.visibility}
                  onChange={(e) => setEditState({ ...editState, visibility: e.target.value as "public" | "private" })}>
                  <option value="public">Public</option>
                  <option value="private">Private</option>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <Input label="Min Budget (₹)" type="number" min={0}
                  value={editState.budgetMin}
                  onChange={(e) => setEditState({ ...editState, budgetMin: Number(e.target.value) })} />
                <Input label="Max Budget (₹)" type="number" min={0}
                  value={editState.budgetMax}
                  onChange={(e) => setEditState({ ...editState, budgetMax: Number(e.target.value) })} />
              </div>

              <Select label="Experience Level" value={editState.experience}
                onChange={(e) => setEditState({ ...editState, experience: e.target.value as ExperienceLevel })}>
                <option value="entry">Entry</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </Select>

              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Description</label>
                <textarea value={editState.description} rows={7}
                  onChange={(e) => setEditState({ ...editState, description: e.target.value })}
                  className="w-full rounded-xl border border-surface-border bg-surface-card p-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-none" />
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" onClick={() => setEditState(null)}>Cancel</Button>
                <Button onClick={handleUpdateSubmit} isLoading={updateMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

    </DashboardLayout>
  );
}
