import { useState } from "react";
import {
  DollarSign, Briefcase, CheckCircle2, FolderKanban,
  FileText, Percent, Star, Loader2,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, Tooltip, Legend, CartesianGrid,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/utils/cn";

// ─── Types (mirror backend/controllers/dashboardController.js::getClientAnalytics) ──

type RangePreset = "today" | "7d" | "30d" | "12m" | "custom";

interface AnalyticsStats {
  totalJobsPosted: number;
  activeProjects: number;
  completedProjects: number;
  totalProposalsReceived: number;
  acceptanceRate: number;
  totalSpending: number;
}

interface BucketPoint { label: string; amount?: number; count?: number; received?: number; accepted?: number }
interface HiringReportRow { label: string; jobsPosted: number; hiresMade: number; avgBudget: number }
interface FreelancerPerf {
  freelancerId: string;
  fullName: string;
  avatar: string;
  rating: number;
  reviewCount: number;
  totalContracts: number;
  completedContracts: number;
  totalPaid: number;
}

interface AnalyticsData {
  range: { from: string; to: string; preset: RangePreset };
  stats: AnalyticsStats;
  completionRate: number;
  monthlySpending: BucketPoint[];
  jobPostingTrends: BucketPoint[];
  proposalAnalytics: BucketPoint[];
  hiringReport: HiringReportRow[];
  projectStatusDistribution: { status: string; count: number }[];
  topCategories: { category: string; amount: number }[];
  freelancerPerformance: FreelancerPerf[];
}

interface ActivityItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
}

const FILTERS: { key: RangePreset; label: string }[] = [
  { key: "today", label: "Today" },
  { key: "7d", label: "Last 7 Days" },
  { key: "30d", label: "Last 30 Days" },
  { key: "12m", label: "Last 12 Months" },
  { key: "custom", label: "Custom Range" },
];

const CATEGORY_COLORS = ["#6366f1", "#10b981", "#f59e0b", "#8b5cf6", "#06b6d4", "#ec4899", "#84cc16", "#f97316"];
const STATUS_COLORS: Record<string, string> = {
  active: "#6366f1",
  completed: "#10b981",
  pending: "#f59e0b",
  cancelled: "#ef4444",
  disputed: "#f97316",
};

const cardCls = "rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card";
const titleCls = "text-base font-bold text-ink-900";
const subCls = "text-xs text-ink-500 mt-0.5";

