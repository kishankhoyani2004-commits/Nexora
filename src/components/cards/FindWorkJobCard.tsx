import { useNavigate } from "react-router-dom";
import {
  Bookmark, Star, ShieldCheck, MapPin, Clock, Users,
  Zap, ArrowRight, Building2,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import type { Job } from "@/types";

// ── Helpers ───────────────────────────────────────────────────────────────

function matchColor(pct: number) {
  if (pct >= 85) return "bg-emerald-100 text-emerald-700 border-emerald-200";
  if (pct >= 65) return "bg-amber-100 text-amber-700 border-amber-200";
  return "bg-surface-muted text-ink-500 border-surface-border";
}

function workTypeTone(wt?: string): "success" | "info" | "warning" | "neutral" {
  if (wt === "remote")  return "success";
  if (wt === "hybrid")  return "info";
  if (wt === "onsite")  return "warning";
  return "neutral";
}

function StarRating({ rating }: { rating: number }) {
  const full  = Math.floor(rating);
  const half  = rating - full >= 0.5;
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((i) => (
        <Star
          key={i}
          className={cn(
            "h-3 w-3",
            i <= full
              ? "fill-amber-400 text-amber-400"
              : i === full + 1 && half
              ? "fill-amber-200 text-amber-400"
              : "fill-surface-muted text-ink-300"
          )}
        />
      ))}
    </span>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────

export interface FindWorkJobCardProps {
  job:        Job;
  matchScore?: number;
  isSaved?:   boolean;
  onSave?:    (jobId: string) => void;
  /** "grid" (default) | "list" */
  variant?:   "grid" | "list";
  /** Extra action rendered beside Apply — e.g. "Hide" for recommended page */
  extraAction?: React.ReactNode;
  className?: string;
}

// ── Component ─────────────────────────────────────────────────────────────

export function FindWorkJobCard({
  job,
  matchScore,
  isSaved = false,
  onSave,
  variant = "grid",
  extraAction,
  className,
}: FindWorkJobCardProps) {
  const navigate = useNavigate();

  const budgetLabel =
    job.priceType === "hourly"
      ? `${formatCurrency(job.budgetMin)}/hr`
      : `${formatCurrency(job.budgetMin)} – ${formatCurrency(job.budgetMax)}`;

  const postedDate = job.createdAt || job.postedAt;

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't navigate if a button inside was clicked
    if ((e.target as HTMLElement).closest("button,a")) return;
    navigate(`/jobs/${job.id}`);
  };

  // ── List variant ─────────────────────────────────────────────────────────
  if (variant === "list") {
    return (
      <div
        onClick={handleCardClick}
        className={cn(
          "group relative flex cursor-pointer flex-col gap-4 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card",
          "transition-all duration-150 hover:border-brand-400 hover:shadow-pop sm:flex-row sm:items-start",
          className
        )}
      >
        {/* Left accent */}
        <div className="absolute left-0 top-5 bottom-5 w-1 rounded-full bg-brand-500 opacity-0 transition-opacity group-hover:opacity-100" />

        {/* Avatar */}
        <div className="shrink-0">
          <Avatar
            name={job.client?.fullName ?? job.company ?? "Client"}
            src={job.client?.avatar}
            size="lg"
          />
        </div>

        {/* Body */}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-ink-900 group-hover:text-brand-600 transition-colors">
                {job.title}
              </h3>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-ink-500">
                <span className="flex items-center gap-1">
                  <Building2 className="h-3 w-3" />
                  {job.client?.fullName ?? job.company ?? "Client"}
                </span>
                {job.clientRating != null && job.clientRating > 0 && (
                  <span className="flex items-center gap-1">
                    <StarRating rating={job.clientRating} />
                    <span>{job.clientRating.toFixed(1)}</span>
                  </span>
                )}
                {job.paymentVerified && (
                  <span className="flex items-center gap-1 text-emerald-600">
                    <ShieldCheck className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2">
              {matchScore != null && (
                <span className={cn("rounded-full border px-2.5 py-0.5 text-[11px] font-bold", matchColor(matchScore))}>
                  {matchScore}% match
                </span>
              )}
              <button
                onClick={(e) => { e.stopPropagation(); onSave?.(job.id); }}
                aria-label={isSaved ? "Unsave job" : "Save job"}
                className={cn(
                  "flex h-8 w-8 items-center justify-center rounded-lg transition-colors",
                  isSaved ? "bg-brand-100 text-brand-600" : "bg-surface-muted text-ink-400 hover:text-brand-600"
                )}
              >
                <Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
              </button>
            </div>
          </div>

          <p className="mt-2 line-clamp-2 text-sm text-ink-500">{job.description}</p>

          <div className="mt-3 flex flex-wrap gap-1.5">
            {(job.skills ?? []).slice(0, 4).map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
            {(job.skills ?? []).length > 4 && <Badge tone="neutral">+{(job.skills ?? []).length - 4}</Badge>}
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs text-ink-500">
              <span className="font-bold text-ink-900">{budgetLabel}</span>
              <span>·</span>
              <span className="capitalize">{job.experienceLevel}</span>
              <span>·</span>
              <span>{job.duration}</span>
              {job.location && (
                <><span>·</span><span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{job.location}</span></>
              )}
              {job.workType && <Badge tone={workTypeTone(job.workType)} className="capitalize">{job.workType}</Badge>}
              {job.proposalsCount != null && (
                <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.proposalsCount} proposals</span>
              )}
              {postedDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelativeTime(postedDate)}</span>}
            </div>
            <div className="flex items-center gap-2">
              {extraAction}
              <Button size="sm" variant="primary" icon={<ArrowRight className="h-3.5 w-3.5" />}
                onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}/proposal`); }}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Grid variant (default) ────────────────────────────────────────────────
  return (
    <div
      onClick={handleCardClick}
      className={cn(
        "group relative flex cursor-pointer flex-col rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card",
        "transition-all duration-150 hover:border-brand-400 hover:shadow-pop hover:-translate-y-0.5",
        className
      )}
    >
      {/* Top row */}
      <div className="mb-3 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <Avatar
            name={job.client?.fullName ?? job.company ?? "Client"}
            src={job.client?.avatar}
            size="sm"
          />
          <div className="min-w-0">
            <p className="text-xs font-semibold text-ink-700 truncate">
              {job.client?.fullName ?? job.company ?? "Client"}
            </p>
            <div className="flex items-center gap-1.5 text-[11px] text-ink-400">
              {job.clientRating != null && job.clientRating > 0 && (
                <><StarRating rating={job.clientRating} /><span>{job.clientRating.toFixed(1)}</span></>
              )}
              {job.paymentVerified && (
                <span className="flex items-center gap-0.5 text-emerald-600">
                  <ShieldCheck className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {matchScore != null && (
            <span className={cn("rounded-full border px-2 py-0.5 text-[11px] font-bold", matchColor(matchScore))}>
              {matchScore}%
            </span>
          )}
          <button
            onClick={(e) => { e.stopPropagation(); onSave?.(job.id); }}
            aria-label={isSaved ? "Unsave job" : "Save job"}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-lg transition-colors",
              isSaved ? "bg-brand-100 text-brand-600" : "text-ink-300 hover:text-brand-600 hover:bg-brand-50"
            )}
          >
            <Bookmark className="h-4 w-4" fill={isSaved ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Title */}
      <h3 className="mb-1 font-bold text-ink-900 leading-snug group-hover:text-brand-600 transition-colors line-clamp-2">
        {job.title}
      </h3>

      {/* Description */}
      <p className="mb-3 line-clamp-2 text-xs text-ink-500 flex-1">{job.description}</p>

      {/* Skills */}
      <div className="mb-3 flex flex-wrap gap-1.5">
        {(job.skills ?? []).slice(0, 3).map((s) => <Badge key={s} tone="neutral">{s}</Badge>)}
        {(job.skills ?? []).length > 3 && <Badge tone="neutral">+{(job.skills ?? []).length - 3}</Badge>}
      </div>

      {/* Meta grid */}
      <div className="mb-3 grid grid-cols-3 gap-2 rounded-xl bg-surface-muted p-3 text-center text-[11px]">
        <div className="min-w-0">
          <p className="uppercase tracking-wide text-ink-400">Budget</p>
          <p className="mt-0.5 font-bold text-ink-900 text-xs truncate">{budgetLabel}</p>
        </div>
        <div className="border-x border-surface-border min-w-0">
          <p className="uppercase tracking-wide text-ink-400">Level</p>
          <p className="mt-0.5 font-bold text-ink-900 capitalize text-xs truncate">{job.experienceLevel}</p>
        </div>
        <div className="min-w-0">
          <p className="uppercase tracking-wide text-ink-400">Duration</p>
          <p className="mt-0.5 font-bold text-ink-900 text-xs leading-tight truncate">{job.duration}</p>
        </div>
      </div>

      {/* Footer row */}
      <div className="flex items-center justify-between gap-2 border-t border-surface-border pt-3 mt-auto">
        <div className="flex flex-col gap-0.5 text-[11px] text-ink-400">
          <div className="flex items-center gap-2 flex-wrap">
            {job.workType && <Badge tone={workTypeTone(job.workType)} className="capitalize text-[10px]">{job.workType}</Badge>}
            {job.proposalsCount != null && (
              <span className="flex items-center gap-1"><Users className="h-3 w-3" />{job.proposalsCount}</span>
            )}
            {postedDate && <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{formatRelativeTime(postedDate)}</span>}
          </div>
          {job.deadline && (
            <span className="text-amber-600 flex items-center gap-1">
              <Zap className="h-3 w-3" />
              Deadline {new Date(job.deadline).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          {extraAction}
          <Button size="sm" variant="primary"
            onClick={(e) => { e.stopPropagation(); navigate(`/jobs/${job.id}/proposal`); }}>
            Apply
          </Button>
        </div>
      </div>
    </div>
  );
}
