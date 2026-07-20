import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Sparkles, Zap, RefreshCw, EyeOff, Search, ArrowRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FindWorkJobCard } from "@/components/cards/FindWorkJobCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { jobService } from "@/services/job.service";
import { savedJobService } from "@/services/savedJob.service";
import { cn } from "@/utils/cn";
import { ROUTES } from "@/constants/routes";
import type { RecommendedJob } from "@/services/job.service";

export default function RecommendedJobs() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { notify }  = useNotification();

  const [hidden, setHidden] = useState<Set<string>>(new Set());

  // ── Fetch recommendations ────────────────────────────────────────────
  const { data: res, isLoading, refetch, isRefetching } = useQuery({
    queryKey: ["recommendedJobs", user?.id ?? user?._id],
    queryFn:  () => jobService.getRecommended(20),
    staleTime: 120_000,
  });

  // ── Saved IDs ────────────────────────────────────────────────────────
  const { data: savedIdsRes } = useQuery({
    queryKey: ["savedJobIds"],
    queryFn:  () => savedJobService.getIds(),
    staleTime: 30_000,
  });
  const savedIds = new Set<string>((savedIdsRes?.data?.data as any) ?? []);

  // ── Save / unsave ────────────────────────────────────────────────────
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
    saveMutation.mutate({ id: jobId, saving: !savedIds.has(jobId) });
  };

  const handleHide = (jobId: string) => {
    setHidden((prev) => new Set([...prev, jobId]));
    notify("Recommendation hidden.", "info");
  };

  const allItems: RecommendedJob[] = (res?.data?.data as any)?.items ?? [];
  const visibleItems = allItems.filter((j) => !hidden.has(j.id));
  const userSkills   = user?.skills ?? [];

  return (
    <DashboardLayout searchPlaceholder="Search jobs…">
      <div className="mx-auto max-w-screen-xl space-y-6 pb-12">

        {/* ── Header ─────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-pop">
                <Sparkles className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-500">AI Powered</span>
            </div>
            <h1 className="text-2xl font-bold text-ink-900">Recommended Jobs</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              Personalised matches based on your skills, experience, and work history
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm"
              icon={<RefreshCw className={cn("h-4 w-4", isRefetching && "animate-spin")} />}
              iconPosition="left" onClick={() => refetch()}>
              Refresh
            </Button>
            <Button variant="ghost" size="sm" icon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.JOBS)}>
              Browse all jobs
            </Button>
          </div>
        </div>

        {/* ── Skills context banner ───────────────────────────────────── */}
        {userSkills.length > 0 && (
          <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-brand-200 bg-brand-50 px-5 py-3 dark:border-surface-border dark:bg-surface-muted">
            <Zap className="h-4 w-4 shrink-0 text-brand-600" />
            <span className="text-sm font-semibold text-brand-700">Matching on your skills:</span>
            <div className="flex flex-wrap gap-1.5">
              {userSkills.slice(0, 8).map((s) => (
                <Badge key={s} tone="brand">{s}</Badge>
              ))}
              {userSkills.length > 8 && <Badge tone="neutral">+{userSkills.length - 8} more</Badge>}
            </div>
            <button
              onClick={() => navigate(`${ROUTES.PROFILE}?tab=Skills`)}
              className="ml-auto text-xs font-semibold text-brand-600 hover:underline"
            >
              Update skills →
            </button>
          </div>
        )}

        {/* ── Loading skeletons ────────────────────────────────────────── */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-surface-border bg-surface-card p-5 animate-pulse space-y-3">
                <div className="h-4 w-3/4 rounded bg-surface-muted" />
                <div className="h-3 w-1/2 rounded bg-surface-muted" />
                <div className="h-16 w-full rounded bg-surface-muted" />
                <div className="h-8 w-full rounded bg-surface-muted" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ─────────────────────────────────────────────── */}
        {!isLoading && visibleItems.length === 0 && (
          <EmptyState
            icon={Search}
            title="No recommendations yet"
            description={
              userSkills.length === 0
                ? "Add skills to your profile so we can match you with the right jobs."
                : "No open jobs match your current skills. Check back soon or update your profile."
            }
            action={
              userSkills.length === 0
                ? <Button onClick={() => navigate(`${ROUTES.PROFILE}?tab=Skills`)}>Add Skills</Button>
                : <Button variant="outline" onClick={() => navigate(ROUTES.JOBS)}>Browse All Jobs</Button>
            }
          />
        )}

        {/* ── Results count ───────────────────────────────────────────── */}
        {!isLoading && visibleItems.length > 0 && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-ink-500">
              <span className="font-bold text-brand-600">{visibleItems.length}</span> recommendation{visibleItems.length !== 1 ? "s" : ""} for you
              {hidden.size > 0 && <span className="ml-2 text-ink-400">· {hidden.size} hidden</span>}
            </p>
            {hidden.size > 0 && (
              <button onClick={() => setHidden(new Set())} className="text-xs font-semibold text-brand-600 hover:underline">
                Show hidden
              </button>
            )}
          </div>
        )}

        {/* ── Job cards with AI reason banner ─────────────────────────── */}
        {!isLoading && visibleItems.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {visibleItems.map((job) => (
              <div key={job.id} className="flex flex-col gap-0">
                {/* AI reason banner */}
                <div className="flex items-start gap-2 rounded-t-2xl border-x border-t border-brand-200 bg-brand-50 px-4 py-2.5 dark:border-surface-border dark:bg-surface-muted">
                  <Sparkles className="mt-0.5 h-3.5 w-3.5 shrink-0 text-brand-500" />
                  <p className="text-xs text-brand-700 dark:text-ink-500 leading-relaxed">{job.matchReason}</p>
                </div>
                {/* Card — top corners flat to merge with banner */}
                <FindWorkJobCard
                  job={job}
                  matchScore={job.matchScore}
                  isSaved={savedIds.has(job.id)}
                  onSave={handleSave}
                  className="rounded-t-none border-t-0"
                  extraAction={
                    <button
                      onClick={(e) => { e.stopPropagation(); handleHide(job.id); }}
                      className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-ink-400 hover:bg-red-50 hover:text-red-500 transition-colors"
                      aria-label="Hide recommendation"
                      title="Hide this recommendation"
                    >
                      <EyeOff className="h-4 w-4" />
                    </button>
                  }
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
