import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Bookmark, Search, ArrowRight, Clock, Zap, TrendingUp, CheckCircle2,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FindWorkJobCard } from "@/components/cards/FindWorkJobCard";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { savedJobService } from "@/services/savedJob.service";
import { jobService } from "@/services/job.service";
import { cn } from "@/utils/cn";
import { ROUTES } from "@/constants/routes";
import type { SavedJobItem } from "@/types";

// ── Sort tab config ────────────────────────────────────────────────────────

const SORT_TABS: { id: string; label: string; icon: React.ElementType }[] = [
  { id: "recent",   label: "Recently Saved", icon: Clock      },
  { id: "budget",   label: "Highest Budget", icon: TrendingUp },
  { id: "expiring", label: "Expiring Soon",  icon: Zap        },
];

// ── Helpers ────────────────────────────────────────────────────────────────

function daysUntilDeadline(deadline?: string): number | null {
  if (!deadline) return null;
  const diff = new Date(deadline).getTime() - Date.now();
  return Math.ceil(diff / 86_400_000);
}

function computeMatch(job: any, userSkills: string[]): number {
  const jobSkills = job.skills ?? [];
  if (!userSkills.length || !jobSkills.length) return 65;
  const hits = jobSkills.filter((s: string) =>
    userSkills.some((us) => us.toLowerCase() === s.toLowerCase())
  ).length;
  return Math.min(99, Math.round((hits / jobSkills.length) * 100) + 40);
}

// ── Component ──────────────────────────────────────────────────────────────

export default function SavedJobs() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { notify }  = useNotification();

  const [sortBy, setSortBy] = useState("recent");
  const userSkills = user?.skills ?? [];

  // ── Fetch saved jobs ─────────────────────────────────────────────────
  const { data: res, isLoading } = useQuery({
    queryKey: ["savedJobs", sortBy],
    queryFn:  () => savedJobService.list(sortBy),
    staleTime: 30_000,
  });

  const items: SavedJobItem[] = (res?.data?.data as any)?.items ?? [];

  // ── Unsave mutation ──────────────────────────────────────────────────
  const unsaveMutation = useMutation({
    mutationFn: (jobId: string) => savedJobService.unsave(jobId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedJobs"] });
      queryClient.invalidateQueries({ queryKey: ["savedJobIds"] });
      notify("Job removed from saved.", "info");
    },
    onError: () => notify("Failed to remove job.", "error"),
  });

  // Saved IDs set — all items here are saved, so we always show filled bookmark
  const savedIds = new Set(items.map((i) => i.job.id));

  const handleSave = (jobId: string) => {
    // On the saved-jobs page, save toggle always means unsave
    unsaveMutation.mutate(jobId);
  };

  return (
    <DashboardLayout searchPlaceholder="Search jobs…">
      <div className="mx-auto max-w-screen-xl space-y-6 pb-12">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-pop">
                <Bookmark className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-500">
                Find Work
              </span>
            </div>
            <h1 className="text-2xl font-bold text-ink-900">Saved Jobs</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              Your bookmarked opportunities in one place
            </p>
          </div>
          <Button
            variant="ghost" size="sm"
            icon={<ArrowRight className="h-4 w-4" />}
            onClick={() => navigate(ROUTES.JOBS)}
          >
            Browse more jobs
          </Button>
        </div>

        {/* ── Sort tabs ───────────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2" role="tablist">
          {SORT_TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              role="tab"
              aria-selected={sortBy === id}
              onClick={() => setSortBy(id)}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-xs font-semibold transition-all",
                sortBy === id
                  ? "border-brand-600 bg-brand-600 text-white shadow-[0_4px_14px_-4px_rgba(99,102,241,0.5)]"
                  : "border-surface-border bg-surface-card text-ink-500 hover:border-brand-400 hover:text-brand-600"
              )}
            >
              <Icon className="h-3.5 w-3.5" />
              {label}
            </button>
          ))}
        </div>

        {/* ── Loading skeletons ─────────────────────────────────────── */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-surface-border bg-surface-card p-5 animate-pulse space-y-3">
                <div className="h-4 w-3/4 rounded bg-surface-muted" />
                <div className="h-3 w-1/2 rounded bg-surface-muted" />
                <div className="h-16 w-full rounded bg-surface-muted" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!isLoading && items.length === 0 && (
          <EmptyState
            icon={Bookmark}
            title="No saved jobs yet"
            description="Browse jobs and click the bookmark icon to save opportunities you're interested in."
            action={
              <Button onClick={() => navigate(ROUTES.JOBS)}>
                Browse Jobs
              </Button>
            }
          />
        )}

        {/* ── Results count ─────────────────────────────────────────── */}
        {!isLoading && items.length > 0 && (
          <p className="text-sm text-ink-500">
            <span className="font-bold text-brand-600">{items.length}</span> saved job{items.length !== 1 ? "s" : ""}
          </p>
        )}

        {/* ── Job cards ─────────────────────────────────────────────── */}
        {!isLoading && items.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(({ savedId, savedAt, job }) => {
              const match    = computeMatch(job, userSkills);
              const daysLeft = daysUntilDeadline(job.deadline);
              const isExpiringSoon = daysLeft !== null && daysLeft <= 7 && daysLeft >= 0;
              const isExpired      = daysLeft !== null && daysLeft < 0;

              return (
                <div key={savedId} className="relative">
                  {/* Expiring warning banner */}
                  {(isExpiringSoon || isExpired) && (
                    <div className={cn(
                      "flex items-center gap-2 rounded-t-2xl border-x border-t px-4 py-2",
                      isExpired
                        ? "border-red-200 bg-red-50 text-red-700 dark:border-red-900/40 dark:bg-red-900/10"
                        : "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/10"
                    )}>
                      <Zap className="h-3.5 w-3.5 shrink-0" />
                      <p className="text-xs font-semibold">
                        {isExpired ? "Deadline passed" : `Expires in ${daysLeft} day${daysLeft !== 1 ? "s" : ""}`}
                      </p>
                    </div>
                  )}

                  <FindWorkJobCard
                    job={job}
                    matchScore={match}
                    isSaved={true}
                    onSave={handleSave}
                    className={cn(
                      (isExpiringSoon || isExpired) && "rounded-t-none border-t-0"
                    )}
                    extraAction={
                      <div className="flex flex-col items-end gap-0.5">
                        <span className="text-[10px] text-ink-400">
                          Saved {new Date(savedAt).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                        </span>
                        {job.status === "closed" && (
                          <span className="text-[10px] font-semibold text-red-500">Closed</span>
                        )}
                      </div>
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
