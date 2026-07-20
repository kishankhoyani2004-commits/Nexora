import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  BarChart3, Wallet, TrendingUp, Star, Users, Clock,
  BadgeCheck, Sparkles, Target, RefreshCw, ArrowRight,
  CheckCircle2, FileText, Zap,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/EmptyState";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { dashboardService } from "@/services/dashboard.service";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import { ROUTES } from "@/constants/routes";
import type { FreelancerAnalyticsData } from "@/services/dashboard.service";

// ── Shared card style ─────────────────────────────────────────────────────

const cardCls =
  "rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card";

// ── Reusable sub-components ───────────────────────────────────────────────

/** CSS-only vertical bar chart */
function BarChart({
  data,
  valueKey,
  labelKey,
  color = "linear-gradient(180deg,#818cf8,#6366f1)",
  formatValue = String,
  height = 160,
}: {
  data: Record<string, any>[];
  valueKey: string;
  labelKey: string;
  color?: string;
  formatValue?: (v: number) => string;
  height?: number;
}) {
  const max = Math.max(...data.map((d) => d[valueKey] as number), 1);
  return (
    <div className="flex items-end gap-1.5" style={{ height }}>
      {data.map((d, i) => {
        const pct  = ((d[valueKey] as number) / max) * 100;
        const isLast = i === data.length - 1;
        return (
          <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
            {/* Tooltip on hover */}
            <span className="hidden rounded-lg bg-ink-900 px-2 py-1 text-[11px] font-semibold text-white shadow group-hover:block">
              {formatValue(d[valueKey] as number)}
            </span>
            <div
              className="relative w-full overflow-hidden rounded-t-lg transition-all duration-500"
              style={{
                height:     `${Math.max(pct, 4)}%`,
                background: isLast
                  ? color
                  : color.replace("180deg,", "180deg,").replace("#6366f1", "#a5b4fc").replace("#818cf8", "#c7d2fe"),
                boxShadow:  isLast ? "0 4px 14px -4px rgba(99,102,241,.4)" : "none",
                opacity:    pct === 0 ? 0.25 : 1,
              }}
            />
            <span className={cn("text-[11px] font-medium", isLast ? "text-brand-600 font-bold" : "text-ink-400")}>
              {d[labelKey]}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/** Horizontal progress bar row */
function ProgressRow({
  label, value, max, color, suffix = "",
}: {
  label: string; value: number; max: number; color: string; suffix?: string;
}) {
  const pct = max > 0 ? Math.round((value / max) * 100) : 0;
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between text-xs">
        <span className="font-medium text-ink-700">{label}</span>
        <span className="font-bold text-ink-900">{value}{suffix}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${pct}%`, background: color }}
        />
      </div>
    </div>
  );
}

/** SVG donut ring */
function DonutRing({
  pct, label, sublabel, color = "#6366f1",
}: {
  pct: number; label: string; sublabel?: string; color?: string;
}) {
  const R    = 52;
  const circ = 2 * Math.PI * R;
  const dash = circ * (pct / 100);
  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative h-32 w-32">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90">
          <circle cx="60" cy="60" r={R} fill="none" stroke="var(--color-surface-muted)" strokeWidth="12" />
          <circle
            cx="60" cy="60" r={R} fill="none"
            stroke={color} strokeWidth="12" strokeLinecap="round"
            strokeDasharray={`${dash} ${circ}`}
            style={{ transition: "stroke-dasharray .7s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-2xl font-extrabold leading-none text-ink-900">{pct}%</span>
          {sublabel && <span className="mt-0.5 text-[10px] font-semibold text-ink-400 uppercase tracking-wider">{sublabel}</span>}
        </div>
      </div>
      <p className="text-xs font-semibold text-ink-600">{label}</p>
    </div>
  );
}

// ── AI Insights generator ─────────────────────────────────────────────────

function buildAIInsights(d: FreelancerAnalyticsData) {
  const tips: { emoji: string; text: string; tone: "tip" | "alert" | "win" }[] = [];

  // Earnings trend
  const earn = d.monthlyEarnings;
  if (earn.length >= 2) {
    const last  = earn[earn.length - 1].amount;
    const prev  = earn[earn.length - 2].amount;
    if (last > prev)
      tips.push({ emoji: "📈", text: `Earnings up ${prev > 0 ? Math.round(((last - prev) / prev) * 100) : 100}% vs last month. Keep momentum going!`, tone: "win" });
    else if (last < prev && prev > 0)
      tips.push({ emoji: "⚠️", text: `Earnings dipped this month. Consider applying to more jobs or improving proposal quality.`, tone: "alert" });
  }

  // Acceptance rate
  if (d.acceptanceRate < 25 && d.totalProposals > 2)
    tips.push({ emoji: "✍️", text: `Your ${d.acceptanceRate}% acceptance rate is below average. Try tailoring proposals with client-specific insights.`, tone: "alert" });
  else if (d.acceptanceRate >= 50)
    tips.push({ emoji: "🎯", text: `Strong ${d.acceptanceRate}% acceptance rate! You're winning more than half your proposals.`, tone: "win" });

  // Profile completion
  if (d.profileCompletion < 80)
    tips.push({ emoji: "🎨", text: `Profile is ${d.profileCompletion}% complete. Add portfolio items and bio to attract premium clients.`, tone: "tip" });

  // Skills
  if (d.topSkills.length > 0)
    tips.push({ emoji: "🔥", text: `"${d.topSkills[0].skill}" appears in ${d.topSkills[0].count} job${d.topSkills[0].count !== 1 ? "s" : ""} you applied to. It's your strongest market signal.`, tone: "tip" });

  // Rating
  if (d.avgRating >= 4.5 && d.reviewCount >= 3)
    tips.push({ emoji: "⭐", text: `${d.avgRating}/5 average rating across ${d.reviewCount} reviews. You qualify for Nexora Top Rated status.`, tone: "win" });

  // Best time tip (static insight, always useful)
  tips.push({ emoji: "⏰", text: `Jobs posted Monday–Wednesday get 40% more proposals. Apply within the first 24 hours for best results.`, tone: "tip" });

  return tips.slice(0, 4);
}

// ── Main component ────────────────────────────────────────────────────────

export default function FreelancerAnalytics() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();

  const { data: res, isLoading, refetch } = useQuery({
    queryKey: ["freelancerAnalytics"],
    queryFn:  () => dashboardService.getFreelancerAnalytics(),
    staleTime: 120_000,
  });

  const d: FreelancerAnalyticsData | undefined = res?.data?.data as any;

  const aiInsights = useMemo(() => (d ? buildAIInsights(d) : []), [d]);

  function handleRefresh() {
    queryClient.invalidateQueries({ queryKey: ["freelancerAnalytics"] });
    refetch();
  }

  // ── Goals config (sensible targets) ─────────────────────────────────────
  const goals = d
    ? [
        { label: "Earnings Goal",          current: d.totalEarnings,       target: 500_000, suffix: "", format: formatCurrency, color: "linear-gradient(90deg,#6366f1,#8b5cf6)" },
        { label: "Proposals Goal",         current: d.totalProposals,      target: 50,      suffix: " sent", format: (v: number) => String(v), color: "linear-gradient(90deg,#06b6d4,#3b82f6)" },
        { label: "Profile Completion",     current: d.profileCompletion,   target: 100,     suffix: "%", format: (v: number) => `${v}%`, color: "linear-gradient(90deg,#10b981,#059669)" },
      ]
    : [];

  // ── Proposal donut segments ──────────────────────────────────────────────
  const proposalTotal = d
    ? d.proposalBreakdown.submitted + d.proposalBreakdown.shortlisted +
      d.proposalBreakdown.accepted  + d.proposalBreakdown.rejected
    : 0;

  return (
    <DashboardLayout searchPlaceholder="Search analytics…">
      <div className="mx-auto max-w-screen-xl space-y-8 pb-12">

        {/* ── Page header ──────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-pop">
                <BarChart3 className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-500">Analytics</span>
            </div>
            <h1 className="text-2xl font-bold text-ink-900">Performance Analytics</h1>
            <p className="mt-0.5 text-sm text-ink-500">Live insights calculated from your real activity</p>
          </div>
          <Button
            variant="outline" size="sm"
            icon={<RefreshCw className="h-4 w-4" />} iconPosition="left"
            onClick={handleRefresh}
          >
            Refresh
          </Button>
        </div>

        {/* ── Performance cards ─────────────────────────────────────── */}
        {isLoading ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : d ? (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Total Earnings"       value={formatCurrency(d.totalEarnings)}   icon={Wallet}     tone="brand"   delta={d.monthlyEarnings.at(-1)?.amount ? `+${formatCurrency(d.monthlyEarnings.at(-1)!.amount)} this mo.` : undefined} />
            <StatCard label="Acceptance Rate"      value={`${d.acceptanceRate}%`}             icon={CheckCircle2} tone="success" delta={`${d.acceptedProposals} accepted`} />
            <StatCard label="Job Success Score"    value={`${d.completedContracts > 0 ? Math.round((d.completedContracts / Math.max(d.totalContracts, 1)) * 100) : 0}%`} icon={BadgeCheck} tone="info" />
            <StatCard label="Average Rating"       value={d.avgRating > 0 ? `★ ${d.avgRating}` : "—"} icon={Star} tone="warning" delta={`${d.reviewCount} reviews`} />
            <StatCard label="Total Clients"        value={String(d.clientGrowth.at(-1)?.total ?? 0)} icon={Users}      tone="success" />
            <StatCard label="Proposals Sent"       value={String(d.totalProposals)}           icon={FileText}   tone="brand"   delta={`${d.proposalBreakdown.accepted} accepted`} />
          </div>
        ) : null}

        {/* ── Charts row 1: Earnings + Proposals ───────────────────── */}
        {!isLoading && d && (
          <div className="grid gap-6 lg:grid-cols-2">

            {/* Earnings trend */}
            <div className={cardCls}>
              <div className="mb-5 flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-ink-900">Earnings Trend</p>
                  <p className="text-xs text-ink-500">Monthly net earnings · last 6 months</p>
                </div>
                {d.monthlyEarnings.length >= 2 && (() => {
                  const last = d.monthlyEarnings.at(-1)!.amount;
                  const prev = d.monthlyEarnings.at(-2)!.amount;
                  const chg  = prev > 0 ? Math.round(((last - prev) / prev) * 100) : 0;
                  return (
                    <span className={cn("rounded-full px-2.5 py-1 text-xs font-bold",
                      chg >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-600"
                    )}>
                      {chg >= 0 ? "▲" : "▼"} {Math.abs(chg)}%
                    </span>
                  );
                })()}
              </div>
              {d.monthlyEarnings.every((e) => e.amount === 0) ? (
                <EmptyState icon={TrendingUp} title="No earnings data yet" description="Complete your first contract to see earnings trends." />
              ) : (
                <>
                  <BarChart
                    data={d.monthlyEarnings}
                    valueKey="amount"
                    labelKey="month"
                    formatValue={(v) => formatCurrency(v, { compact: true })}
                    height={160}
                  />
                  <div className="mt-3 flex justify-between border-t border-surface-border pt-3 text-xs text-ink-400">
                    <span>₹0</span>
                    <span>{formatCurrency(Math.max(...d.monthlyEarnings.map((e) => e.amount)) / 2, { compact: true })}</span>
                    <span>{formatCurrency(Math.max(...d.monthlyEarnings.map((e) => e.amount)), { compact: true })}</span>
                  </div>
                </>
              )}
            </div>

            {/* Monthly proposals */}
            <div className={cardCls}>
              <div className="mb-5">
                <p className="text-sm font-bold text-ink-900">Proposal Activity</p>
                <p className="text-xs text-ink-500">Sent vs accepted · last 6 months</p>
              </div>
              {d.monthlyProposals.every((p) => p.total === 0) ? (
                <EmptyState icon={FileText} title="No proposals yet" description="Start submitting proposals to see trends here." />
              ) : (
                <div className="flex items-end gap-3" style={{ height: 160 }}>
                  {d.monthlyProposals.map((p, i) => {
                    const maxTotal = Math.max(...d.monthlyProposals.map((x) => x.total), 1);
                    const totalPct    = (p.total    / maxTotal) * 100;
                    const acceptedPct = p.total > 0 ? (p.accepted / p.total) * 100 : 0;
                    return (
                      <div key={i} className="group flex flex-1 flex-col items-center gap-1.5">
                        <div className="relative w-full flex items-end gap-0.5" style={{ height: 140 }}>
                          {/* Sent bar */}
                          <div className="flex-1 rounded-t-lg bg-brand-200 transition-all duration-500"
                            style={{ height: `${Math.max(totalPct, 4)}%` }} />
                          {/* Accepted overlay */}
                          <div className="absolute bottom-0 left-0 right-1 rounded-t-md bg-brand-600 transition-all duration-700"
                            style={{ height: `${Math.max((acceptedPct / 100) * totalPct, p.accepted > 0 ? 4 : 0)}%` }} />
                        </div>
                        <span className="text-[11px] text-ink-400">{p.month}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div className="mt-3 flex items-center gap-4 border-t border-surface-border pt-3">
                <span className="flex items-center gap-1.5 text-xs text-ink-500"><span className="h-2.5 w-2.5 rounded-sm bg-brand-200 inline-block" /> Sent</span>
                <span className="flex items-center gap-1.5 text-xs text-ink-500"><span className="h-2.5 w-2.5 rounded-sm bg-brand-600 inline-block" /> Accepted</span>
              </div>
            </div>
          </div>
        )}

        {/* ── Charts row 2: Proposal breakdown + Client growth ──────── */}
        {!isLoading && d && (
          <div className="grid gap-6 lg:grid-cols-3">

            {/* Proposal status donut */}
            <div className={cn(cardCls, "flex flex-col items-center")}>
              <div className="mb-5 w-full">
                <p className="text-sm font-bold text-ink-900">Proposal Status</p>
                <p className="text-xs text-ink-500">Breakdown of all submitted proposals</p>
              </div>
              {proposalTotal === 0 ? (
                <EmptyState icon={FileText} title="No proposals submitted" />
              ) : (
                <>
                  <DonutRing
                    pct={d.acceptanceRate}
                    label="Acceptance Rate"
                    sublabel="accepted"
                    color="linear-gradient(90deg,#10b981,#6366f1)"
                  />
                  <div className="mt-5 w-full space-y-2.5">
                    {[
                      { label: "Accepted",    count: d.proposalBreakdown.accepted,    color: "#10b981" },
                      { label: "Shortlisted", count: d.proposalBreakdown.shortlisted, color: "#6366f1" },
                      { label: "Pending",     count: d.proposalBreakdown.submitted,   color: "#f59e0b" },
                      { label: "Declined",    count: d.proposalBreakdown.rejected,    color: "#ef4444" },
                    ].map(({ label, count, color }) => (
                      <div key={label} className="flex items-center justify-between text-xs">
                        <span className="flex items-center gap-2">
                          <span className="h-2.5 w-2.5 rounded-full inline-block" style={{ background: color }} />
                          <span className="text-ink-600">{label}</span>
                        </span>
                        <span className="font-bold text-ink-900">{count}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>

            {/* Client growth */}
            <div className={cn(cardCls, "lg:col-span-2")}>
              <div className="mb-5">
                <p className="text-sm font-bold text-ink-900">Client Growth</p>
                <p className="text-xs text-ink-500">Cumulative unique clients over time</p>
              </div>
              {d.clientGrowth.every((c) => c.total === 0) ? (
                <EmptyState icon={Users} title="No clients yet" description="Your first contract will start your client growth chart." />
              ) : (
                <BarChart
                  data={d.clientGrowth}
                  valueKey="total"
                  labelKey="month"
                  color="linear-gradient(180deg,#34d399,#10b981)"
                  formatValue={(v) => `${v} clients`}
                  height={160}
                />
              )}
            </div>
          </div>
        )}

        {/* ── Skill analytics ───────────────────────────────────────── */}
        {!isLoading && d && d.topSkills.length > 0 && (
          <div className={cardCls}>
            <div className="mb-5 flex items-center justify-between">
              <div>
                <p className="text-sm font-bold text-ink-900">Skill Analytics</p>
                <p className="text-xs text-ink-500">Skills most frequently required in jobs you applied to</p>
              </div>
              <Badge tone="brand" dot>Top {d.topSkills.length} skills</Badge>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              {d.topSkills.map((s, i) => (
                <ProgressRow
                  key={s.skill}
                  label={s.skill}
                  value={s.count}
                  max={d.topSkills[0].count}
                  suffix=" jobs"
                  color={
                    i === 0 ? "linear-gradient(90deg,#6366f1,#8b5cf6)"
                    : i === 1 ? "linear-gradient(90deg,#10b981,#34d399)"
                    : i === 2 ? "linear-gradient(90deg,#f59e0b,#fbbf24)"
                    : "linear-gradient(90deg,#6b7280,#9ca3af)"
                  }
                />
              ))}
            </div>
          </div>
        )}

        {/* ── AI Insights ───────────────────────────────────────────── */}
        {!isLoading && aiInsights.length > 0 && (
          <section
            aria-label="AI Insights"
            className="rounded-2xl border border-brand-200 bg-gradient-to-br from-brand-50 via-surface-card to-violet-50 p-6 shadow-card dark:border-surface-border dark:from-surface-muted dark:via-surface-card dark:to-surface-muted"
          >
            <div className="mb-4 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-pop">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-sm font-bold text-ink-900">AI Performance Insights</p>
                  <p className="text-xs text-ink-500">Recommendations generated from your real data</p>
                </div>
              </div>
              <Button
                variant="ghost" size="sm"
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={() => navigate(ROUTES.AI_ASSISTANT)}
              >
                Full AI Assistant
              </Button>
            </div>
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              {aiInsights.map((ins, i) => (
                <div
                  key={i}
                  className={cn(
                    "rounded-xl border p-4",
                    ins.tone === "alert" && "border-amber-200 bg-amber-50 dark:border-amber-900/40 dark:bg-amber-900/10",
                    ins.tone === "tip"   && "border-brand-200 bg-brand-50 dark:border-brand-900/40 dark:bg-brand-900/10",
                    ins.tone === "win"   && "border-emerald-200 bg-emerald-50 dark:border-emerald-900/40 dark:bg-emerald-900/10",
                  )}
                >
                  <span className="mb-2 block text-xl">{ins.emoji}</span>
                  <p className="text-xs leading-relaxed text-ink-700">{ins.text}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Goals section ─────────────────────────────────────────── */}
        {!isLoading && d && (
          <div className={cardCls}>
            <div className="mb-6 flex items-center justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Target className="h-4 w-4 text-brand-600" />
                  <p className="text-sm font-bold text-ink-900">Goals & Progress</p>
                </div>
                <p className="text-xs text-ink-500">Track your targets based on live account data</p>
              </div>
              <Button variant="ghost" size="sm" icon={<Zap className="h-4 w-4" />} onClick={() => navigate(ROUTES.FREELANCER_DASHBOARD)}>
                Dashboard
              </Button>
            </div>
            <div className="grid gap-6 sm:grid-cols-3">
              {goals.map((goal) => {
                const pct = Math.min(100, goal.target > 0 ? Math.round((goal.current / goal.target) * 100) : 0);
                return (
                  <div key={goal.label} className="space-y-3">
                    <div className="flex items-center justify-between text-xs text-ink-500">
                      <span className="font-semibold">{goal.label}</span>
                      <span className={cn("font-bold rounded-full px-2 py-0.5",
                        pct >= 100 ? "bg-emerald-100 text-emerald-700"
                        : pct >= 50 ? "bg-brand-100 text-brand-700"
                        : "bg-surface-muted text-ink-500"
                      )}>{pct}%</span>
                    </div>
                    <div className="h-3 w-full overflow-hidden rounded-full bg-surface-muted">
                      <div
                        className="h-full rounded-full transition-all duration-700"
                        style={{ width: `${pct}%`, background: goal.color }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-bold text-ink-900">
                        {typeof goal.format === 'function' ? goal.format(goal.current) : goal.current}{goal.suffix}
                      </span>
                      <span className="text-ink-400">
                        of {typeof goal.format === 'function' ? goal.format(goal.target) : goal.target}{goal.suffix}
                      </span>
                    </div>
                    {pct >= 100 && (
                      <p className="flex items-center gap-1 text-xs font-semibold text-emerald-600">
                        <CheckCircle2 className="h-3.5 w-3.5" /> Goal achieved!
                      </p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Loading placeholder for charts */}
        {isLoading && (
          <div className="space-y-6">
            <div className="grid gap-6 lg:grid-cols-2">
              {[1, 2].map((i) => (
                <div key={i} className={cn(cardCls, "h-64 animate-pulse")}>
                  <div className="mb-4 h-4 w-1/3 rounded bg-surface-muted" />
                  <div className="h-40 w-full rounded-xl bg-surface-muted" />
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