export default function ClientAnalytics() {
  const [range, setRange] = useState<RangePreset>("12m");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");

  const queryParams =
    range === "custom"
      ? `?range=custom&from=${customFrom}&to=${customTo}`
      : `?range=${range}`;

  const { data: analyticsRes, isLoading } = useQuery({
    queryKey: ["client-analytics", range, range === "custom" ? customFrom : null, range === "custom" ? customTo : null],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: AnalyticsData }>(`/dashboard/client/analytics${queryParams}`);
      return res.data;
    },
    enabled: range !== "custom" || (!!customFrom && !!customTo),
  });
  const data = analyticsRes?.data;

  const { data: activityRes } = useQuery({
    queryKey: ["client-activity-feed"],
    queryFn: async () => {
      const res = await apiClient.get<{ success: boolean; data: { items: ActivityItem[] } }>("/dashboard/client/activity?limit=10");
      return res.data;
    },
  });
  const activity = activityRes?.data.items || [];

  return (
    <DashboardLayout tagline="Client Hub" searchPlaceholder="Search analytics...">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">Client Analytics</h1>
          <p className="text-sm text-ink-500">Spending insights, hiring performance, and project trends.</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-surface-muted p-1 text-xs font-semibold">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setRange(f.key)}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap",
                  range === f.key ? "bg-surface-card text-brand-600 shadow-sm" : "text-ink-500 hover:text-ink-900"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {range === "custom" && (
            <div className="flex items-center gap-2">
              <input
                type="date"
                value={customFrom}
                onChange={(e) => setCustomFrom(e.target.value)}
                className="h-9 rounded-lg border border-surface-border bg-surface-card px-2.5 text-xs text-ink-900 outline-none"
              />
              <span className="text-xs text-ink-400">to</span>
              <input
                type="date"
                value={customTo}
                onChange={(e) => setCustomTo(e.target.value)}
                className="h-9 rounded-lg border border-surface-border bg-surface-card px-2.5 text-xs text-ink-900 outline-none"
              />
            </div>
          )}
        </div>
      </div>

      {isLoading || !data ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : (
        <>
          {/* ── Stat Cards ── */}
          <div className="mb-6 grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
            <StatCard label="Jobs Posted" value={String(data.stats.totalJobsPosted)} icon={Briefcase} tone="brand" />
            <StatCard label="Active Projects" value={String(data.stats.activeProjects)} icon={FolderKanban} tone="info" />
            <StatCard label="Completed Projects" value={String(data.stats.completedProjects)} icon={CheckCircle2} tone="success" />
            <StatCard label="Proposals Received" value={String(data.stats.totalProposalsReceived)} icon={FileText} tone="warning" />
            <StatCard label="Acceptance Rate" value={`${data.stats.acceptanceRate}%`} icon={Percent} tone="info" />
            <StatCard label="Total Spending" value={formatCurrency(data.stats.totalSpending)} icon={DollarSign} tone="brand" />
          </div>

          {/* ── Row: Monthly Spending + Completion Rate ── */}
          <div className="mb-6 grid gap-5 lg:grid-cols-[1fr_320px]">
            <div className={cardCls}>
              <h2 className={titleCls}>Monthly Spending Chart</h2>
              <p className={subCls}>Escrow released to freelancers over the selected period.</p>
              <ResponsiveContainer width="100%" height={260}>
                <AreaChart data={data.monthlySpending} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="spendGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5b4fee" stopOpacity={0.35} />
                      <stop offset="100%" stopColor="#5b4fee" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e4f5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
                  <Tooltip
                    contentStyle={{ borderRadius: 12, border: "1px solid #e6e4f5", fontSize: 12 }}
                    formatter={(v) => formatCurrency(Number(v))}
                  />
                  <Area type="monotone" dataKey="amount" stroke="#5b4fee" strokeWidth={2.5} fill="url(#spendGradient)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div className={cn(cardCls, "flex flex-col items-center")}>
              <div className="w-full">
                <h2 className={titleCls}>Project Completion Rate</h2>
                <p className={subCls}>Completed vs. active/cancelled/disputed.</p>
              </div>
              <div className="relative my-4 h-40 w-40">
                <svg viewBox="0 0 148 148" className="h-full w-full -rotate-90">
                  <circle cx="74" cy="74" r="58" fill="none" stroke="#e5e7eb" strokeWidth="14" />
                  <circle
                    cx="74" cy="74" r="58" fill="none" stroke="#10b981" strokeWidth="14" strokeLinecap="round"
                    strokeDasharray={2 * Math.PI * 58}
                    strokeDashoffset={2 * Math.PI * 58 * (1 - data.completionRate / 100)}
                  />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="text-3xl font-black text-ink-900">{data.completionRate}%</span>
                </div>
              </div>
              <p className="text-xs text-ink-400">{data.stats.completedProjects} of {data.stats.completedProjects + data.stats.activeProjects} tracked projects completed</p>
            </div>
          </div>

          {/* ── Row: Job Posting Trends + Proposal Analytics ── */}
          <div className="mb-6 grid gap-5 lg:grid-cols-2">
            <div className={cardCls}>
              <h2 className={titleCls}>Job Posting Trends</h2>
              <p className={subCls}>New job posts over time.</p>
              <ResponsiveContainer width="100%" height={240}>
                <LineChart data={data.jobPostingTrends} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e4f5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6e4f5", fontSize: 12 }} />
                  <Line type="monotone" dataKey="count" stroke="#6366f1" strokeWidth={2.5} dot={{ r: 3 }} name="Jobs Posted" />
                </LineChart>
              </ResponsiveContainer>
            </div>

            <div className={cardCls}>
              <h2 className={titleCls}>Proposal Analytics</h2>
              <p className={subCls}>Proposals received vs. accepted.</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.proposalAnalytics} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e4f5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6e4f5", fontSize: 12 }} />
                  <Legend wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="received" fill="#c7d2fe" name="Received" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="accepted" fill="#6366f1" name="Accepted" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* ── Row: Project Status Distribution + Top Categories ── */}
          <div className="mb-6 grid gap-5 lg:grid-cols-2">
            <div className={cardCls}>
              <h2 className={titleCls}>Project Status Distribution</h2>
              <p className={subCls}>All-time snapshot across every project.</p>
              {data.projectStatusDistribution.length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-400">No projects yet.</p>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={data.projectStatusDistribution}
                      dataKey="count"
                      nameKey="status"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                    >
                      {data.projectStatusDistribution.map((entry) => (
                        <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || "#94a3b8"} />
                      ))}
                    </Pie>
                    <Legend wrapperStyle={{ fontSize: 11, textTransform: "capitalize" }} />
                    <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6e4f5", fontSize: 12 }} />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>

            <div className={cardCls}>
              <h2 className={titleCls}>Top Categories</h2>
              <p className={subCls}>Spending by job category.</p>
              {data.topCategories.length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-400">No spending recorded yet.</p>
              ) : (
                <div className="mt-4 space-y-3">
                  {data.topCategories.map((cat, i) => {
                    const max = data.topCategories[0].amount || 1;
                    const pct = Math.round((cat.amount / max) * 100);
                    const color = CATEGORY_COLORS[i % CATEGORY_COLORS.length];
                    return (
                      <div key={cat.category}>
                        <div className="mb-1 flex items-center justify-between text-xs">
                          <span className="font-semibold text-ink-800">{cat.category}</span>
                          <span className="font-bold text-ink-900">{formatCurrency(cat.amount)}</span>
                        </div>
                        <div className="h-2 rounded-full bg-surface-muted overflow-hidden">
                          <div className="h-full rounded-full" style={{ width: `${pct}%`, background: color }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* ── Row: Hiring Trends + Monthly Hiring Report ── */}
          <div className="mb-6 grid gap-5 lg:grid-cols-2">
            <div className={cardCls}>
              <h2 className={titleCls}>Hiring Trends</h2>
              <p className={subCls}>New contracts (hires) over time.</p>
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data.hiringReport} margin={{ top: 20, right: 10, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e4f5" />
                  <XAxis dataKey="label" axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} />
                  <YAxis allowDecimals={false} axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} />
                  <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6e4f5", fontSize: 12 }} />
                  <Bar dataKey="hiresMade" fill="#10b981" name="Hires" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div className={cn(cardCls, "overflow-hidden")}>
              <h2 className={titleCls}>Monthly Hiring Report</h2>
              <p className={subCls}>Jobs posted, hires made, and average budget.</p>
              <div className="mt-4 overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead>
                    <tr className="border-b border-surface-border text-xs uppercase text-ink-400">
                      <th className="pb-2">Period</th>
                      <th className="pb-2 text-center">Jobs Posted</th>
                      <th className="pb-2 text-center">Hires Made</th>
                      <th className="pb-2 text-right">Avg Budget</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {data.hiringReport.length === 0 ? (
                      <tr><td colSpan={4} className="py-6 text-center text-ink-400">No data for this period.</td></tr>
                    ) : (
                      data.hiringReport.map((row) => (
                        <tr key={row.label}>
                          <td className="py-2 font-semibold text-ink-900">{row.label}</td>
                          <td className="py-2 text-center text-ink-600">{row.jobsPosted}</td>
                          <td className="py-2 text-center">
                            <span className="inline-flex items-center gap-1 font-semibold text-emerald-600">
                              <CheckCircle2 className="h-3.5 w-3.5" /> {row.hiresMade}
                            </span>
                          </td>
                          <td className="py-2 text-right font-semibold text-brand-600">{row.avgBudget > 0 ? formatCurrency(row.avgBudget) : "—"}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* ── Row: Freelancer Performance + Recent Activity ── */}
          <div className="grid gap-5 lg:grid-cols-[1fr_380px]">
            <div className={cn(cardCls, "overflow-hidden")}>
              <h2 className={titleCls}>Freelancer Performance</h2>
              <p className={subCls}>Every freelancer you've worked with, ranked by total paid.</p>
              {data.freelancerPerformance.length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-400">No freelancers hired yet.</p>
              ) : (
                <div className="mt-4 overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-surface-border text-xs uppercase text-ink-400">
                        <th className="pb-2">Freelancer</th>
                        <th className="pb-2 text-center">Rating</th>
                        <th className="pb-2 text-center">Contracts</th>
                        <th className="pb-2 text-center">Completed</th>
                        <th className="pb-2 text-right">Total Paid</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {data.freelancerPerformance.map((f) => (
                        <tr key={f.freelancerId}>
                          <td className="py-2.5">
                            <div className="flex items-center gap-2.5">
                              <Avatar src={f.avatar} name={f.fullName} size="sm" />
                              <span className="font-semibold text-ink-900">{f.fullName}</span>
                            </div>
                          </td>
                          <td className="py-2.5 text-center">
                            {f.reviewCount > 0 ? (
                              <span className="inline-flex items-center gap-1 font-semibold text-ink-800">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {f.rating.toFixed(1)}
                              </span>
                            ) : (
                              <span className="text-ink-400">—</span>
                            )}
                          </td>
                          <td className="py-2.5 text-center text-ink-600">{f.totalContracts}</td>
                          <td className="py-2.5 text-center">
                            <Badge tone={f.completedContracts === f.totalContracts ? "success" : "warning"}>{f.completedContracts}</Badge>
                          </td>
                          <td className="py-2.5 text-right font-bold text-brand-600">{formatCurrency(f.totalPaid)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            <div className={cardCls}>
              <h2 className={titleCls}>Recent Activity Timeline</h2>
              <p className={subCls}>Latest events across your account.</p>
              {activity.length === 0 ? (
                <p className="py-12 text-center text-sm text-ink-400">No recent activity.</p>
              ) : (
                <div className="mt-4 relative border-l border-surface-border pl-5 ml-2 space-y-5 max-h-[420px] overflow-y-auto">
                  {activity.map((a) => (
                    <div key={a.id} className="relative">
                      <span className="absolute -left-[25px] top-1 h-3 w-3 rounded-full border-2 border-brand-500 bg-surface-card" />
                      <p className="text-sm font-semibold text-ink-900">{a.title}</p>
                      <p className="text-xs text-ink-500">{a.description}</p>
                      <p className="text-[10px] text-ink-400 mt-0.5">{new Date(a.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
