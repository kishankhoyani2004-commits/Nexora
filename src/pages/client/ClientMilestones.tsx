import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Flag, Loader2, CheckCircle2, RotateCcw, ChevronRight, Inbox } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CLIENT_NAV } from "@/constants/nav";
import { useNotification } from "@/context/NotificationContext";
import { workspaceService } from "@/services/workspace.service";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import type { MyMilestoneItem, WorkspaceMilestone } from "@/types";

type FilterStatus = "all" | WorkspaceMilestone["status"];

const STATUS_BADGE: Record<WorkspaceMilestone["status"], { tone: "info" | "brand" | "warning" | "success" | "danger" | "neutral"; label: string }> = {
  pending: { tone: "info", label: "Pending" },
  in_progress: { tone: "brand", label: "In Progress" },
  submitted: { tone: "warning", label: "Awaiting Your Review" },
  approved: { tone: "success", label: "Approved" },
  rejected: { tone: "danger", label: "Rejected" },
  completed: { tone: "neutral", label: "Completed" },
};

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "submitted", label: "Awaiting Review" },
  { key: "in_progress", label: "In Progress" },
  { key: "approved", label: "Approved" },
  { key: "completed", label: "Completed" },
];

export default function ClientMilestones() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotification();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [feedbackTarget, setFeedbackTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["myMilestones"],
    queryFn: () => workspaceService.listMyMilestones(),
  });

  const items: MyMilestoneItem[] = res?.data.data ?? [];

  const filtered = items.filter(({ milestone, contract }) => {
    const matchesStatus = filterStatus === "all" || milestone.status === filterStatus;
    const matchesSearch =
      contract?.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      milestone.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      contract?.freelancer?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const reviewMutation = useMutation({
    mutationFn: ({ milestoneId, status, clientFeedback }: { milestoneId: string; status: "approved" | "rejected"; clientFeedback?: string }) =>
      workspaceService.reviewMilestone(milestoneId, status, clientFeedback),
    onSuccess: (_, { status }) => {
      queryClient.invalidateQueries({ queryKey: ["myMilestones"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["clientDashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["earnings"] });
      notify(
        status === "approved" ? "Milestone approved — payment released." : "Revision requested for this milestone.",
        status === "approved" ? "success" : "info"
      );
      setFeedbackTarget(null);
      setFeedback("");
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to update this milestone.", "error"),
  });

  return (
    <DashboardLayout navItems={CLIENT_NAV} tagline="Freelance Marketplace" searchPlaceholder="Search talents or projects...">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Flag className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-extrabold text-ink-900">Milestones</h1>
          </div>
          <p className="mt-2 text-base text-ink-500">
            Every milestone across all your contracts. Approve completed work to release payment, or request a revision.
          </p>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-surface-border bg-surface-muted p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  filterStatus === f.key ? "bg-surface-card text-brand-600 shadow-sm" : "text-ink-500 hover:text-ink-700"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by milestone, contract, or freelancer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm placeholder-ink-400 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-surface-border bg-surface-muted/40 py-20 text-center">
            <Inbox className="h-12 w-12 text-ink-300" />
            <p className="text-base font-semibold text-ink-900">No milestones found</p>
            <p className="max-w-sm text-sm text-ink-500">
              {searchQuery || filterStatus !== "all"
                ? "Try a different filter or search term."
                : "Milestones you create inside a project's workspace will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(({ milestone, contract }) => {
              const isFeedbackOpen = feedbackTarget === milestone.id;
              const isApproving = reviewMutation.isPending && reviewMutation.variables?.milestoneId === milestone.id && reviewMutation.variables?.status === "approved";
              const isRejecting = reviewMutation.isPending && reviewMutation.variables?.milestoneId === milestone.id && reviewMutation.variables?.status === "rejected";

              return (
                <div key={milestone.id} className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                  <div className="mb-3 flex items-start justify-between gap-4">
                    <div className="flex flex-1 min-w-0 gap-3">
                      <Avatar src={contract?.freelancer?.avatar} name={contract?.freelancer?.fullName || "Freelancer"} size="sm" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-base font-bold text-ink-900">{milestone.title}</h3>
                        <p className="text-sm text-ink-500">
                          {contract?.title || "—"} · <span className="font-semibold text-ink-700">{contract?.freelancer?.fullName}</span>
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge tone={STATUS_BADGE[milestone.status].tone}>{STATUS_BADGE[milestone.status].label}</Badge>
                      <span className="text-xs text-ink-400">Due {formatRelativeTime(milestone.dueDate)}</span>
                    </div>
                  </div>

                  {milestone.description && (
                    <p className="mb-3 text-sm text-ink-700 leading-relaxed">{milestone.description}</p>
                  )}

                  {milestone.status === "submitted" && milestone.submissionUrl && (
                    <div className="mb-3 rounded-lg border border-surface-border bg-surface-muted p-3 text-xs">
                      <span className="font-bold text-ink-500 uppercase">Submission: </span>
                      <a href={milestone.submissionUrl} target="_blank" rel="noopener noreferrer" className="font-semibold text-brand-600 hover:underline">
                        {milestone.submissionUrl}
                      </a>
                      {milestone.submissionText && <p className="mt-1 text-ink-700">{milestone.submissionText}</p>}
                    </div>
                  )}

                  <div className="mb-4 grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Budget</p>
                      <p className="mt-1 text-lg font-bold text-emerald-600">{formatCurrency(milestone.budget)}</p>
                    </div>
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Progress</p>
                      <div className="mt-2 h-2 w-full max-w-[120px] overflow-hidden rounded-full bg-surface-muted">
                        <div className="h-full rounded-full bg-brand-600" style={{ width: `${milestone.progress}%` }} />
                      </div>
                    </div>
                    <div className="flex items-end justify-end">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/workspace/${contract?.id}?tab=Milestones`)}
                        icon={<ChevronRight className="h-4 w-4" />}
                        iconPosition="right"
                      >
                        Open Workspace
                      </Button>
                    </div>
                  </div>

                  {isFeedbackOpen && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-amber-700">
                        What needs to change?
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                        placeholder="Describe the changes you'd like..."
                        className="w-full resize-none rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      />
                      <div className="mt-3 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setFeedbackTarget(null); setFeedback(""); }}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          isLoading={isRejecting}
                          disabled={!feedback.trim()}
                          onClick={() => reviewMutation.mutate({ milestoneId: milestone.id, status: "rejected", clientFeedback: feedback })}
                        >
                          Send Revision Request
                        </Button>
                      </div>
                    </div>
                  )}

                  {milestone.status === "submitted" && !isFeedbackOpen && (
                    <div className="flex gap-3 border-t border-surface-border pt-4">
                      <button
                        onClick={() => reviewMutation.mutate({ milestoneId: milestone.id, status: "approved" })}
                        disabled={reviewMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve & Release Payment
                      </button>
                      <button
                        onClick={() => setFeedbackTarget(milestone.id)}
                        disabled={reviewMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Request Revision
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
