import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Flag, Loader2, ChevronRight, Inbox } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FREELANCER_NAV } from "@/constants/nav";
import { workspaceService } from "@/services/workspace.service";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import type { MyMilestoneItem, WorkspaceMilestone } from "@/types";

type FilterStatus = "all" | WorkspaceMilestone["status"];

const STATUS_BADGE: Record<WorkspaceMilestone["status"], { tone: "info" | "brand" | "warning" | "success" | "danger" | "neutral"; label: string }> = {
  pending: { tone: "info", label: "Pending" },
  in_progress: { tone: "brand", label: "In Progress" },
  submitted: { tone: "warning", label: "Awaiting Client Review" },
  approved: { tone: "success", label: "Approved" },
  rejected: { tone: "danger", label: "Rejected" },
  completed: { tone: "neutral", label: "Completed" },
};

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "pending", label: "Pending" },
  { key: "in_progress", label: "In Progress" },
  { key: "submitted", label: "Awaiting Review" },
  { key: "approved", label: "Approved" },
  { key: "completed", label: "Completed" },
];

export default function FreelancerMilestones() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

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
      contract?.client?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  return (
    <DashboardLayout navItems={FREELANCER_NAV} tagline="Workbase">
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
            Every milestone across all your projects, in one place.
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
            placeholder="Search by milestone, project, or client..."
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
                : "Milestones created inside a project's workspace will appear here."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map(({ milestone, contract }) => (
              <div key={milestone.id} className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                <div className="mb-3 flex items-start justify-between gap-4">
                  <div className="flex flex-1 min-w-0 gap-3">
                    <Avatar src={contract?.client?.avatar} name={contract?.client?.fullName || "Client"} size="sm" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-base font-bold text-ink-900">{milestone.title}</h3>
                      <p className="text-sm text-ink-500">
                        {contract?.title || "—"} · <span className="font-semibold text-ink-700">{contract?.client?.fullName}</span>
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

                {milestone.status === "rejected" && milestone.clientFeedback && (
                  <div className="mb-3 rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs">
                    <span className="font-bold uppercase tracking-wide text-amber-700">Client feedback: </span>
                    <span className="text-ink-700">{milestone.clientFeedback}</span>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
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
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
