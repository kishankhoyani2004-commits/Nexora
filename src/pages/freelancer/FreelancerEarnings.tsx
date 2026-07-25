import { useMemo, useState } from "react";
import { useSearchParams, Link } from "react-router-dom";
import {
  Wallet, TrendingUp, Clock, CalendarDays, Download, ArrowDownToLine, Landmark,
  Loader2, CheckCircle2, AlertCircle, Search, Eye, X, Receipt, Printer,
  ArrowUpDown, Users, History, XCircle, RefreshCcw, PlusCircle, Banknote,
  Smartphone, ExternalLink,
} from "lucide-react";
import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
} from "recharts";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { Table, TableHead, Th, Td, Tr } from "@/components/ui/Table";
import { Pagination } from "@/components/ui/Pagination";
import { EmptyState } from "@/components/ui/EmptyState";
import { ROUTES } from "@/constants/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { earningService, type Earning } from "@/services/earning.service";
import { withdrawalService, type WithdrawalMethod } from "@/services/withdrawal.service";
import { invoiceService } from "@/services/invoice.service";
import { useNotification } from "@/context/NotificationContext";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/utils/cn";

type Tab = "dashboard" | "transactions" | "withdraw" | "invoices";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function nameOf(ref: Earning["client"]) {
  return typeof ref === "object" ? ref?.fullName ?? "—" : "—";
}

function titleOf(ref: Earning["job"]) {
  return typeof ref === "object" ? ref?.title ?? "—" : "—";
}

// ── Combined transaction row (Earnings + Withdrawals merged into one ledger view) ──
type TxType = "payment" | "withdrawal" | "refund";
type TxStatus = "pending" | "processing" | "completed" | "failed";

interface TxRow {
  id: string;
  type: TxType;
  title: string;
  counterparty: string;
  amount: number;
  status: TxStatus;
  date: string;
  raw: Earning | null;
}

function earningToStatus(status: Earning["status"]): TxStatus {
  if (status === "released" || status === "withdrawn") return "completed";
  if (status === "refunded") return "failed";
  return "pending"; // pending | in_escrow
}

function statusBadge(status: TxStatus) {
  switch (status) {
    case "completed": return <Badge tone="success" dot>Completed</Badge>;
    case "processing": return <Badge tone="info" dot>Processing</Badge>;
    case "failed": return <Badge tone="danger" dot>Failed</Badge>;
    default: return <Badge tone="warning" dot>Pending</Badge>;
  }
}

function typeBadge(type: TxType) {
  switch (type) {
    case "payment": return <Badge tone="brand">Payment Received</Badge>;
    case "withdrawal": return <Badge tone="violet">Withdrawal</Badge>;
    case "refund": return <Badge tone="danger">Refund</Badge>;
  }
}

const PAGE_SIZE = 8;

