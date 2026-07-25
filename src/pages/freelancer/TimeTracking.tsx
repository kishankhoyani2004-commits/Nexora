import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Clock, Loader2, ChevronRight, Inbox } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { FREELANCER_NAV } from "@/constants/nav";
import { workspaceService } from "@/services/workspace.service";
import { formatRelativeTime } from "@/utils/formatters";
import type { MyTimeLogItem } from "@/types";

function formatDuration(seconds: number) {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  return `${hours}h ${minutes}m`;
}

const STATUS_TONE = {
  logged: "info" as const,
  billed: "brand" as const,
  paid: "success" as const,
};

export default function FreelancerTimeTracking() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["myTimeLogs"],
    queryFn: () => workspaceService.listMyTimeLogs(),
  });

  const items: MyTimeLogItem[] = res?.data.data ?? [];

  const filtered = items.filter(({ contract }) =>
    contract?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalSeconds = filtered.reduce((sum, { timeLog }) => sum + (timeLog.duration || 0), 0);

  return (
    <DashboardLayout navItems={FREELANCER_NAV} tagline="Workbase">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Clock className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-extrabold text-ink-900">Time Tracking</h1>
          </div>
          <p className="mt-2 text-base text-ink-500">
            Every logged session across all your projects, in one place.
          </p>
        </div>

        {/* Summary + Search */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="rounded-xl border border-surface-border bg-surface-card px-4 py-2 text-sm">
            <span className="text-ink-500">Total logged: </span>
            <span className="font-bold text-brand-600">{formatDuration(totalSeconds)}</span>
          </div>
          <input
            type="text"
            placeholder="Search by project..."
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
            <p className="text-base font-semibold text-ink-900">No time logs yet</p>
            <p className="max-w-sm text-sm text-ink-500">
              {searchQuery ? "Try a different search term." : "Sessions you track or log inside a project's workspace will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card">
            <div className="divide-y divide-surface-border">
              {filtered.map(({ timeLog, contract }) => (
                <div key={timeLog.id} className="flex items-center gap-4 p-4 hover:bg-surface-muted/50 transition-colors">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-brand-600">
                    <Clock className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-ink-900">{contract?.title || "—"}</p>
                      <Badge tone={STATUS_TONE[timeLog.status]}>{timeLog.status}</Badge>
                    </div>
                    <p className="truncate text-xs text-ink-500">{timeLog.notes || "No notes"}</p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-xs font-semibold text-ink-700">{formatDuration(timeLog.duration || 0)}</p>
                    <p className="text-[11px] text-ink-400">{formatRelativeTime(timeLog.createdAt)}</p>
                  </div>
                  {contract?.id && (
                    <button
                      title="Open Workspace"
                      onClick={() => navigate(`/workspace/${contract.id}?tab=TimeTracking`)}
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-surface-border text-ink-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
