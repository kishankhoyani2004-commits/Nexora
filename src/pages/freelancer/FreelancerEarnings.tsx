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
  XCircle,
  AlertCircle,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { FREELANCER_NAV } from "@/constants/nav";
import { useAuth } from "@/context/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { formatCurrency } from "@/utils/formatters";
import type { Contract } from "@/types";

// ─── Types ────────────────────────────────────────────────────────────────────

interface PaymentRecord {
  id: string;
  date: string;
  project: string;
  clientName: string;
  grossAmount: number;
  status: "completed" | "pending" | "failed";
}

interface EarningsSummary {
  totalEarned: number;
  inEscrow: number;
  available: number;
  thisMonth: number;
}

// ─── Demo / Fallback Data ─────────────────────────────────────────────────────

const DEMO_SUMMARY: EarningsSummary = {
  totalEarned: 42_850 * 80,
  inEscrow: 6_200 * 80,
  available: 3_480 * 80,
  thisMonth: 5_100 * 80,
};

const DEMO_PAYMENTS: PaymentRecord[] = [
  { id: "p1", date: "2026-06-28", project: "E-Commerce Redesign", clientName: "Orion Tech", grossAmount: 2400 * 80, status: "completed" },
  { id: "p2", date: "2026-06-15", project: "API Integration", clientName: "BlueWave Labs", grossAmount: 1800 * 80, status: "completed" },
  { id: "p3", date: "2026-05-30", project: "Mobile Dashboard", clientName: "Prism Digital", grossAmount: 3200 * 80, status: "completed" },
  { id: "p4", date: "2026-05-10", project: "Brand Identity Kit", clientName: "Forge Studio", grossAmount: 950 * 80, status: "completed" },
  { id: "p5", date: "2026-04-22", project: "SEO Analytics Tool", clientName: "GrowthHive", grossAmount: 1600 * 80, status: "completed" },
  { id: "p6", date: "2026-04-05", project: "CRM Plugin Dev", clientName: "Nexus Corp", grossAmount: 2200 * 80, status: "failed" },
  { id: "p7", date: "2026-07-01", project: "AI Chatbot MVP", clientName: "Synthos AI", grossAmount: 4800 * 80, status: "pending" },
];

const DEMO_CHART = [
  { month: "Feb", amount: 3200 * 80 },
  { month: "Mar", amount: 5800 * 80 },
  { month: "Apr", amount: 4100 * 80 },
  { month: "May", amount: 6900 * 80 },
  { month: "Jun", amount: 4200 * 80 },
  { month: "Jul", amount: 5100 * 80 },
];

const DEMO_ESCROW: Contract[] = [
  {
    id: "c1",
    title: "AI Chatbot MVP",
    clientId: "Synthos AI",
    freelancerId: "",
    budget: 4800 * 80,
    status: "active",
    escrowStatus: "funded",
    createdAt: "2026-06-29T10:00:00Z",
    updatedAt: "2026-07-01T08:00:00Z",
  } as unknown as Contract,
  {
    id: "c2",
    title: "Cloud Migration",
    clientId: "NimbusOps",
    freelancerId: "",
    budget: 1400 * 80,
    status: "active",
    escrowStatus: "funded",
    createdAt: "2026-07-03T14:00:00Z",
    updatedAt: "2026-07-05T09:00:00Z",
  } as unknown as Contract,
];

// ─── Helpers ──────────────────────────────────────────────────────────────────

const PLATFORM_FEE = 0.1;

function platformFee(gross: number) {
  return gross * PLATFORM_FEE;
}

function netAmount(gross: number) {
  return gross * (1 - PLATFORM_FEE);
}

function statusBadge(status: PaymentRecord["status"]) {
  if (status === "completed") return <Badge tone="success" dot>Completed</Badge>;
  if (status === "pending")  return <Badge tone="warning" dot>Pending</Badge>;
  return <Badge tone="danger" dot>Failed</Badge>;
}

