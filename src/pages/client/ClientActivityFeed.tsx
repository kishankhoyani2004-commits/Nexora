import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity, FileText, DollarSign, MessageSquare, Sparkles,
  Briefcase, CheckCircle2, XCircle, Star, Bell,
  Filter, RefreshCw, Loader2, Inbox, ArrowLeft,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { formatRelativeTime } from "@/utils/formatters";
import { formatCurrency } from "@/utils/formatters";
import { clientDashboardService } from "@/services/dashboard.service";
import { useNavigate } from "react-router-dom";
import { ROUTES } from "@/constants/routes";
import type { FeedActivityItem } from "@/types";

// Event config
interface EventConfig {
  icon: React.ElementType;
  iconBg: string;
  dot: string;
  badge?: { label: string; tone: "success" | "danger" | "info" | "warning" | "brand" | "neutral" };
}

function getEventConfig(type: string): EventConfig {
  switch (type) {
    case "job_posted":
      return { icon: Briefcase, iconBg: "bg-brand-100 text-brand-600", dot: "bg-brand-500", badge: { label: "Job Posted", tone: "brand" } };
    case "proposal_submitted":
      return { icon: FileText, iconBg: "bg-sky-100 text-sky-600", dot: "bg-sky-500", badge: { label: "Proposal", tone: "info" } };
    case "proposal_accepted":
      return { icon: CheckCircle2, iconBg: "bg-emerald-100 text-emerald-600", dot: "bg-emerald-500", badge: { label: "Accepted", tone: "success" } };
    case "proposal_rejected":
      return { icon: XCircle, iconBg: "bg-red-100 text-red-500", dot: "bg-red-500", badge: { label: "Rejected", tone: "danger" } };
    case "contract_started":
      return { icon: Briefcase, iconBg: "bg-sky-100 text-sky-600", dot: "bg-sky-500", badge: { label: "Contract", tone: "info" } };
    case "contract_completed":
      return { icon: CheckCircle2, iconBg: "bg-emerald-100 text-emerald-600", dot: "bg-emerald-500", badge: { label: "Completed", tone: "success" } };
    case "payment_released":
      return { icon: DollarSign, iconBg: "bg-emerald-100 text-emerald-600", dot: "bg-emerald-500", badge: { label: "Payment", tone: "success" } };
    case "message_received":
      return { icon: MessageSquare, iconBg: "bg-sky-100 text-sky-600", dot: "bg-sky-500", badge: { label: "Message", tone: "info" } };
    case "review_received":
      return { icon: Star, iconBg: "bg-amber-100 text-amber-600", dot: "bg-amber-500", badge: { label: "Review", tone: "warning" } };
    default:
      return { icon: Bell, iconBg: "bg-surface-muted text-ink-500", dot: "bg-ink-400", badge: { label: "Update", tone: "neutral" } };
  }
}

export default function ClientActivityFeed() {
  const navigate = useNavigate();
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const { data: response, isLoading, refetch } = useQuery({
    queryKey: ["clientActivity", activeCategory],
    queryFn: () =>
      clientDashboardService.getClientActivity({
        limit: 50,
        category: activeCategory === "all" ? undefined : activeCategory,
      }),
    staleTime: 60_000,
  });

  const allItems: FeedActivityItem[] = (response?.data?.data as any)?.items ?? [];

  return (
    <DashboardLayout searchPlaceholder="Search activity…">
      <div className="mx-auto max-w-4xl space-y-6 pb-12">

        {/* ── Header ────────────────────────────────────────────────── */}
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate(ROUTES.CLIENT_DASHBOARD)}
            className="flex h-10 w-10 items-center justify-center rounded-lg border border-surface-border hover:bg-surface-muted transition-colors"
          >
            <ArrowLeft className="h-4 w-4 text-ink-500" />
          </button>
          <div className="flex-1">
            <div className="mb-1 flex items-center gap-2">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
                <Activity className="h-5 w-5" />
              </span>
              <h1 className="text-3xl font-bold text-ink-900">Activity Feed</h1>
            </div>
            <p className="text-sm text-ink-500">
              Full history of your jobs, proposals, contracts, and payments
            </p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<RefreshCw className="h-4 w-4" />}
            onClick={() => refetch()}
          >
            Refresh
          </Button>
        </div>

        {/* ── Category Filters ────────────────────────────────────── */}
        <div className="flex flex-wrap gap-2">
          {[
            { id: "all", label: "All", icon: Activity },
            { id: "projects", label: "Projects", icon: Briefcase },
            { id: "payments", label: "Payments", icon: DollarSign },
            { id: "messages", label: "Messages", icon: MessageSquare },
            { id: "ai", label: "AI", icon: Sparkles },
          ].map(({ id, label, icon: Icon }) => {
            const isActive = activeCategory === id;
            return (
              <button
                key={id}
                onClick={() => setActiveCategory(id)}
                className={cn(
                  "inline-flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-semibold transition-all",
                  isActive
                    ? "border-brand-600 bg-brand-600 text-white shadow-lg"
                    : "border-surface-border bg-surface-card text-ink-600 hover:border-brand-400"
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            );
          })}
        </div>

        {/* ── Activity Timeline ───────────────────────────────────── */}
        {isLoading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : allItems.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-surface-border bg-surface-muted/50 py-24 text-center">
            <Inbox className="h-12 w-12 text-ink-300" />
            <p className="text-lg font-semibold text-ink-900">No activity yet</p>
            <p className="text-sm text-ink-500">
              {activeCategory === "all"
                ? "Your job postings, proposals, and payment activity will appear here."
                : "No events found in this category."}
            </p>
            {activeCategory !== "all" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setActiveCategory("all")}
                className="mt-3"
              >
                View all activity
              </Button>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            {allItems.map((item, idx) => {
              const cfg = getEventConfig(item.type);
              const Icon = cfg.icon;
              const isLast = idx === allItems.length - 1;

              return (
                <div key={item.id} className="relative flex gap-4">
                  {/* Timeline line */}
                  {!isLast && (
                    <div
                      className="absolute left-5 top-12 bottom-0 w-0.5 bg-gradient-to-b from-surface-border to-transparent"
                      aria-hidden="true"
                    />
                  )}

                  {/* Icon */}
                  <div className="relative z-10 mt-1">
                    <div
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl shadow-md",
                        cfg.iconBg
                      )}
                    >
                      <Icon className="h-5 w-5" />
                      <span
                        className={cn(
                          "absolute -right-1 -top-1 h-3 w-3 rounded-full ring-2 ring-surface-card",
                          cfg.dot
                        )}
                      />
                    </div>
                  </div>

                  {/* Content */}
                  <div className="flex-1 rounded-xl border border-surface-border bg-surface-card p-5 hover:shadow-md transition-shadow">
                    <div className="flex items-start justify-between gap-4 mb-2">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-semibold text-ink-900">{item.title}</h3>
                          {cfg.badge && <Badge tone={cfg.badge.tone}>{cfg.badge.label}</Badge>}
                        </div>
                        <p className="text-sm text-ink-600">{item.description}</p>
                      </div>
                      <time className="shrink-0 text-xs text-ink-400 whitespace-nowrap">
                        {formatRelativeTime(item.createdAt)}
                      </time>
                    </div>
                    {item.meta && (
                      <p className="text-xs text-ink-400 italic mt-2">{item.meta}</p>
                    )}
                    {item.amount != null && item.amount > 0 && (
                      <p className="mt-2 text-sm font-bold text-emerald-600">
                        {formatCurrency(item.amount)}
                      </p>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
