import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Package, Loader2, ChevronRight, Inbox, Link2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { FREELANCER_NAV } from "@/constants/nav";
import { workspaceService } from "@/services/workspace.service";
import { formatRelativeTime } from "@/utils/formatters";
import type { MyDeliverableItem } from "@/types";

const STATUS_TONE = {
  pending: "info" as const,
  approved: "success" as const,
  rejected: "danger" as const,
};

export default function FreelancerDeliverables() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["myDeliverables"],
    queryFn: () => workspaceService.listMyDeliverables(),
  });

  const items: MyDeliverableItem[] = res?.data.data ?? [];

  const filtered = items.filter(({ deliverable, contract }) =>
    deliverable.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout navItems={FREELANCER_NAV} tagline="Workbase">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Package className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-extrabold text-ink-900">Deliverables</h1>
          </div>
          <p className="mt-2 text-base text-ink-500">
            Every deliverable version you've uploaded, across all your projects.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by deliverable name or project..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm placeholder-ink-400 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-surface-border bg-surface-muted/40 py-20 text-center">
            <Inbox className="h-12 w-12 text-ink-300" />
            <p className="text-base font-semibold text-ink-900">No deliverables yet</p>
            <p className="max-w-sm text-sm text-ink-500">
              {searchQuery ? "Try a different search term." : "Deliverable versions uploaded inside a project's workspace will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card">
            <div className="divide-y divide-surface-border">
              {filtered.map(({ deliverable, contract }) => (
                <div key={deliverable.id} className="flex items-center gap-4 p-4 hover:bg-surface-muted/50 transition-colors">
                  <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-brand-600">
                    <Package className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-bold text-ink-900">{deliverable.name}</p>
                      <Badge tone={STATUS_TONE[deliverable.status]}>{deliverable.status}</Badge>
                    </div>
                    <p className="truncate text-xs text-ink-500">
                      {contract?.title || "—"} · v{deliverable.version}
                    </p>
                  </div>
                  <div className="hidden shrink-0 text-right sm:block">
                    <p className="text-xs font-semibold text-ink-700">{deliverable.fileSize}</p>
                    <p className="text-[11px] text-ink-400">{formatRelativeTime(deliverable.createdAt)}</p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {deliverable.liveSiteUrl && (
                      <a
                        href={deliverable.liveSiteUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        title="Open Link"
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border text-ink-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                      >
                        <Link2 className="h-4 w-4" />
                      </a>
                    )}
                    {contract?.id && (
                      <button
                        title="Open Workspace"
                        onClick={() => navigate(`/workspace/${contract.id}?tab=Deliverables`)}
                        className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border text-ink-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                      >
                        <ChevronRight className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