function statusIcon(status: PaymentRecord["status"]) {
  if (status === "completed") return <CheckCircle2 className="h-4 w-4 text-emerald-500" />;
  if (status === "pending")  return <AlertCircle className="h-4 w-4 text-amber-500" />;
  return <XCircle className="h-4 w-4 text-red-500" />;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escrowReleaseDate(createdAt: string) {
  const d = new Date(createdAt);
  d.setDate(d.getDate() + 14);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FreelancerEarnings() {
  const { user } = useAuth();
  const [withdrawing, setWithdrawing] = useState(false);

  // ── Data Fetching ──
  const { data: paymentsData, isLoading: paymentsLoading } = useQuery({
    queryKey: ["payments-history"],
    queryFn: () => apiClient.get<{ data: PaymentRecord[] }>("/payments/history"),
    retry: false,
  });

  const { data: contractsData, isLoading: contractsLoading } = useQuery({
    queryKey: ["freelancer-contracts"],
    queryFn: () => apiClient.get<{ data: Contract[] }>("/contracts"),
    retry: false,
  });

  const payments: PaymentRecord[] = paymentsData?.data?.data ?? DEMO_PAYMENTS;
  const contracts: Contract[] = contractsData?.data?.data ?? DEMO_ESCROW;
  const activeEscrow = contracts.filter((c) => c.escrowStatus === "funded");

  const summary: EarningsSummary = (() => {
    if (paymentsData?.data?.data) {
      const completed = payments.filter((p) => p.status === "completed");
      const pending = payments.filter((p) => p.status === "pending");
      return {
        totalEarned: completed.reduce((s, p) => s + netAmount(p.grossAmount), 0),
        inEscrow: pending.reduce((s, p) => s + p.grossAmount, 0),
        available: DEMO_SUMMARY.available,
        thisMonth: DEMO_SUMMARY.thisMonth,
      };
    }
    return DEMO_SUMMARY;
  })();

  const chartMax = Math.max(...DEMO_CHART.map((d) => d.amount));

  // ── Download CSV ──
  function handleDownloadCSV() {
    const rows = [
      ["Date", "Project", "Gross Amount", "Platform Fee (10%)", "Net Amount", "Status"],
      ...payments.map((p) => [
        formatDate(p.date),
        p.project,
        p.grossAmount.toFixed(2),
        platformFee(p.grossAmount).toFixed(2),
        netAmount(p.grossAmount).toFixed(2),
        p.status,
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

  // ── Withdraw mock ──
  function handleWithdraw() {
    setWithdrawing(true);
    setTimeout(() => setWithdrawing(false), 1800);
  }

  const isLoading = paymentsLoading || contractsLoading;

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
            Track income, escrow balances, and transaction history.
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          icon={<Download className="h-4 w-4" />}
          iconPosition="left"
          onClick={handleDownloadCSV}
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
            value={formatCurrency(summary.totalEarned)}
            delta="+12.4%"
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
            value={formatCurrency(summary.available)}
            icon={ArrowDownToLine}
            tone="success"
          />
          <StatCard
            label="This Month"
            value={formatCurrency(summary.thisMonth)}
            delta="+8.2%"
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
              <p className="text-xs text-ink-400">Last 6 months · Net revenue</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
              <TrendingUp className="h-3.5 w-3.5" /> +19% vs prior period
            </span>
          </div>

          {/* CSS-only Bar Chart */}
          <div className="flex h-44 items-end gap-3">
            {DEMO_CHART.map((entry) => {
              const pct = (entry.amount / chartMax) * 100;
              return (
                <div key={entry.month} className="group flex flex-1 flex-col items-center gap-2">
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
                      height: `${pct}%`,
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
              {formatCurrency(summary.available)}
            </p>

            {/* Bank account mock */}
            <div className="mb-6 flex items-center gap-3 rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20">
                <Landmark className="h-4 w-4 text-white" />
              </span>
              <div>
                <p className="text-xs font-semibold text-white">Chase Bank</p>
                <p className="text-[11px] text-white/60">Checking ****1234</p>
              </div>
              <ChevronRight className="ml-auto h-4 w-4 text-white/40" />
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
            disabled={withdrawing || summary.available <= 0}
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
            {activeEscrow.map((contract) => (
              <li key={contract.id} className="flex items-center gap-4 px-6 py-4 transition-colors hover:bg-surface-muted/40">
                <Avatar name={contract.client?.fullName ?? "Client"} size="sm" />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{contract.title}</p>
                  <p className="text-xs text-ink-400">
                    Client: <span className="font-medium text-ink-600">{contract.client?.fullName ?? "—"}</span>
                  </p>
                </div>
                <div className="hidden flex-col items-end sm:flex">
                  <p className="text-sm font-bold text-ink-900">{formatCurrency(contract.budget)}</p>
                  <p className="text-[11px] text-ink-400">
                    Est. release: {escrowReleaseDate(contract.createdAt)}
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
            <p className="text-xs text-ink-400">All past payments with platform fee breakdown</p>
          </div>
          <Button
            variant="outline"
            size="sm"
            icon={<Download className="h-3.5 w-3.5" />}
            iconPosition="left"
            onClick={handleDownloadCSV}
          >
            Export CSV
          </Button>
        </div>

        {/* Table */}
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
              {payments.map((tx) => (
                <tr
                  key={tx.id}
                  className="group transition-colors hover:bg-surface-muted/30"
                >
                  <td className="whitespace-nowrap px-6 py-3.5 text-ink-500">
                    <div className="flex items-center gap-2">
                      {statusIcon(tx.status)}
                      {formatDate(tx.date)}
                    </div>
                  </td>
                  <td className="px-4 py-3.5">
                    <div>
                      <p className="font-medium text-ink-900">{tx.project}</p>
                      <p className="text-[11px] text-ink-400">{tx.clientName}</p>
                    </div>
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-medium text-ink-700">
                    {formatCurrency(tx.grossAmount)}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right text-red-500">
                    -{formatCurrency(platformFee(tx.grossAmount))}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3.5 text-right font-bold text-emerald-600">
                    {formatCurrency(netAmount(tx.grossAmount))}
                  </td>
                  <td className="px-6 py-3.5 text-center">
                    {statusBadge(tx.status)}
                  </td>
                </tr>
              ))}
            </tbody>

            {/* Footer totals row */}
            <tfoot>
              <tr className="border-t-2 border-surface-border bg-surface-muted/20">
                <td colSpan={2} className="px-6 py-3.5 text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Totals ({payments.filter((p) => p.status === "completed").length} completed)
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-ink-700">
                  {formatCurrency(
                    payments
                      .filter((p) => p.status === "completed")
                      .reduce((s, p) => s + p.grossAmount, 0)
                  )}
                </td>
                <td className="px-4 py-3.5 text-right font-semibold text-red-500">
                  -{formatCurrency(
                    payments
                      .filter((p) => p.status === "completed")
                      .reduce((s, p) => s + platformFee(p.grossAmount), 0)
                  )}
                </td>
                <td className="px-4 py-3.5 text-right font-bold text-emerald-600">
                  {formatCurrency(
                    payments
                      .filter((p) => p.status === "completed")
                      .reduce((s, p) => s + netAmount(p.grossAmount), 0)
                  )}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