export default function FreelancerEarnings() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "dashboard";
  const setTab = (t: Tab) => setSearchParams(t === "dashboard" ? {} : { tab: t });

  return (
    <DashboardLayout>
      <div className="mb-6 flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-ink-900">Earnings</h1>
          <p className="mt-0.5 text-sm text-ink-500">Track income, manage withdrawals, and download invoices.</p>
        </div>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-surface-border bg-surface-card p-1 text-sm font-semibold w-fit">
        {([
          ["dashboard", "Dashboard"],
          ["transactions", "Transactions"],
          ["withdraw", "Withdraw Funds"],
          ["invoices", "Invoices"],
        ] as [Tab, string][]).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setTab(key)}
            className={cn(
              "rounded-lg px-4 py-2 transition-colors",
              tab === key ? "bg-brand-600 text-white shadow-sm" : "text-ink-500 hover:text-ink-900"
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "dashboard" && <DashboardTab onGoToTab={setTab} />}
      {tab === "transactions" && <TransactionsTab />}
      {tab === "withdraw" && <WithdrawTab />}
      {tab === "invoices" && <InvoicesTab />}
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════
// DASHBOARD TAB
// ════════════════════════════════════════════════════════════════════════

function DashboardTab({ onGoToTab }: { onGoToTab: (t: Tab) => void }) {
  const { data, isLoading } = useQuery({
    queryKey: ["earnings-dashboard"],
    queryFn: async () => (await earningService.getDashboard()).data.data,
  });

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const d = data ?? {
    totalEarnings: 0, availableBalance: 0, pendingClearance: 0, withdrawnAmount: 0,
    thisMonthEarnings: 0, lastMonthEarnings: 0, lifetimeEarnings: 0,
    earningsByMonth: [], recentPayments: [], topPayingClients: [],
  };

  const momChange = d.lastMonthEarnings > 0
    ? Math.round(((d.thisMonthEarnings - d.lastMonthEarnings) / d.lastMonthEarnings) * 100)
    : null;

  return (
    <>
      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Total Earnings" value={formatCurrency(d.totalEarnings)} icon={Wallet} tone="brand" />
        <StatCard label="Available Balance" value={formatCurrency(d.availableBalance)} icon={ArrowDownToLine} tone="success" />
        <StatCard label="Pending Clearance" value={formatCurrency(d.pendingClearance)} icon={Clock} tone="warning" />
        <StatCard label="Withdrawn Amount" value={formatCurrency(d.withdrawnAmount)} icon={Banknote} tone="info" />
      </div>
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <StatCard
          label="This Month"
          value={formatCurrency(d.thisMonthEarnings)}
          delta={momChange !== null ? `${momChange >= 0 ? "+" : ""}${momChange}% vs last month` : undefined}
          icon={CalendarDays}
          tone="brand"
        />
        <StatCard label="Last Month" value={formatCurrency(d.lastMonthEarnings)} icon={History} tone="info" />
        <StatCard label="Lifetime Earnings" value={formatCurrency(d.lifetimeEarnings)} icon={TrendingUp} tone="success" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        {/* Chart */}
        <div className="lg:col-span-2 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
          <div className="mb-4">
            <h2 className="text-base font-bold text-ink-900">Earnings by Month</h2>
            <p className="text-xs text-ink-400">Last 6 months · Released payments</p>
          </div>
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={d.earningsByMonth} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="earningsGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6c63ff" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#6c63ff" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e4f5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6e4f5", fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="amount" stroke="#6c63ff" strokeWidth={2.5} fill="url(#earningsGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Top Paying Clients */}
        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Users className="h-4 w-4 text-brand-600" />
            <h2 className="text-base font-bold text-ink-900">Top Paying Clients</h2>
          </div>
          {d.topPayingClients.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No client earnings yet.</p>
          ) : (
            <ul className="space-y-3">
              {d.topPayingClients.map((c) => (
                <li key={c.clientId} className="flex items-center gap-3">
                  <Avatar src={c.avatar} name={c.name} size="sm" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{c.name}</p>
                    <p className="text-[11px] text-ink-400">{c.projectCount} project{c.projectCount === 1 ? "" : "s"}</p>
                  </div>
                  <p className="text-sm font-bold text-ink-900">{formatCurrency(c.total)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent Payments */}
      <div className="rounded-2xl border border-surface-border bg-surface-card shadow-card">
        <div className="flex items-center justify-between border-b border-surface-border px-6 py-4">
          <h2 className="text-base font-bold text-ink-900">Recent Payments</h2>
          <button onClick={() => onGoToTab("transactions")} className="text-xs font-semibold text-brand-600 hover:underline">
            View all
          </button>
        </div>
        {d.recentPayments.length === 0 ? (
          <div className="flex flex-col items-center gap-2 py-12 text-center">
            <Wallet className="h-8 w-8 text-ink-300" />
            <p className="text-sm text-ink-400">No payments yet</p>
          </div>
        ) : (
          <ul className="divide-y divide-surface-border">
            {d.recentPayments.map((p) => (
              <li key={p.id} className="flex items-center gap-4 px-6 py-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold text-ink-900">{p.projectTitle}</p>
                  <p className="text-xs text-ink-400">{p.clientName} · {formatDate(p.date)}</p>
                </div>
                <p className="text-sm font-bold text-emerald-600">+{formatCurrency(p.amount)}</p>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TRANSACTIONS TAB
// ════════════════════════════════════════════════════════════════════════

function TransactionsTab() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<"all" | TxType>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | TxStatus>("all");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [viewing, setViewing] = useState<TxRow | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const { notify } = useNotification();

  const { data: earningsData, isLoading: loadingEarnings } = useQuery({
    queryKey: ["earnings"],
    queryFn: async () => (await earningService.getEarnings()).data.data,
  });
  const { data: withdrawals, isLoading: loadingWithdrawals } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => (await withdrawalService.getHistory()).data.data,
  });

  const isLoading = loadingEarnings || loadingWithdrawals;

  const rows: TxRow[] = useMemo(() => {
    const earningRows: TxRow[] = (earningsData?.earnings ?? []).map((e) => ({
      id: e.id,
      type: e.status === "refunded" ? "refund" : "payment",
      title: titleOf(e.job),
      counterparty: nameOf(e.client),
      amount: e.amount,
      status: earningToStatus(e.status),
      date: e.updatedAt || e.createdAt,
      raw: e,
    }));
    const withdrawalRows: TxRow[] = (withdrawals ?? []).map((w) => ({
      id: w.id,
      type: "withdrawal",
      title: `${w.method === "bank" ? "Bank Transfer" : w.method === "upi" ? "UPI" : "PayPal"} Withdrawal`,
      counterparty: w.reference,
      amount: w.amount,
      status: w.status === "rejected" ? "failed" : (w.status as TxStatus),
      date: w.createdAt,
      raw: null,
    }));
    return [...earningRows, ...withdrawalRows];
  }, [earningsData, withdrawals]);

  const filtered = useMemo(() => {
    let result = rows;
    if (typeFilter !== "all") result = result.filter((r) => r.type === typeFilter);
    if (statusFilter !== "all") result = result.filter((r) => r.status === statusFilter);
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((r) => r.title.toLowerCase().includes(q) || r.counterparty.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDir === "desc" ? -diff : diff;
    });
    return result;
  }, [rows, typeFilter, statusFilter, search, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleDownloadReceipt = async (row: TxRow) => {
    if (!row.raw) return;
    try {
      setDownloadingId(row.id);
      const { paymentService } = await import("@/services/payment.service");
      await paymentService.downloadReceipt(row.id, `TXN-${row.id.slice(-8).toUpperCase()}`);
    } catch {
      notify("Failed to download receipt.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card shadow-card">
      <div className="flex flex-col gap-3 border-b border-surface-border px-6 py-4 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-base font-bold text-ink-900">Transaction History</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search project or client..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 w-56"
          />
          <Select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value as any); setPage(1); }} className="h-9 w-40">
            <option value="all">All Types</option>
            <option value="payment">Payment Received</option>
            <option value="withdrawal">Withdrawal</option>
            <option value="refund">Refund</option>
          </Select>
          <Select value={statusFilter} onChange={(e) => { setStatusFilter(e.target.value as any); setPage(1); }} className="h-9 w-36">
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </Select>
          <button
            onClick={() => setSortDir((s) => (s === "desc" ? "asc" : "desc"))}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-surface-border px-3 text-xs font-semibold text-ink-600 hover:border-brand-400"
          >
            <ArrowUpDown className="h-3.5 w-3.5" /> {sortDir === "desc" ? "Newest" : "Oldest"}
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wallet} title="No transactions found" description="Try adjusting your search or filters." />
      ) : (
        <>
          <Table>
            <TableHead>
              <Th>Type</Th>
              <Th>Project / Reference</Th>
              <Th>Counterparty</Th>
              <Th className="text-right">Amount</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th className="text-right">Actions</Th>
            </TableHead>
            <tbody>
              {pageRows.map((r) => (
                <Tr key={`${r.type}-${r.id}`}>
                  <Td>{typeBadge(r.type)}</Td>
                  <Td className="font-semibold text-ink-900">{r.title}</Td>
                  <Td className="text-ink-600">{r.counterparty}</Td>
                  <Td className={cn("text-right font-bold", r.type === "withdrawal" ? "text-ink-900" : "text-emerald-600")}>
                    {r.type === "withdrawal" ? "-" : "+"}{formatCurrency(r.amount)}
                  </Td>
                  <Td className="text-xs text-ink-500">{formatDate(r.date)}</Td>
                  <Td>{statusBadge(r.status)}</Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setViewing(r)} className="rounded-lg p-1.5 bg-surface-muted hover:bg-surface-border text-ink-500 hover:text-ink-900" title="View Details">
                        <Eye className="h-4 w-4" />
                      </button>
                      {r.type !== "withdrawal" && (
                        <button
                          onClick={() => handleDownloadReceipt(r)}
                          disabled={downloadingId === r.id}
                          className="rounded-lg p-1.5 bg-surface-muted hover:bg-surface-border text-ink-500 hover:text-ink-900 disabled:opacity-50"
                          title="Download Receipt"
                        >
                          {downloadingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="flex justify-center border-t border-surface-border px-6 py-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {viewing && (
        <Modal isOpen onClose={() => setViewing(null)} title="Transaction Details">
          <div className="space-y-2.5 text-sm">
            {[
              ["Type", <span key="t">{typeBadge(viewing.type)}</span>],
              ["Project / Reference", viewing.title],
              ["Counterparty", viewing.counterparty],
              ["Amount", formatCurrency(viewing.amount)],
              ["Date", new Date(viewing.date).toLocaleString()],
            ].map(([label, value]) => (
              <div key={String(label)} className="flex items-center justify-between border-b border-surface-border pb-2 last:border-0">
                <span className="text-ink-500">{label}</span>
                <span className="font-semibold text-ink-900">{value}</span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-1">
              <span className="text-ink-500">Status</span>
              {statusBadge(viewing.status)}
            </div>
          </div>
          <div className="mt-5 flex justify-end">
            <Button variant="outline" onClick={() => setViewing(null)}>Close</Button>
          </div>
        </Modal>
      )}
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// WITHDRAW TAB
// ════════════════════════════════════════════════════════════════════════

function WithdrawTab() {
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<WithdrawalMethod>("bank");
  const [accountHolderName, setAccountHolderName] = useState("");
  const [accountNumber, setAccountNumber] = useState("");
  const [ifscCode, setIfscCode] = useState("");
  const [bankName, setBankName] = useState("");
  const [upiId, setUpiId] = useState("");
  const [paypalEmail, setPaypalEmail] = useState("");

  const { data: balanceData, isLoading: loadingBalance } = useQuery({
    queryKey: ["withdrawal-balance"],
    queryFn: async () => (await withdrawalService.getBalance()).data.data,
  });
  const { data: history, isLoading: loadingHistory } = useQuery({
    queryKey: ["withdrawals"],
    queryFn: async () => (await withdrawalService.getHistory()).data.data,
  });

  const available = balanceData?.available ?? 0;

  const mutation = useMutation({
    mutationFn: () =>
      withdrawalService.requestWithdrawal({
        amount: Number(amount),
        method,
        destination:
          method === "bank"
            ? { accountHolderName, accountNumber, ifscCode, bankName }
            : method === "upi"
            ? { upiId }
            : { paypalEmail },
      }),
    onSuccess: () => {
      notify("Withdrawal request submitted successfully.", "success");
      setAmount("");
      setAccountHolderName(""); setAccountNumber(""); setIfscCode(""); setBankName("");
      setUpiId(""); setPaypalEmail("");
      queryClient.invalidateQueries({ queryKey: ["withdrawal-balance"] });
      queryClient.invalidateQueries({ queryKey: ["withdrawals"] });
      queryClient.invalidateQueries({ queryKey: ["earnings-dashboard"] });
    },
    onError: (err: any) => {
      notify(err.response?.data?.message || "Failed to submit withdrawal request.", "error");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate();
  };

  const withdrawalStatusBadge = (status: string) => {
    if (status === "completed") return <Badge tone="success" dot>Completed</Badge>;
    if (status === "processing") return <Badge tone="info" dot>Processing</Badge>;
    if (status === "failed" || status === "rejected") return <Badge tone="danger" dot>Failed</Badge>;
    return <Badge tone="warning" dot>Pending</Badge>;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-6">
        <form onSubmit={handleSubmit} className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card space-y-5">
          <div>
            <h2 className="text-base font-bold text-ink-900">Request Withdrawal</h2>
            <p className="text-xs text-ink-400">Minimum withdrawal amount is ₹500. Funds are typically processed within a few minutes for this demo.</p>
          </div>

          <Input
            label="Amount (₹)"
            type="number"
            min={500}
            step={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="e.g. 5000"
            required
            hint={`Available: ${formatCurrency(available)}`}
          />

          <div>
            <label className="mb-1.5 block text-sm font-medium text-ink-700">Withdrawal Method</label>
            <div className="grid grid-cols-3 gap-2">
              {([
                ["bank", "Bank Transfer", Landmark],
                ["upi", "UPI", Smartphone],
                ["paypal", "PayPal", ExternalLink],
              ] as [WithdrawalMethod, string, typeof Landmark][]).map(([key, label, Icon]) => (
                <button
                  type="button"
                  key={key}
                  onClick={() => setMethod(key)}
                  className={cn(
                    "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition-colors",
                    method === key ? "border-brand-500 bg-brand-50 text-brand-700" : "border-surface-border text-ink-500 hover:border-brand-300"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </button>
              ))}
            </div>
            {method === "paypal" && (
              <p className="mt-2 flex items-center gap-1.5 text-xs text-amber-600">
                <AlertCircle className="h-3.5 w-3.5" /> PayPal payouts are coming soon — use Bank Transfer or UPI for now.
              </p>
            )}
          </div>

          {method === "bank" && (
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Account Holder Name" value={accountHolderName} onChange={(e) => setAccountHolderName(e.target.value)} required />
              <Input label="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} required />
              <Input label="Account Number" value={accountNumber} onChange={(e) => setAccountNumber(e.target.value)} required />
              <Input label="IFSC Code" value={ifscCode} onChange={(e) => setIfscCode(e.target.value.toUpperCase())} required />
            </div>
          )}
          {method === "upi" && (
            <Input label="UPI ID" placeholder="yourname@upi" value={upiId} onChange={(e) => setUpiId(e.target.value)} required />
          )}
          {method === "paypal" && (
            <Input label="PayPal Email" type="email" value={paypalEmail} onChange={(e) => setPaypalEmail(e.target.value)} required />
          )}

          <Button
            type="submit"
            fullWidth
            size="lg"
            icon={mutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <ArrowDownToLine className="h-4 w-4" />}
            iconPosition="left"
            disabled={mutation.isPending || method === "paypal" || !amount || Number(amount) > available}
          >
            {mutation.isPending ? "Submitting…" : "Request Withdrawal"}
          </Button>
        </form>

        {/* Withdrawal History */}
        <div className="rounded-2xl border border-surface-border bg-surface-card shadow-card">
          <div className="border-b border-surface-border px-6 py-4">
            <h2 className="text-base font-bold text-ink-900">Withdrawal History</h2>
          </div>
          {loadingHistory ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
            </div>
          ) : !history || history.length === 0 ? (
            <EmptyState icon={ArrowDownToLine} title="No withdrawals yet" description="Your withdrawal requests will show up here." />
          ) : (
            <ul className="divide-y divide-surface-border">
              {history.map((w) => (
                <li key={w.id} className="flex items-center gap-4 px-6 py-4">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-50 text-violet-600">
                    {w.method === "bank" ? <Landmark className="h-4 w-4" /> : w.method === "upi" ? <Smartphone className="h-4 w-4" /> : <ExternalLink className="h-4 w-4" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-ink-900">{w.reference}</p>
                    <p className="text-xs text-ink-400">
                      {w.method === "bank" ? "Bank Transfer" : w.method === "upi" ? "UPI" : "PayPal"} · {formatDate(w.createdAt)}
                    </p>
                  </div>
                  <p className="text-sm font-bold text-ink-900">{formatCurrency(w.amount)}</p>
                  {withdrawalStatusBadge(w.status)}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Balance panel */}
      <div
        className="flex flex-col justify-between rounded-2xl p-6 shadow-card h-fit"
        style={{ background: "linear-gradient(145deg,#6c63ff 0%,#9b59f0 60%,#c084fc 100%)" }}
      >
        <div>
          <div className="mb-4 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-white/20">
              <Landmark className="h-5 w-5 text-white" />
            </span>
            <span className="text-sm font-semibold text-white/80">Available Balance</span>
          </div>
          <p className="mb-1 text-xs font-medium uppercase tracking-widest text-white/60">Ready to withdraw</p>
          <p className="mb-6 text-4xl font-extrabold tracking-tight text-white" style={{ textShadow: "0 2px 12px rgba(0,0,0,0.2)" }}>
            {loadingBalance ? "—" : formatCurrency(available)}
          </p>
          <div className="rounded-xl bg-white/10 px-4 py-3 backdrop-blur-sm">
            <p className="text-xs text-white/70">
              Funds become available once a client releases payment for a milestone. Amounts already requested for withdrawal are reserved until processed.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ════════════════════════════════════════════════════════════════════════
// INVOICES TAB
// ════════════════════════════════════════════════════════════════════════

function InvoicesTab() {
  const { notify } = useNotification();
  const [viewingId, setViewingId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const { data: invoices, isLoading } = useQuery({
    queryKey: ["invoices"],
    queryFn: async () => (await invoiceService.list()).data.data,
  });

  const viewing = invoices?.find((i) => i.id === viewingId) || null;

  const handleDownload = async (id: string, invoiceNumber: string) => {
    try {
      setBusyId(id);
      await invoiceService.downloadPdf(id, invoiceNumber);
    } catch {
      notify("Failed to download invoice.", "error");
    } finally {
      setBusyId(null);
    }
  };

  const handlePrint = async (id: string) => {
    try {
      setBusyId(id);
      await invoiceService.printPdf(id);
    } catch {
      notify("Failed to open invoice for printing.", "error");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card shadow-card">
      <div className="border-b border-surface-border px-6 py-4">
        <h2 className="text-base font-bold text-ink-900">Invoices</h2>
        <p className="text-xs text-ink-400">Auto-generated for every completed payment.</p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-500" />
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" description="Invoices are generated automatically once a client releases payment." />
      ) : (
        <Table>
          <TableHead>
            <Th>Invoice #</Th>
            <Th>Project</Th>
            <Th>Client</Th>
            <Th className="text-right">Net Amount</Th>
            <Th>Status</Th>
            <Th>Date</Th>
            <Th className="text-right">Actions</Th>
          </TableHead>
          <tbody>
            {invoices.map((inv) => (
              <Tr key={inv.id}>
                <Td className="font-mono text-xs text-ink-500">{inv.invoiceNumber}</Td>
                <Td className="font-semibold text-ink-900">
                  {inv.projectTitle}
                  {inv.milestoneTitle && <span className="block text-[10px] font-normal text-ink-400">{inv.milestoneTitle}</span>}
                </Td>
                <Td className="text-ink-600">{inv.clientName}</Td>
                <Td className="text-right font-bold text-emerald-600">{formatCurrency(inv.netAmount)}</Td>
                <Td><Badge tone={inv.status === "paid" ? "success" : "danger"} dot className="capitalize">{inv.status}</Badge></Td>
                <Td className="text-xs text-ink-500">{formatDate(inv.issuedAt)}</Td>
                <Td className="text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    <button onClick={() => setViewingId(inv.id)} className="rounded-lg p-1.5 bg-surface-muted hover:bg-surface-border text-ink-500 hover:text-ink-900" title="View">
                      <Eye className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDownload(inv.id, inv.invoiceNumber)}
                      disabled={busyId === inv.id}
                      className="rounded-lg p-1.5 bg-surface-muted hover:bg-surface-border text-ink-500 hover:text-ink-900 disabled:opacity-50"
                      title="Download PDF"
                    >
                      {busyId === inv.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => handlePrint(inv.id)}
                      disabled={busyId === inv.id}
                      className="rounded-lg p-1.5 bg-surface-muted hover:bg-surface-border text-ink-500 hover:text-ink-900 disabled:opacity-50"
                      title="Print"
                    >
                      <Printer className="h-4 w-4" />
                    </button>
                  </div>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}

      {viewing && (
        <Modal isOpen onClose={() => setViewingId(null)} title={viewing.invoiceNumber}>
          <div className="space-y-2.5 text-sm">
            <div className="flex justify-between border-b border-surface-border pb-2">
              <span className="text-ink-500">Project</span>
              <span className="font-semibold text-ink-900">{viewing.projectTitle}</span>
            </div>
            {viewing.milestoneTitle && (
              <div className="flex justify-between border-b border-surface-border pb-2">
                <span className="text-ink-500">Milestone</span>
                <span className="font-semibold text-ink-900">{viewing.milestoneTitle}</span>
              </div>
            )}
            <div className="flex justify-between border-b border-surface-border pb-2">
              <span className="text-ink-500">Client</span>
              <span className="font-semibold text-ink-900">{viewing.clientName}</span>
            </div>
            <div className="flex justify-between border-b border-surface-border pb-2">
              <span className="text-ink-500">Gross Amount</span>
              <span className="font-semibold text-ink-900">{formatCurrency(viewing.amount)}</span>
            </div>
            <div className="flex justify-between border-b border-surface-border pb-2">
              <span className="text-ink-500">Platform Fee</span>
              <span className="font-semibold text-red-500">-{formatCurrency(viewing.platformFee)}</span>
            </div>
            <div className="flex justify-between border-b border-surface-border pb-2">
              <span className="text-ink-500">Tax</span>
              <span className="font-semibold text-red-500">-{formatCurrency(viewing.taxAmount)}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-ink-500 font-semibold">Net Amount</span>
              <span className="font-bold text-emerald-600">{formatCurrency(viewing.netAmount)}</span>
            </div>
            <div className="flex items-center justify-between pt-1">
              <span className="text-ink-500">Status</span>
              <Badge tone={viewing.status === "paid" ? "success" : "danger"} dot className="capitalize">{viewing.status}</Badge>
            </div>
          </div>
          <div className="mt-5 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setViewingId(null)}>Close</Button>
            <Button icon={<Download className="h-4 w-4" />} iconPosition="left" onClick={() => handleDownload(viewing.id, viewing.invoiceNumber)} isLoading={busyId === viewing.id}>
              Download PDF
            </Button>
          </div>
        </Modal>
      )}
    </div>
  );
}
