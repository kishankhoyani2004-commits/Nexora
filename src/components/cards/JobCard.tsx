import { Link } from "react-router-dom";
import { Bookmark, Star, ShieldCheck } from "lucide-react";
import type { Job } from "@/types";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/utils/formatters";
import { initials } from "@/utils/formatters";

export function JobCard({ job }: { job: Job }) {
  const budgetLabel =
    job.priceType === "hourly"
      ? `${formatCurrency(job.budgetMin, { compact: true })}/hr`
      : `${formatCurrency(job.budgetMin, { compact: true })} - ${formatCurrency(job.budgetMax, { compact: true })}`;

  return (
    <div className="relative rounded-2xl border border-surface-border bg-surface-card p-6 pl-7 shadow-card before:absolute before:left-0 before:top-6 before:bottom-6 before:w-1 before:rounded-full before:bg-brand-500">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-surface-muted text-sm font-bold text-ink-700">
            {initials(job.company || job.client?.fullName || "Client")}
          </span>
          <div>
            <h3 className="text-base font-bold text-ink-900">{job.title}</h3>
            <div className="flex items-center gap-2 text-sm text-ink-500">
              {job.company || job.client?.fullName || "Client"}
              {job.aiVerified && (
                <Badge tone="brand" className="gap-1">
                  <ShieldCheck className="h-3 w-3" /> AI VERIFIED
                </Badge>
              )}
            </div>
          </div>
        </div>
        <button aria-label="Save job" className="text-ink-300 hover:text-brand-600">
          <Bookmark className="h-5 w-5" />
        </button>
      </div>

      <p className="mb-4 line-clamp-2 text-sm text-ink-500">{job.description}</p>

      <div className="mb-4 grid grid-cols-3 gap-3 rounded-xl bg-surface-muted p-3 text-center">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-400">Budget</p>
          <p className="text-sm font-bold text-ink-900">{budgetLabel}</p>
        </div>
        <div className="border-x border-surface-border">
          <p className="text-[11px] uppercase tracking-wide text-ink-400">Duration</p>
          <p className="text-sm font-bold text-ink-900">{job.duration}</p>
        </div>
        <div>
          <p className="text-[11px] uppercase tracking-wide text-ink-400">Experience</p>
          <p className="text-sm font-bold capitalize text-ink-900">{job.experienceLevel}</p>
        </div>
      </div>

      <div className="mb-4 flex flex-wrap gap-2">
        {(job.skills || []).slice(0, 3).map((skill) => (
          <Badge key={skill} tone="neutral">
            {skill}
          </Badge>
        ))}
        {(job.skills || []).length > 3 && <Badge tone="neutral">+{(job.skills || []).length - 3} more</Badge>}
      </div>

      <div className="flex items-center justify-between">
        {job.rating ? (
          <span className="flex items-center gap-1 text-sm font-semibold text-ink-900">
            <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
            {job.rating}
            <span className="font-normal text-ink-400">({job.reviewCount} reviews)</span>
          </span>
        ) : (
          <span />
        )}
        <Link to={`/jobs/${job.id}/proposal`}>
          <Button size="sm">Apply Now</Button>
        </Link>
      </div>
    </div>
  );
}
