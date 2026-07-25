import { useState } from "react";
import {
  Wallet,
  TrendingUp,
  Clock,
  CalendarDays,
  Download,
  ArrowDownToLine,
  Landmark,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { FREELANCER_NAV } from "@/constants/nav";
import { useQuery } from "@tanstack/react-query";
import { earningService, type Earning } from "@/services/earning.service";
import { formatCurrency } from "@/utils/formatters";

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_FEE = 0.1;

function platformFee(gross: number) {
  return gross * PLATFORM_FEE;
}

function netAmount(gross: number) {
  return gross * (1 - PLATFORM_FEE);
}

/** Earning status → simplified payment status used for the transaction table. */
function toPaymentStatus(status: Earning["status"]): "completed" | "pending" {
  return status === "released" || status === "withdrawn" ? "completed" : "pending";
}

function statusBadge(status: "completed" | "pending") {
  if (status === "completed") return <Badge tone="success" dot>Completed</Badge>;
  return <Badge tone="warning" dot>Pending</Badge>;
}

function statusIcon(status: "completed" | "pending") {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  return <AlertCircle className="h-4 w-4 text-amber-500" />;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escrowReleaseDate(createdAt: string) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function nameOf(ref: Earning["client"]) {
  return typeof ref === "object" ? ref?.fullName ?? "—" : "—";
}

function titleOf(ref: Earning["job"]) {
  return typeof ref === "object" ? ref?.title ?? "—" : "—";
}

/** Buckets earnings into the last 6 calendar months for the overview chart. */
function buildMonthlyChart(earnings: Earning[]) {
  const now = new Date();
  const months: { key: string; month: string; amount: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push({
      key: `${d.getFullYear()}-${d.getMonth()}`,
      month: d.toLocaleDateString("en-US", { month: "short" }),
      amount: 0,
    });
  }
  const byKey = new Map(months.map((m) => [m.key, m]));
  for (const e of earnings) {
    const d = new Date(e.createdAt);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const bucket = byKey.get(key);
    if (bucket) bucket.amount += e.amount;
  }
  return months;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FreelancerEarnings() {
  const [withdrawing, setWithdrawing] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["earnings"],
    queryFn: async () => {
      const res = await earningService.getEarnings();
      return res.data.data;
    },
  });

  const earnings: Earning[] = data?.earnings ?? [];
  const summary = data?.summary ?? { total: 0, pending: 0, inEscrow: 0, released: 0, count: 0 };

  const activeEscrow = earnings.filter((e) => e.status === "in_escrow");

  const now = new Date();
  const thisMonth = earnings
    .filter((e) => {
      const d = new Date(e.createdAt);
      return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
    })
    .reduce((sum, e) => sum + e.amount, 0);

  const chart = buildMonthlyChart(earnings);
  const chartMax = Math.max(1, ...chart.map((d) => d.amount));

  // ── Download CSV ──
  function handleDownloadCSV() {
    const rows = [
      ["Date", "Project", "Gross Amount", "Platform Fee (10%)", "Net Amount", "Status"],
      ...earnings.map((e) => [
        formatDate(e.createdAt),
        titleOf(e.job),
        e.amount.toFixed(2),
        platformFee(e.amount).toFixed(2),
        netAmount(e.amount).toFixed(2),
        toPaymentStatus(e.status),
      ]),
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "nexora-earnings.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  // ── Withdraw (UI-only; no payout processor wired up yet) ──
  function handleWithdraw() {
    setWithdrawing(true);
    setTimeout(() => setWithdrawing(false), 1800);
  }

  return (
    <DashboardLayout navItems={FREELANCER_NAV}>
      {/* ── Page Header ───────────────────────────────────────────── */}
      <div className="mb-8 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <span
              className="inline-flex h-8 w-8 items-center justify-center rounded-xl"
              style={{ background: "linear-gradient(135deg,#6c63ff 0%,#a78bfa 100%)" }}
            >
              <Sparkles className="h-4 w-4 text-white" />
            </span>
            <span className="text-xs font-semibold uppercase tracking-widest text-brand-500">
              Earnings
            </span>
          </div>
          <h1 className="text-2xl font-bold text-ink-900">
            Your Earnings
          </h1>
          <p className="mt-0.5 text-sm text-ink-500">
            Track income, escrow balances, and transaction history from your active projects.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<Download className="h-4 w-4" />}
          iconPosition="left"
          onClick={handleDownloadCSV}
          disabled={earnings.length === 0}
        >
          Download Tax CSV
        </Button>
      </div>

      {/* ── Stat Cards ────────────────────────────────────────────── */}
      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
        </div>
      ) : (
        <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            label="Total Earned"
            value={formatCurrency(summary.total)}
            icon={Wallet}
            tone="brand"
          />
          <StatCard
            label="In Escrow"
            value={formatCurrency(summary.inEscrow)}
            icon={Clock}
            tone="warning"
          />
          <StatCard
            label="Available to Withdraw"
            value={formatCurrency(summary.released)}
            icon={ArrowDownToLine}
            tone="success"
          />
          <StatCard
            label="This Month"
            value={formatCurrency(thisMonth)}
            icon={CalendarDays}
            tone="info"
          />
        </div>
      )}

      {/* ── Main Grid: Chart + Withdraw ───────────────────────────── */}
      <div className="mb-8 grid gap-6 lg:grid-cols-3">

        {/* ── Earnings Overview Chart ─────────────────────────────── */}
        <div className="lg:col-span-2 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
          <div className="mb-6 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink-900">Earnings Overview</h2>
              <p className="text-xs text-ink-400">Last 6 months · Gross earnings from accepted projects</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
              <TrendingUp className="h-3.5 w-3.5" /> {summary.count} project{summary.count === 1 ? "" : "s"}
            </span>
          </div>

          {/* CSS-only Bar Chart */}
          <div className="flex h-44 items-end gap-3">
            {chart.map((entry) => {
              const pct = (entry.amount / chartMax) * 100;
              return (
                <div key={entry.key} className="group flex flex-1 flex-col items-center gap-2">
                  {/* Tooltip */}
                  <span
                    className="hidden rounded-lg px-2 py-1 text-[11px] font-semibold text-white shadow-md group-hover:block"
                    style={{ background: "linear-gradient(135deg,#6c63ff,#a78bfa)" }}
                  >
                    {formatCurrency(entry.amount, { compact: true })}
                  </span>
                  {/* Bar */}
                  <div
                    className="relative w-full overflow-hidden rounded-t-xl transition-all duration-500"
                    style={{
                      height: `${Math.max(pct, entry.amount > 0 ? 4 : 0)}%`,
                      background: "linear-gradient(180deg,#8b7ff7 0%,#6c63ff 100%)",
                      boxShadow: "0 4px 18px -4px rgba(108,99,255,0.45)",
                    }}
                  >
                    {/* Shimmer stripe */}
                    <div
                      className="absolute inset-0 opacity-30"
                      style={{
                        background:
                          "linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)",
                      }}
                    />
                  </div>
                  {/* Month label */}
                  <span className="text-[11px] font-medium text-ink-400">{entry.month}</span>
                </div>
              );
            })}
          </div>

          {/* Y-axis legend */}
          <div className="mt-3 flex justify-between border-t border-surface-border pt-3">
            <span className="text-xs text-ink-300">$0</span>
            <span className="text-xs text-ink-300">{formatCurrency(chartMax / 2, { compact: true })}</span>
            <span className="text-xs text-ink-300">{formatCurrency(chartMax, { compact: true })}</span>
          </div>
        </div>

        {/* ── Withdraw Funds ──────────────────────────────────────── */}
        <div
          className="flex flex-col justify-between rounded-2xl p-6 shadow-card"
          style={{
            background: "linear-gradient(145deg,#6c63ff 0%,#9b59f0 60%,#c084fc 100%)",
          }}
        >
          <div>
            <div className="mb-4 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
                <Landmark className="h-5 w-5 text-white" />
              </span>
              <span className="text-sm font-semibold text-white/80">Withdraw Funds</span>
            </div>

            {/* Balance display */}
            <p className="mb-1 text-xs font-medium uppercase tracking-widest text-white/60">
              Available Balance
            </p>
            <p
              className="mb-6 text-4xl font-extrabold tracking-tight text-white"
              style={{ textShadow: "0 2px 12px rgba(0,0,0,0.2)" }}
            >
              {formatCurrency(summary.released)}
            </p>

            <div className="mb-6 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <p className="text-xs text-white/70">
                Funds move from <span className="font-semibold text-white">In Escrow</span> to{" "}
                <span className="font-semibold text-white">Available</span> once a project's milestones
                are marked complete.
              </p>
            </div>
          </div>

          <Button
            variant="secondary"
            size="lg"
            fullWidth
            icon={
              withdrawing
                ? <Loader2 className="h-4 w-4 animate-spin" />
                : <ArrowDownToLine className="h-4 w-4" />
            }
            iconPosition="left"
            onClick={handleWithdraw}
            disabled={withdrawing || summary.released <= 0}
            className="bg-white text-brand-700 hover:bg-brand-50 font-bold shadow-lg"
          >
            {withdrawing ? "Processing…" : "Request Withdrawal"}
          </Button>
        </div>
      </div>

      {/* ── Active Escrow ─────────────────────────────────────────── */}
      <div className="mb-8 rounded-2xl border border-surface-border bg-surface-card shadow-card">
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-ink-900">Active Escrow</h2>
            <p className="text-xs text-ink-400">Funds held pending milestone completion</p>
          </div>
          <Badge tone="warning" dot>{activeEscrow.length} active</Badge>
        </div>

        {activeEscrow.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Clock className="h-8 w-8 text-ink-300" />
            <p className="text-sm text-ink-400">No active escrow contracts</p>
          </div>
        ) : (
          <ul className="divide-y divide-surface-border">
            {activeEscrow.map((earning) => (
              <li key={earning.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-muted/40">
                <Avatar name={nameOf(earning.client)} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{titleOf(earning.job)}</p>
                  <p className="text-xs text-ink-400">
                    Client: <span className="font-medium text-ink-600">{nameOf(earning.client)}</span>
                  </p>
                </div>
                <div className="hidden flex-col items-end sm:flex">
                  <p className="text-sm font-bold text-ink-900">{formatCurrency(earning.amount)}</p>
                  <p className="text-[11px] text-ink-400">
                    Est. release: {escrowReleaseDate(earning.createdAt)}
                  </p>
                </div>
                <Badge tone="warning">In Escrow</Badge>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── Transaction History ───────────────────────────────────── */}
      <div className="rounded-2xl border border-surface-border bg-surface-card shadow-card">
        <div className="flex flex-col gap-2 border-b border-surface-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-base font-bold text-ink-900">Transaction History</h2>
            <p className="text-xs text-ink-400">All earnings with platform fee breakdown</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-3.5 w-3.5" />}
            iconPosition="left"
            onClick={handleDownloadCSV}
            disabled={earnings.length === 0}
          >
            Export CSV
          </Button>
        </div>

        {earnings.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Wallet className="h-8 w-8 text-ink-300" />
            <p className="text-sm text-ink-400">No earnings yet</p>
            <p className="text-xs text-ink-400">
              When a client accepts one of your proposals, it will show up here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-surface-muted/30">
                  <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-ink-400">Project</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-400">Gross</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-400">Fee (10%)</th>
                  <th className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-wide text-ink-400">Net</th>
                  <th className="px-6 py-3 text-center text-xs font-semibold uppercase tracking-wide text-ink-400">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {earnings.map((e) => {
                  const status = toPaymentStatus(e.status);
                  return (
                    <tr key={e.id} className="group transition-colors hover:bg-surface-muted/30">
                      <td className="whitespace-nowrap px-6 py-3.5 text-ink-500">
                        <div className="flex items-center gap-2">
                          {statusIcon(status)}
                          {formatDate(e.createdAt)}
                        </div>
                      </td>
                      <td className="px-4 py-3.5">
                        <div>
                          <p className="font-medium text-ink-900">{titleOf(e.job)}</p>
                          <p className="text-[11px] text-ink-400">{nameOf(e.client)}</p>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-ink-700">
                        {formatCurrency(e.amount)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right text-red-500">
                        -{formatCurrency(platformFee(e.amount))}
                      </td>
                      <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold text-emerald-600">
                        {formatCurrency(netAmount(e.amount))}
                      </td>
                      <td className="px-6 py-3.5 text-center">
                        {statusBadge(status)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>

              <tfoot>
                <tr className="border-t-2 border-surface-border bg-surface-muted/20">
                  <td colSpan={2} className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                    Totals ({earnings.length} project{earnings.length === 1 ? "" : "s"})
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-ink-700">
                    {formatCurrency(earnings.reduce((s, e) => s + e.amount, 0))}
                  </td>
                  <td className="px-4 py-3.5 text-right font-semibold text-red-500">
                    -{formatCurrency(earnings.reduce((s, e) => s + platformFee(e.amount), 0))}
                  </td>
                  <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                    {formatCurrency(earnings.reduce((s, e) => s + netAmount(e.amount), 0))}
                  </td>
                  <td />
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
