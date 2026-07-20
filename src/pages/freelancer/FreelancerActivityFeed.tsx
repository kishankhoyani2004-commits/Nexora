import { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useInfiniteQuery } from "@tanstack/react-query";
import {
  Activity, FileText, DollarSign, MessageSquare, Sparkles,
  Briefcase, CheckCircle2, XCircle, Star, Bell, TrendingUp,
  Filter, RefreshCw, ChevronDown, Loader2, Inbox,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { formatRelativeTime } from "@/utils/formatters";
import { formatCurrency } from "@/utils/formatters";
import { dashboardService } from "@/services/dashboard.service";
import { useQueryClient } from "@tanstack/react-query";
import type { FeedActivityItem, ActivityCategory } from "@/types";

// ── Category filter config ────────────────────────────────────────────────

const CATEGORIES: { id: ActivityCategory | "all"; label: string; icon: React.ElementType }[] = [
  { id: "all",       label: "All",       icon: Activity       },
  { id: "projects",  label: "Projects",  icon: Briefcase      },
  { id: "payments",  label: "Payments",  icon: DollarSign     },
  { id: "messages",  label: "Messages",  icon: MessageSquare  },
  { id: "ai",        label: "AI",        icon: Sparkles       },
  { id: "portfolio", label: "Portfolio", icon: TrendingUp     },
];

// ── Event → visual config ─────────────────────────────────────────────────

interface EventConfig {
  icon:    React.ElementType;
  iconBg:  string;
  dot:     string;
  badge?:  { label: string; tone: "success" | "danger" | "info" | "warning" | "brand" | "neutral" };
}

function getEventConfig(type: string): EventConfig {
  switch (type) {
    case "proposal_submitted":
      return { icon: FileText,      iconBg: "bg-brand-100 text-brand-600",    dot: "bg-brand-500",   badge: { label: "Proposal",  tone: "brand"   } };
    case "proposal_accepted":
      return { icon: CheckCircle2,  iconBg: "bg-emerald-100 text-emerald-600",dot: "bg-emerald-500", badge: { label: "Accepted",  tone: "success" } };
    case "proposal_rejected":
      return { icon: XCircle,       iconBg: "bg-red-100 text-red-500",         dot: "bg-red-500",     badge: { label: "Declined",  tone: "danger"  } };
    case "contract_started":
      return { icon: Briefcase,     iconBg: "bg-sky-100 text-sky-600",         dot: "bg-sky-500",     badge: { label: "Project",   tone: "info"    } };
    case "contract_completed":
      return { icon: CheckCircle2,  iconBg: "bg-emerald-100 text-emerald-600", dot: "bg-emerald-500", badge: { label: "Completed", tone: "success" } };
    case "payment_received":
      return { icon: DollarSign,    iconBg: "bg-emerald-100 text-emerald-600", dot: "bg-emerald-500", badge: { label: "Payment",   tone: "success" } };
    case "message_received":
      return { icon: MessageSquare, iconBg: "bg-sky-100 text-sky-600",         dot: "bg-sky-500",     badge: { label: "Message",   tone: "info"    } };
    case "review_received":
      return { icon: Star,          iconBg: "bg-amber-100 text-amber-600",     dot: "bg-amber-500",   badge: { label: "Review",    tone: "warning" } };
    case "ai_insight":
      return { icon: Sparkles,      iconBg: "bg-violet-100 text-violet-600",   dot: "bg-violet-500",  badge: { label: "AI",        tone: "brand"   } };
    default:
      return { icon: Bell,          iconBg: "bg-surface-muted text-ink-500",   dot: "bg-ink-400",     badge: { label: "Update",    tone: "neutral" } };
  }
}

// ── ActivityItem card ─────────────────────────────────────────────────────

function ActivityCard({ item, isLast }: { item: FeedActivityItem; isLast: boolean }) {
  const cfg = getEventConfig(item.type);
  const Icon = cfg.icon;

  return (
    <div className="relative flex gap-4">
      {/* Timeline spine */}
      {!isLast && (
        <div className="absolute left-5 top-10 bottom-0 w-px bg-surface-border" aria-hidden="true" />
      )}

      {/* Icon bubble */}
      <span
        className={cn(
          "relative z-10 mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl shadow-card",
          cfg.iconBg
        )}
      >
        <Icon className="h-4 w-4" />
        {/* Status dot */}
        <span className={cn("absolute -right-0.5 -top-0.5 h-2.5 w-2.5 rounded-full ring-2 ring-surface-card", cfg.dot)} />
      </span>

      {/* Content */}
      <div className="flex-1 min-w-0 rounded-2xl border border-surface-border bg-surface-card px-5 py-4 shadow-card hover:shadow-pop transition-shadow">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 mb-1">
              <p className="text-sm font-semibold text-ink-900">{item.title}</p>
              {cfg.badge && (
                <Badge tone={cfg.badge.tone}>{cfg.badge.label}</Badge>
              )}
            </div>
            <p className="text-sm text-ink-500 leading-relaxed">{item.description}</p>
            {item.meta && (
              <p className="mt-1.5 text-xs text-ink-400 italic">{item.meta}</p>
            )}
            {item.amount != null && item.amount > 0 && (
              <p className="mt-1.5 text-sm font-bold text-emerald-600">
                {formatCurrency(item.amount)}
              </p>
            )}
          </div>
          <time
            dateTime={item.createdAt}
            className="shrink-0 text-xs text-ink-400 whitespace-nowrap"
          >
            {formatRelativeTime(item.createdAt)}
          </time>
        </div>
      </div>
    </div>
  );
}

// ── Page skeleton ─────────────────────────────────────────────────────────

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="flex gap-4">
          <div className="h-10 w-10 shrink-0 animate-pulse rounded-xl bg-surface-muted" />
          <div className="flex-1 rounded-2xl border border-surface-border bg-surface-card px-5 py-4">
            <div className="mb-2 h-4 w-2/5 animate-pulse rounded bg-surface-muted" />
            <div className="h-3 w-3/4 animate-pulse rounded bg-surface-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────

export default function FreelancerActivityFeed() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const loadMoreRef  = useRef<HTMLDivElement>(null);

  const [activeCategory, setActiveCategory] = useState<ActivityCategory | "all">("all");

  // ── Infinite query ───────────────────────────────────────────────────────
  const {
    data,
    isLoading,
    isFetchingNextPage,
    fetchNextPage,
    hasNextPage,
    refetch,
  } = useInfiniteQuery({
    queryKey: ["freelancerActivity", activeCategory],
    queryFn:  ({ pageParam = 1 }) =>
      dashboardService.getFreelancerActivity({
        page:     pageParam as number,
        limit:    20,
        category: activeCategory,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const d = lastPage.data?.data;
      return d?.hasMore ? d.page + 1 : undefined;
    },
    staleTime: 60_000,
  });

  // ── Flatten all pages into a single items array ──────────────────────────
  const allItems: FeedActivityItem[] = (data?.pages ?? []).flatMap(
    (page) => (page.data?.data as any)?.items ?? []
  );
  const total: number = (data?.pages?.[0]?.data?.data as any)?.total ?? 0;

  // ── Intersection Observer — infinite scroll ──────────────────────────────
  const handleObserver = useCallback(
    (entries: IntersectionObserverEntry[]) => {
      if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
        fetchNextPage();
      }
    },
    [hasNextPage, isFetchingNextPage, fetchNextPage]
  );

  useEffect(() => {
    const el = loadMoreRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleObserver, { threshold: 0.1 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleObserver]);

  // ── Soft refresh ─────────────────────────────────────────────────────────
  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["freelancerActivity"] });
    refetch();
  }

  return (
    <DashboardLayout searchPlaceholder="Search activity…">
      <div className="mx-auto max-w-3xl pb-12">

        {/* ── Page header ────────────────────────────────────────── */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-pop">
                <Activity className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-500">
                Activity Feed
              </span>
            </div>
            <h1 className="text-2xl font-bold text-ink-900">Your Activity</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              A full chronological record of everything on your account
              {total > 0 && (
                <span className="ml-2 inline-flex items-center rounded-full bg-surface-muted px-2 py-0.5 text-xs font-semibold text-ink-500">
                  {total} events
                </span>
              )}
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            iconPosition="left"
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>

        {/* ── Category filters ────────────────────────────────────── */}
        <div
          className="mb-6 flex flex-wrap gap-2"
          role="tablist"
          aria-label="Activity categories"
        >
          {CATEGORIES.map(({ id, label, icon: CatIcon }) => {
            const isActive = activeCategory === id;
            return (
              <button
                key={id}
                role="tab"
                aria-selected={isActive}
                onClick={() => setActiveCategory(id)}
                className={cn(
                  "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 text-xs font-semibold transition-all",
                  isActive
                    ? "border-brand-600 bg-brand-600 text-white shadow-[0_4px_14px_-4px_rgba(99,102,241,0.5)]"
                    : "border-surface-border bg-surface-card text-ink-500 hover:border-brand-400 hover:text-brand-600"
                )}
              >
                <CatIcon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
          {/* Active filter indicator */}
          {activeCategory !== "all" && (
            <button
              onClick={() => setActiveCategory("all")}
              className="inline-flex items-center gap-1 rounded-full border border-red-200 bg-red-50 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-100 transition-colors"
            >
              <Filter className="h-3 w-3" />
              Clear filter
            </button>
          )}
        </div>

        {/* ── Timeline ────────────────────────────────────────────── */}
        {isLoading ? (
          <FeedSkeleton />
        ) : allItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-surface-border bg-surface-muted/40 py-20 text-center">
            <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
              <Inbox className="h-6 w-6" />
            </span>
            <p className="text-base font-semibold text-ink-900">No activity yet</p>
            <p className="max-w-xs text-sm text-ink-500">
              {activeCategory === "all"
                ? "Your account events will appear here as you submit proposals, complete projects, and receive payments."
                : `No ${activeCategory} events found. Try a different filter.`}
            </p>
            {activeCategory !== "all" && (
              <Button variant="outline" size="sm" onClick={() => setActiveCategory("all")}>
                Show all activity
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4" role="feed" aria-busy={isFetchingNextPage}>
            {allItems.map((item, idx) => (
              <ActivityCard
                key={item.id}
                item={item}
                isLast={idx === allItems.length - 1 && !hasNextPage}
              />
            ))}
          </div>
        )}

        {/* ── Infinite scroll sentinel / Load more ────────────────── */}
        <div ref={loadMoreRef} className="mt-6 flex justify-center">
          {isFetchingNextPage && (
            <div className="flex items-center gap-2 text-sm text-ink-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              Loading more…
            </div>
          )}
          {!isFetchingNextPage && hasNextPage && (
            <Button
              variant="outline"
              size="sm"
              icon={<ChevronDown className="h-4 w-4" />}
              onClick={() => fetchNextPage()}
            >
              Load more
            </Button>
          )}
          {!hasNextPage && allItems.length > 0 && (
            <p className="text-xs text-ink-300">
              You've reached the end · {allItems.length} events shown
            </p>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
