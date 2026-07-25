import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  ShieldCheck, MapPin, Clock, Layers, Loader2,
  ArrowLeft, Users, Calendar, DollarSign, Eye,
  Sparkles, ChevronDown,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FREELANCER_NAV, CLIENT_NAV } from "@/constants/nav";
import { ROUTES } from "@/constants/routes";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobService } from "@/services/job.service";
import { contractService } from "@/services/contract.service";
import { proposalService } from "@/services/proposal.service";
import { aiService } from "@/services/ai.service";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { EmptyState } from "@/components/ui/EmptyState";
import { cn } from "@/utils/cn";

export default function JobDetails() {
  const { id }     = useParams<{ id: string }>();
  const navigate   = useNavigate();
  const { user }   = useAuth();
  const isClient   = user?.role === "client";
  const navItems   = isClient ? CLIENT_NAV : FREELANCER_NAV;

  const { data: response, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn:  async () => {
      const res = await jobService.getById(id!);
      return res.data;
    },
    enabled: !!id,
  });

  const job = response?.data;

  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const isOwner = isClient && (job?.client?.id === user?.id || job?.client === user?.id);

  // ── AI Match Score (freelancer view only) ─────────────────────────────────
  const { data: matchRes, isLoading: matchLoading } = useQuery({
    queryKey: ["ai-job-match", id],
    queryFn: () => aiService.jobMatchScore(id!),
    enabled: !!id && !isClient,
    staleTime: 5 * 60_000,
  });
  const match = matchRes?.data.data;

  const [showExplanation, setShowExplanation] = useState(false);
  const [explanation, setExplanation] = useState<string | null>(null);
  const [explaining, setExplaining] = useState(false);

  const handleExplainMatch = async () => {
    setShowExplanation((v) => !v);
    if (explanation || !id) return;
    setExplaining(true);
    try {
      const res = await aiService.explainJobMatch(id);
      setExplanation(res.data.data.content);
    } catch {
      setExplanation("Could not load AI explanation right now.");
    } finally {
      setExplaining(false);
    }
  };

  const { data: proposalsResponse } = useQuery({
    queryKey: ["job-proposals", id],
    queryFn: async () => {
      const res = await proposalService.listForJob(id!);
      return res.data;
    },
    enabled: !!id && !!isOwner,
  });

  const proposals = proposalsResponse?.data || [];

  const hireMutation = useMutation({
    mutationFn: (proposalId: string) => contractService.create(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["job", id] });
      queryClient.invalidateQueries({ queryKey: ["job-proposals", id] });
      notify("Proposal accepted! Active project created and escrow funded.", "success");
    },
    onError: (err: any) => {
      notify(err.response?.data?.message || "Failed to accept proposal.", "error");
    },
  });

  if (isLoading) {
    return (
      <DashboardLayout navItems={navItems} searchPlaceholder="Search for jobs...">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout navItems={navItems} searchPlaceholder="Search for jobs...">
        <EmptyState
          icon={ShieldCheck}
          title="Job not found"
          description="This job post does not exist or has been removed."
        />
      </DashboardLayout>
    );
  }

  // Build the apply URL: /jobs/:id/proposal
  const applyUrl = ROUTES.SUBMIT_PROPOSAL.replace(":id", id!);

  return (
    <DashboardLayout navItems={navItems} searchPlaceholder="Search for jobs...">
      {/* Back button */}
      <button
        onClick={() => navigate(-1)}
        className="mb-5 flex items-center gap-2 text-sm font-semibold text-ink-500 hover:text-ink-800 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Jobs
      </button>

      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">

        {/* ── Main content ── */}
        <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card lg:col-span-2">
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <Badge tone="brand" className="gap-1.5">
              <ShieldCheck className="h-3.5 w-3.5" /> Verified Job
            </Badge>
            <Badge
              tone={
                job.status === "open"        ? "success"
                : job.status === "in_progress" ? "brand"
                : job.status === "completed"   ? "info"
                : "neutral"
              }
              className="capitalize"
            >
              {job.status.replace("_", " ")}
            </Badge>
            {job.visibility === "private" && <Badge tone="warning">Private</Badge>}
          </div>

          <h1 className="text-2xl font-extrabold text-ink-900">{job.title}</h1>
          <p className="mt-1 text-sm text-ink-500">
            {job.client?.fullName || "Client"} · {job.category}
            {job.subcategory ? ` › ${job.subcategory}` : ""}
          </p>

          <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-500">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> {job.location || "Remote (Global)"}
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {job.duration}
            </span>
            <span className="flex items-center gap-1.5 capitalize">
              <Layers className="h-4 w-4" /> {job.experienceLevel}
            </span>
            {job.proposalsCount != null && (
              <span className="flex items-center gap-1.5">
                <Users className="h-4 w-4" /> {job.proposalsCount} proposals
              </span>
            )}
            {job.views != null && (
              <span className="flex items-center gap-1.5">
                <Eye className="h-4 w-4" /> {job.views} views
              </span>
            )}
            {job.createdAt && (
              <span className="flex items-center gap-1.5">
                <Calendar className="h-4 w-4" /> {formatRelativeTime(job.createdAt)}
              </span>
            )}
          </div>

          <div className="my-6 h-px bg-surface-border" />

          <h2 className="mb-3 text-sm font-bold uppercase tracking-wide text-ink-400">Project Description</h2>
          <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{job.description}</p>

          <h2 className="mb-3 mt-6 text-sm font-bold uppercase tracking-wide text-ink-400">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {(job.skills || []).map((skill) => (
              <Badge key={skill} tone="brand">{skill}</Badge>
            ))}
          </div>

          {job.deadline && (
            <>
              <div className="my-6 h-px bg-surface-border" />
              <div className="flex items-center gap-2 text-sm text-amber-600">
                <Calendar className="h-4 w-4" />
                <span className="font-semibold">
                  Deadline: {new Date(job.deadline).toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}
                </span>
              </div>
            </>
          )}

          {isOwner && (
            <div className="mt-8 border-t border-surface-border pt-8 space-y-6">
              <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
                <Users className="h-5 w-5 text-brand-600" />
                <span>Applications & Proposals Received ({proposals.length})</span>
              </h2>

              {proposals.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-surface-border p-6 text-center text-ink-500 text-xs">
                  No proposals submitted for this job post yet.
                </div>
              ) : (
                <div className="space-y-4">
                  {proposals.map((proposal: any) => {
                    const isAccepted = proposal.status === "accepted";
                    const proposalId = proposal.id || proposal._id;
                    return (
                      <div key={proposalId} className="rounded-2xl border border-surface-border p-5 bg-surface-card space-y-4 shadow-sm">
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-xs uppercase">
                              {proposal.freelancer?.fullName?.charAt(0) || "F"}
                            </div>
                            <div>
                              <p className="text-sm font-bold text-ink-900">{proposal.freelancer?.fullName || "Freelancer"}</p>
                              <p className="text-[10px] text-brand-600 font-semibold">{proposal.freelancer?.email}</p>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-sm font-extrabold text-brand-600">{formatCurrency(proposal.bidAmount)}</p>
                            <p className="text-[10px] text-ink-400 font-medium">Est. Delivery: {proposal.estimatedDelivery || "N/A"}</p>
                          </div>
                        </div>

                        <div className="text-xs text-ink-600 whitespace-pre-wrap bg-surface-muted p-3.5 rounded-xl border border-surface-border leading-relaxed">
                          {proposal.description}
                        </div>

                        {proposal.milestones && proposal.milestones.length > 0 && (
                          <div className="space-y-1.5 pl-2">
                            <p className="text-[10px] font-black uppercase text-ink-400 tracking-wider">Proposed Milestones</p>
                            {proposal.milestones.map((m: any, idx: number) => (
                              <div key={idx} className="flex justify-between items-center text-[11px] text-ink-600">
                                <span>• {m.name}</span>
                                <span className="font-semibold text-ink-700">{formatCurrency(m.amount)}</span>
                              </div>
                            ))}
                          </div>
                        )}

                        <div className="flex justify-end pt-2">
                          {isAccepted ? (
                            <Badge tone="success" className="font-bold">PROPOSAL ACCEPTED / HIRED</Badge>
                          ) : (
                            <Button
                              size="sm"
                              disabled={proposal.status === "rejected" || hireMutation.isPending}
                              onClick={() => hireMutation.mutate(proposalId)}
                              icon={hireMutation.isPending && hireMutation.variables === proposalId ? <Loader2 className="h-3 w-3 animate-spin" /> : undefined}
                            >
                              Accept Proposal & Hire
                            </Button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>

        {/* ── Sidebar ── */}
        <div className="space-y-5">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Budget</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-600">
              {job.priceType === "hourly"
                ? `${formatCurrency(job.budgetMin)}/hr`
                : job.budgetMax && job.budgetMax !== job.budgetMin
                  ? `${formatCurrency(job.budgetMin)} – ${formatCurrency(job.budgetMax)}`
                  : formatCurrency(job.budgetMin)}
            </p>
            <p className="mt-1 text-xs text-ink-400 capitalize">{job.priceType} price</p>

            <div className="my-4 h-px bg-surface-border" />

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-ink-600">
                <span>Experience</span>
                <span className="font-semibold capitalize text-ink-900">{job.experienceLevel}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Duration</span>
                <span className="font-semibold text-ink-900">{job.duration}</span>
              </div>
              <div className="flex justify-between text-ink-600">
                <span>Work Type</span>
                <span className="font-semibold capitalize text-ink-900">{job.workType || "Remote"}</span>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-3">
              {/* Only freelancers can apply; clients see a manage button */}
              {!isClient && job.status === "open" ? (
                <Button
                  fullWidth
                  onClick={() => navigate(applyUrl)}
                >
                  Apply Now
                </Button>
              ) : !isClient ? (
                <Button fullWidth variant="outline" disabled>
                  {job.status === "in_progress" ? "In Progress" : "Applications Closed"}
                </Button>
              ) : (
                <Button
                  fullWidth
                  variant="outline"
                  onClick={() => navigate(ROUTES.CLIENT_MY_JOBS)}
                >
                  Manage This Job
                </Button>
              )}
            </div>
          </div>

          {/* AI Match Score (freelancer view only) */}
          {!isClient && (
            <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
              <p className="mb-3 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">
                <Sparkles className="h-3.5 w-3.5 text-brand-600" /> AI Match Score
              </p>
              {matchLoading ? (
                <div className="flex items-center gap-2 text-sm text-ink-500">
                  <Loader2 className="h-4 w-4 animate-spin" /> Calculating…
                </div>
              ) : match ? (
                <>
                  <div className="flex items-center gap-3">
                    <span
                      className={cn(
                        "flex h-14 w-14 items-center justify-center rounded-full text-lg font-extrabold",
                        match.score >= 85 ? "bg-emerald-100 text-emerald-700" : match.score >= 60 ? "bg-amber-100 text-amber-700" : "bg-surface-muted text-ink-500"
                      )}
                    >
                      {match.score}%
                    </span>
                    <p className="flex-1 text-xs text-ink-600">{match.reason}</p>
                  </div>
                  {match.matchedSkills?.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {match.matchedSkills.map((s) => <Badge key={s} tone="success" className="text-[10px]">{s}</Badge>)}
                    </div>
                  )}
                  <button
                    onClick={handleExplainMatch}
                    className="mt-3 flex w-full items-center justify-between text-xs font-bold text-brand-600 hover:underline"
                  >
                    Why this match?
                    <ChevronDown className={cn("h-3.5 w-3.5 transition-transform", showExplanation && "rotate-180")} />
                  </button>
                  {showExplanation && (
                    <p className="mt-2 text-xs leading-relaxed text-ink-600">
                      {explaining ? "Analyzing…" : explanation}
                    </p>
                  )}
                </>
              ) : (
                <p className="text-xs text-ink-400">AI match score unavailable right now.</p>
              )}
            </div>
          )}

          {/* Client info card */}
          {job.client && (
            <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">About the Client</p>
              <div className="flex items-center gap-3">
                {job.client.avatar ? (
                  <img src={job.client.avatar} alt={job.client.fullName} className="h-10 w-10 rounded-full object-cover" />
                ) : (
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-700 font-bold text-sm">
                    {job.client.fullName?.charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <p className="text-sm font-bold text-ink-900">{job.client.fullName}</p>
                  <p className="text-xs text-ink-400">Job Poster</p>
                </div>
              </div>
              <div className="mt-3 flex items-center gap-1.5 text-xs text-ink-500">
                <DollarSign className="h-3.5 w-3.5" />
                <span>{job.proposalsCount ?? 0} proposals received</span>
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
