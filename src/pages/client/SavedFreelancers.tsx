import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Search, Star, Bookmark, Send, UserCircle2, Loader2, Users,
  CheckCircle2, DollarSign, TrendingUp,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { InviteFreelancerModal } from "@/components/client/InviteFreelancerModal";
import { CLIENT_NAV } from "@/constants/nav";
import { useNotification } from "@/context/NotificationContext";
import { savedFreelancerService } from "@/services/savedFreelancer.service";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import type { SavedFreelancerItem } from "@/types";

type SortBy = "recent" | "rating" | "skills";

const SORT_OPTIONS: { key: SortBy; label: string }[] = [
  { key: "recent", label: "Recently Saved" },
  { key: "rating",  label: "Highest Rated"  },
  { key: "skills",  label: "Most Skills"    },
];

const AVAILABILITY_TONE: Record<string, "success" | "warning" | "neutral"> = {
  available:    "success",
  busy:         "warning",
  unavailable:  "neutral",
};

export default function SavedFreelancers() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const { notify }   = useNotification();

  const [searchQuery, setSearchQuery] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("recent");
  const [inviteTarget, setInviteTarget] = useState<{ id: string; name: string } | null>(null);

  const { data: res, isLoading } = useQuery({
    queryKey: ["savedFreelancers", searchQuery, sortBy],
    queryFn: () => savedFreelancerService.list({ search: searchQuery || undefined, sortBy }),
  });

  const items: SavedFreelancerItem[] = res?.data.data?.items ?? [];

  const unsaveMutation = useMutation({
    mutationFn: (freelancerId: string) => savedFreelancerService.unsave(freelancerId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["savedFreelancers"] });
      notify("Freelancer removed from saved.", "info");
    },
    onError: () => notify("Failed to remove freelancer.", "error"),
  });

  return (
    <DashboardLayout
      navItems={CLIENT_NAV}
      tagline="Freelance Marketplace"
      searchPlaceholder="Search talents or projects..."
    >
      <div className="mx-auto max-w-6xl">
        {/* ── Header ── */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Bookmark className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-extrabold text-ink-900">Saved Freelancers</h1>
          </div>
          <p className="mt-2 text-base text-ink-500">
            Talent you've bookmarked for future roles. Invite them to apply the moment you have an open job.
          </p>
        </div>

        {/* ── Search & Sort ── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="relative w-full sm:max-w-sm">
            <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, title, or skill..."
              className="h-11 w-full rounded-xl border border-surface-border bg-surface-card pl-10 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
            />
          </div>

          <div className="flex gap-1 overflow-x-auto rounded-xl border border-surface-border bg-surface-muted p-1">
            {SORT_OPTIONS.map((opt) => (
              <button
                key={opt.key}
                onClick={() => setSortBy(opt.key)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  sortBy === opt.key
                    ? "bg-surface-card text-brand-600 shadow-sm"
                    : "text-ink-500 hover:text-ink-700"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── Grid ── */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-surface-border bg-surface-muted/40 py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <Users className="h-6 w-6" />
            </span>
            <p className="text-base font-semibold text-ink-900">
              {searchQuery ? "No matching saved freelancers" : "No saved freelancers yet"}
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              {searchQuery
                ? "Try a different search term."
                : "Bookmark freelancers from job applications or their profile to build your talent shortlist."}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {items.map(({ savedId, freelancer }) => {
              const availability = freelancer.availability || "available";
              return (
                <div
                  key={savedId}
                  className="flex flex-col rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card transition-shadow hover:shadow-lg"
                >
                  {/* Profile header */}
                  <div className="mb-3 flex items-start gap-3">
                    <Avatar src={freelancer.avatar} name={freelancer.fullName} size="lg" />
                    <div className="min-w-0 flex-1">
                      <h3 className="truncate text-base font-bold text-ink-900">{freelancer.fullName}</h3>
                      <p className="truncate text-sm text-ink-500">{freelancer.title || "Freelancer"}</p>
                      {(freelancer.reviewCount ?? 0) > 0 ? (
                        <div className="mt-1 flex items-center gap-1">
                          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-semibold text-ink-700">
                            {freelancer.rating?.toFixed(1)} ({freelancer.reviewCount})
                          </span>
                        </div>
                      ) : (
                        <span className="mt-1 inline-block text-xs text-ink-400">No reviews yet</span>
                      )}
                    </div>
                    <Badge tone={AVAILABILITY_TONE[availability] ?? "neutral"} dot>
                      {availability.charAt(0).toUpperCase() + availability.slice(1)}
                    </Badge>
                  </div>

                  {/* Skills */}
                  <div className="mb-4 flex flex-wrap gap-1.5">
                    {(freelancer.skills ?? []).slice(0, 4).map((skill) => (
                      <Badge key={skill} tone="neutral">{skill}</Badge>
                    ))}
                    {(freelancer.skills ?? []).length > 4 && (
                      <Badge tone="neutral">+{(freelancer.skills ?? []).length - 4}</Badge>
                    )}
                    {(freelancer.skills ?? []).length === 0 && (
                      <span className="text-xs text-ink-400">No skills listed</span>
                    )}
                  </div>

                  {/* Stats */}
                  <div className="mb-4 grid grid-cols-3 gap-2 rounded-xl border border-surface-border bg-surface-muted p-3 text-center">
                    <div>
                      <div className="flex items-center justify-center gap-1 text-ink-400">
                        <CheckCircle2 className="h-3 w-3" />
                      </div>
                      <p className="mt-0.5 text-sm font-bold text-ink-900">{freelancer.completedProjects ?? 0}</p>
                      <p className="text-[10px] text-ink-400">Completed</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-ink-400">
                        <TrendingUp className="h-3 w-3" />
                      </div>
                      <p className="mt-0.5 text-sm font-bold text-ink-900">{freelancer.successRate ?? 0}%</p>
                      <p className="text-[10px] text-ink-400">Success</p>
                    </div>
                    <div>
                      <div className="flex items-center justify-center gap-1 text-ink-400">
                        <DollarSign className="h-3 w-3" />
                      </div>
                      <p className="mt-0.5 text-sm font-bold text-ink-900">
                        {freelancer.hourlyRate ? formatCurrency(freelancer.hourlyRate) : "—"}
                      </p>
                      <p className="text-[10px] text-ink-400">Per hour</p>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="mt-auto flex items-center gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      icon={<Send className="h-3.5 w-3.5" />}
                      iconPosition="left"
                      onClick={() => setInviteTarget({ id: freelancer.id!, name: freelancer.fullName })}
                    >
                      Invite
                    </Button>
                    <button
                      title="View Full Profile"
                      onClick={() => navigate(`/profile/${freelancer.id}`)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border text-ink-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                    >
                      <UserCircle2 className="h-4 w-4" />
                    </button>
                    <button
                      title="Remove from Saved"
                      disabled={unsaveMutation.isPending}
                      onClick={() => unsaveMutation.mutate(freelancer.id!)}
                      className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border text-brand-600 hover:border-red-300 hover:text-red-600 transition-colors disabled:opacity-50"
                    >
                      <Bookmark className="h-4 w-4 fill-current" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {inviteTarget && (
        <InviteFreelancerModal
          isOpen={!!inviteTarget}
          onClose={() => setInviteTarget(null)}
          freelancerId={inviteTarget.id}
          freelancerName={inviteTarget.name}
        />
      )}
    </DashboardLayout>
  );
}
