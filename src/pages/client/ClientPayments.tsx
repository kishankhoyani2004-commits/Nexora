import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  CreditCard, ShieldCheck, Undo2, Plus, Loader2, CheckCircle2,
  Eye, Download, X, Wallet, Search, ArrowUpDown, Printer, Receipt,
  Building2, Smartphone, Landmark, Trash2, Star, Clock, TrendingUp,
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
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentService, type TransactionDto } from "@/services/payment.service";
import { invoiceService } from "@/services/invoice.service";
import { billingService, type BillingMethod, type BillingMethodType } from "@/services/billing.service";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/utils/cn";

type Tab = "payments" | "transactions" | "invoices" | "billing";

const METHOD_LABELS: Record<string, string> = {
  escrow: "Escrow",
  stripe: "Stripe",
  card: "Card",
  bank_transfer: "Bank Transfer",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

export default function ClientPayments() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get("tab") as Tab) || "payments";
  const setTab = (t: Tab) => setSearchParams(t === "payments" ? {} : { tab: t });

  return (
    <DashboardLayout tagline="Client Hub" searchPlaceholder="Search payments...">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Finance</h1>
        <p className="text-sm text-ink-500">Manage payments, transactions, invoices, and billing.</p>
      </div>

      <div className="mb-6 flex gap-1 rounded-xl border border-surface-border bg-surface-card p-1 text-sm font-semibold w-fit">
        {([
          ["payments", "Payments"],
          ["transactions", "Transactions"],
          ["invoices", "Invoices"],
          ["billing", "Billing"],
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

      {tab === "payments" && <PaymentsTab onGoToTab={setTab} />}
      {tab === "transactions" && <TransactionsTab />}
      {tab === "invoices" && <InvoicesTab />}
      {tab === "billing" && <BillingTab />}
    </DashboardLayout>
  );
}

// ════════════════════════════════════════════════════════════════════════
// PAYMENTS TAB
// ════════════════════════════════════════════════════════════════════════

function PaymentsTab({ onGoToTab }: { onGoToTab: (t: Tab) => void }) {
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  const confirm = useConfirm();
  const [releasingId, setReleasingId] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["client-finance-dashboard"],
    queryFn: async () => (await paymentService.getDashboard()).data.data,
  });

  const { data: releasableRes, isLoading: loadingReleasable } = useQuery({
    queryKey: ["releasable-milestones"],
    queryFn: async () => (await paymentService.getReleasableMilestones()).data,
  });
  const releasableMilestones = releasableRes?.data || [];

  const releaseMutation = useMutation({
    mutationFn: (milestoneId: string) => paymentService.releaseMilestonePayment(milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releasable-milestones"] });
      queryClient.invalidateQueries({ queryKey: ["paymentsHistory"] });
      queryClient.invalidateQueries({ queryKey: ["client-finance-dashboard"] });
      notify("Milestone payment released to the freelancer!", "success");
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to release payment.", "error"),
    onSettled: () => setReleasingId(null),
  });

  const handleRelease = async (milestoneId: string, title: string) => {
    if (await confirm({ title: "Release Payment", message: `Release payment for milestone "${title}"? This action is irreversible.`, confirmLabel: "Release" })) {
      setReleasingId(milestoneId);
      releaseMutation.mutate(milestoneId);
    }
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-brand-500" />
      </div>
    );
  }

  const d = data ?? {
    pendingPayments: { count: 0, amount: 0 },
    completedPayments: { count: 0, amount: 0 },
    upcomingPayments: { count: 0, amount: 0 },
    totalSpent: 0,
    monthlySpending: 0,
    monthlySpendingChart: [],
    recentPayments: [],
  };

  return (
    <>
      <div className="mb-8 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Pending Payments" value={formatCurrency(d.pendingPayments.amount)} delta={`${d.pendingPayments.count} in escrow`} icon={Clock} tone="warning" />
        <StatCard label="Completed Payments" value={formatCurrency(d.completedPayments.amount)} delta={`${d.completedPayments.count} paid`} icon={CheckCircle2} tone="success" />
        <StatCard label="Upcoming Payments" value={formatCurrency(d.upcomingPayments.amount)} delta={`${d.upcomingPayments.count} awaiting release`} icon={ShieldCheck} tone="info" />
        <StatCard label="Total Spent" value={formatCurrency(d.totalSpent)} icon={CreditCard} tone="brand" />
      </div>

      <div className="mb-8 grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-ink-900">Monthly Spending</h2>
              <p className="text-xs text-ink-400">Last 6 months</p>
            </div>
            <span className="flex items-center gap-1.5 rounded-full bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-600">
              <TrendingUp className="h-3.5 w-3.5" /> {formatCurrency(d.monthlySpending)} this month
            </span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={d.monthlySpendingChart} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="clientSpendGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#5b4fee" stopOpacity={0.35} />
                  <stop offset="100%" stopColor="#5b4fee" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e6e4f5" />
              <XAxis dataKey="month" axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} />
              <YAxis axisLine={false} tickLine={false} tick={{ fill: "#918da3", fontSize: 11 }} tickFormatter={(v) => formatCurrency(v, { compact: true })} />
              <Tooltip contentStyle={{ borderRadius: 12, border: "1px solid #e6e4f5", fontSize: 12 }} formatter={(v) => formatCurrency(Number(v))} />
              <Area type="monotone" dataKey="amount" stroke="#5b4fee" strokeWidth={2.5} fill="url(#clientSpendGradient)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        {/* Recent Payments */}
        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink-900">Recent Payments</h2>
            <button onClick={() => onGoToTab("transactions")} className="text-xs font-semibold text-brand-600 hover:underline">
              View all
            </button>
          </div>
          {d.recentPayments.length === 0 ? (
            <p className="py-8 text-center text-sm text-ink-400">No payments yet.</p>
          ) : (
            <ul className="space-y-3">
              {d.recentPayments.map((p) => (
                <li key={p.id} className="flex items-center gap-3">
                  <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                    <CheckCircle2 className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{p.projectTitle}</p>
                    <p className="text-[11px] text-ink-400">{p.freelancerName} · {formatDate(p.date)}</p>
                  </div>
                  <p className="text-sm font-bold text-ink-900">{formatCurrency(p.amount)}</p>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Release Milestone Payment */}
      <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
        <h2 className="text-base font-bold text-ink-900 mb-1">Release Milestone Payment</h2>
        <p className="text-xs text-ink-500 mb-4">Milestones submitted by freelancers, awaiting your payment release.</p>
        {loadingReleasable ? (
          <div className="flex h-24 items-center justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
          </div>
        ) : releasableMilestones.length === 0 ? (
          <div className="py-8 text-center text-sm text-ink-400">No milestones awaiting payment release.</div>
        ) : (
          <div className="divide-y divide-surface-border">
            {releasableMilestones.map((m) => (
              <div key={m.milestoneId} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={m.freelancerAvatar} name={m.freelancerName} size="md" />
                  <div>
                    <h4 className="font-bold text-ink-900">{m.title}</h4>
                    <p className="text-xs text-ink-500">{m.projectTitle} • {m.freelancerName}</p>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-4 sm:justify-end">
                  <div className="text-right">
                    <p className="text-sm font-bold text-ink-900">{formatCurrency(m.budget)}</p>
                    <p className="text-[10px] text-ink-400">Submitted</p>
                  </div>
                  <Button size="sm" onClick={() => handleRelease(m.milestoneId, m.title)} isLoading={releasingId === m.milestoneId}>
                    Release Payment
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ════════════════════════════════════════════════════════════════════════
// TRANSACTIONS TAB
// ════════════════════════════════════════════════════════════════════════

const PAGE_SIZE = 8;
type StatusFilter = "all" | "completed" | "pending" | "refunded";

function TransactionsTab() {
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  const confirm = useConfirm();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [search, setSearch] = useState("");
  const [sortDir, setSortDir] = useState<"desc" | "asc">("desc");
  const [page, setPage] = useState(1);
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingTx, setViewingTx] = useState<TransactionDto | null>(null);

  const { data: txRes, isLoading: loadingTx } = useQuery({
    queryKey: ["paymentsHistory", filter],
    queryFn: async () => (await paymentService.listTransactions(filter === "all" ? undefined : filter)).data,
  });
  const transactions = txRes?.data || [];

  const refundMutation = useMutation({
    mutationFn: (earningId: string) => paymentService.refundPayment(earningId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentsHistory"] });
      queryClient.invalidateQueries({ queryKey: ["client-finance-dashboard"] });
      notify("Refund processed successfully.", "success");
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to process refund.", "error"),
    onSettled: () => setRefundingId(null),
  });

  const handleRefund = async (tx: TransactionDto) => {
    if (await confirm({ title: "Refund Payment", message: `Refund ${formatCurrency(tx.amount)} for "${tx.projectTitle}"? This cannot be undone.`, confirmLabel: "Refund" })) {
      setRefundingId(tx.id);
      refundMutation.mutate(tx.id);
    }
  };

  const handleDownloadReceipt = async (tx: TransactionDto) => {
    try {
      setDownloadingId(tx.id);
      await paymentService.downloadReceipt(tx.id, tx.transactionId);
    } catch {
      notify("Failed to download receipt.", "error");
    } finally {
      setDownloadingId(null);
    }
  };

  const filtered = useMemo(() => {
    let result = transactions;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      result = result.filter((t) => t.projectTitle.toLowerCase().includes(q) || t.freelancerName.toLowerCase().includes(q));
    }
    result = [...result].sort((a, b) => {
      const diff = new Date(a.date).getTime() - new Date(b.date).getTime();
      return sortDir === "desc" ? -diff : diff;
    });
    return result;
  }, [transactions, search, sortDir]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const pageRows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const FILTERS: { key: StatusFilter; label: string }[] = [
    { key: "all", label: "All" },
    { key: "completed", label: "Completed" },
    { key: "pending", label: "Pending" },
    { key: "refunded", label: "Refunded" },
  ];

  return (
    <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <h2 className="text-lg font-bold text-ink-900">Transaction History</h2>
        <div className="flex flex-wrap items-center gap-2">
          <Input
            icon={<Search className="h-4 w-4" />}
            placeholder="Search project or freelancer..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 w-56"
          />
          <div className="flex rounded-xl bg-surface-muted p-1 text-xs font-semibold">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => { setFilter(f.key); setPage(1); }}
                className={cn(
                  "px-3 py-1.5 rounded-lg transition-colors",
                  filter === f.key ? "bg-surface-card text-brand-600 shadow-sm" : "text-ink-500 hover:text-ink-900"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <button
            onClick={() => setSortDir((s) => (s === "desc" ? "asc" : "desc"))}
            className="flex h-9 items-center gap-1.5 rounded-xl border border-surface-border px-3 text-xs font-semibold text-ink-600 hover:border-brand-400"
          >
            <ArrowUpDown className="h-3.5 w-3.5" /> {sortDir === "desc" ? "Newest" : "Oldest"}
          </button>
        </div>
      </div>

      {loadingTx ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState icon={Wallet} title="No transactions found" description="Try adjusting your search or filters." />
      ) : (
        <>
          <Table>
            <TableHead>
              <Th>Transaction ID</Th>
              <Th>Project</Th>
              <Th>Freelancer</Th>
              <Th className="text-right">Amount</Th>
              <Th>Date</Th>
              <Th>Status</Th>
              <Th>Method</Th>
              <Th className="text-right">Actions</Th>
            </TableHead>
            <tbody>
              {pageRows.map((t) => (
                <Tr key={t.id}>
                  <Td className="font-mono text-xs text-ink-500">{t.transactionId}</Td>
                  <Td className="font-semibold text-ink-900">
                    {t.projectTitle}
                    {t.milestoneTitle && <span className="block text-[10px] font-normal text-ink-400">{t.milestoneTitle}</span>}
                  </Td>
                  <Td className="text-ink-600">{t.freelancerName}</Td>
                  <Td className="text-right font-bold">{formatCurrency(t.amount)}</Td>
                  <Td className="text-xs text-ink-500">{formatDate(t.date)}</Td>
                  <Td>
                    <Badge tone={t.status === "completed" ? "success" : t.status === "refunded" ? "danger" : "warning"} className="capitalize">
                      {t.status}
                    </Badge>
                  </Td>
                  <Td className="text-xs text-ink-500">{METHOD_LABELS[t.method] || t.method}</Td>
                  <Td className="text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      <button onClick={() => setViewingTx(t)} className="rounded-lg p-1.5 bg-surface-muted hover:bg-surface-border text-ink-500 hover:text-ink-900" title="View Payment Details">
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDownloadReceipt(t)}
                        disabled={downloadingId === t.id}
                        className="rounded-lg p-1.5 bg-surface-muted hover:bg-surface-border text-ink-500 hover:text-ink-900 disabled:opacity-50"
                        title="Download Receipt"
                      >
                        {downloadingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                      </button>
                      {t.status === "completed" && (
                        <button
                          onClick={() => handleRefund(t)}
                          disabled={refundingId === t.id}
                          className="rounded-lg p-1.5 bg-surface-muted hover:bg-danger/10 text-ink-500 hover:text-danger disabled:opacity-50"
                          title="Refund"
                        >
                          {refundingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                        </button>
                      )}
                    </div>
                  </Td>
                </Tr>
              ))}
            </tbody>
          </Table>
          <div className="flex justify-center pt-4">
            <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        </>
      )}

      {viewingTx && (
        <Modal isOpen onClose={() => setViewingTx(null)} title="Payment Details">
          <div className="space-y-2.5 text-sm">
            {[
              ["Transaction ID", viewingTx.transactionId],
              ["Project", viewingTx.projectTitle],
              ...(viewingTx.milestoneTitle ? [["Milestone", viewingTx.milestoneTitle]] : []),
              ["Freelancer", viewingTx.freelancerName],
              ["Amount", formatCurrency(viewingTx.amount)],
              ["Payment Method", METHOD_LABELS[viewingTx.method] || viewingTx.method],
              ["Payment Date", new Date(viewingTx.date).toLocaleString()],
            ].map(([label, value]) => (
              <div key={label} className="flex justify-between border-b border-surface-border pb-2 last:border-0">
                <span className="text-ink-500">{label}</span>
                <span className="font-semibold text-ink-900 text-right">{value}</span>
              </div>
            ))}
            <div className="flex justify-between items-center pt-1">
              <span className="text-ink-500">Status</span>
              <Badge tone={viewingTx.status === "completed" ? "success" : viewingTx.status === "refunded" ? "danger" : "warning"} className="capitalize">
                {viewingTx.status}
              </Badge>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-4">
            <Button variant="outline" onClick={() => setViewingTx(null)}>Close</Button>
            <Button icon={<Download className="h-4 w-4" />} iconPosition="left" onClick={() => handleDownloadReceipt(viewingTx)} isLoading={downloadingId === viewingTx.id}>
              Download Receipt
            </Button>
          </div>
        </Modal>
      )}
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
    <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
      <div className="mb-4">
        <h2 className="text-lg font-bold text-ink-900">Invoices</h2>
        <p className="text-xs text-ink-500">Auto-generated for every payment made to a freelancer.</p>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : !invoices || invoices.length === 0 ? (
        <EmptyState icon={Receipt} title="No invoices yet" description="Invoices are generated automatically once you release a payment." />
      ) : (
        <Table>
          <TableHead>
            <Th>Invoice #</Th>
            <Th>Project</Th>
            <Th>Freelancer</Th>
            <Th className="text-right">Amount</Th>
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
                <Td className="text-ink-600">{inv.freelancerName}</Td>
                <Td className="text-right font-bold">{formatCurrency(inv.amount)}</Td>
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
              <span className="text-ink-500">Freelancer</span>
              <span className="font-semibold text-ink-900">{viewing.freelancerName}</span>
            </div>
            <div className="flex justify-between border-b border-surface-border pb-2">
              <span className="text-ink-500">Amount Paid</span>
              <span className="font-semibold text-ink-900">{formatCurrency(viewing.amount)}</span>
            </div>
            <div className="flex justify-between border-b border-surface-border pb-2">
              <span className="text-ink-500">Platform Fee</span>
              <span className="font-semibold text-ink-500">{formatCurrency(viewing.platformFee)}</span>
            </div>
            <div className="flex justify-between pb-2">
              <span className="text-ink-500">Tax</span>
              <span className="font-semibold text-ink-500">{formatCurrency(viewing.taxAmount)}</span>
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

// ════════════════════════════════════════════════════════════════════════
// BILLING TAB
// ════════════════════════════════════════════════════════════════════════

function BillingTab() {
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  const confirm = useConfirm();
  const [addingOpen, setAddingOpen] = useState(false);
  const [methodType, setMethodType] = useState<BillingMethodType>("card");
  const [cardNumber, setCardNumber] = useState("");
  const [cardBrand, setCardBrand] = useState("Visa");
  const [expiryMonth, setExpiryMonth] = useState("");
  const [expiryYear, setExpiryYear] = useState("");
  const [upiId, setUpiId] = useState("");
  const [bankName, setBankName] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [profileForm, setProfileForm] = useState({ companyName: "", address: "", gstId: "", country: "", state: "", city: "" });
  const [profileDirty, setProfileDirty] = useState(false);

  const { data: methods, isLoading: loadingMethods } = useQuery({
    queryKey: ["billing-methods"],
    queryFn: async () => (await billingService.getMethods()).data.data,
  });

  const { isLoading: loadingProfile } = useQuery({
    queryKey: ["billing-profile"],
    queryFn: async () => {
      const profile = (await billingService.getProfile()).data.data;
      setProfileForm(profile);
      return profile;
    },
  });

  const addMutation = useMutation({
    mutationFn: () =>
      billingService.addMethod(
        methodType === "card"
          ? { type: "card", cardNumber, cardBrand, expiryMonth: Number(expiryMonth), expiryYear: Number(expiryYear) }
          : methodType === "upi"
          ? { type: "upi", upiId }
          : { type: "netbanking", bankName }
      ),
    onSuccess: () => {
      notify("Payment method added.", "success");
      setAddingOpen(false);
      setCardNumber(""); setExpiryMonth(""); setExpiryYear(""); setUpiId(""); setBankName("");
      queryClient.invalidateQueries({ queryKey: ["billing-methods"] });
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to add payment method.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => billingService.removeMethod(id),
    onSuccess: () => {
      notify("Payment method removed.", "success");
      queryClient.invalidateQueries({ queryKey: ["billing-methods"] });
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to remove payment method.", "error"),
    onSettled: () => setDeletingId(null),
  });

  const defaultMutation = useMutation({
    mutationFn: (id: string) => billingService.setDefault(id),
    onSuccess: () => {
      notify("Default payment method updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["billing-methods"] });
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to update default method.", "error"),
  });

  const profileMutation = useMutation({
    mutationFn: () => billingService.updateProfile(profileForm),
    onSuccess: () => {
      notify("Billing details saved.", "success");
      setProfileDirty(false);
      queryClient.invalidateQueries({ queryKey: ["billing-profile"] });
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to save billing details.", "error"),
  });

  const handleDelete = async (id: string) => {
    if (await confirm({ title: "Remove Payment Method", message: "Remove this payment method?", confirmLabel: "Remove" })) {
      setDeletingId(id);
      deleteMutation.mutate(id);
    }
  };

  const methodIcon = (type: BillingMethodType) =>
    type === "card" ? CreditCard : type === "upi" ? Smartphone : Landmark;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      {/* Payment Methods */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-base font-bold text-ink-900">Saved Payment Methods</h2>
            <Button size="sm" variant="outline" icon={<Plus className="h-4 w-4" />} iconPosition="left" onClick={() => setAddingOpen(true)}>
              Add Method
            </Button>
          </div>

          {loadingMethods ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : !methods || methods.length === 0 ? (
            <EmptyState icon={CreditCard} title="No payment methods saved" description="Add a card, UPI ID, or bank account to speed up future payments." />
          ) : (
            <ul className="space-y-3">
              {methods.map((m) => {
                const Icon = methodIcon(m.type);
                return (
                  <li key={m.id} className="flex items-center gap-3 rounded-2xl border border-surface-border p-4">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                      <Icon className="h-5 w-5" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-bold text-ink-900">
                        {m.type === "card" ? `${m.cardBrand} •••• ${m.last4}` : m.type === "upi" ? m.upiId : m.bankName}
                      </p>
                      <p className="text-xs text-ink-400">
                        {m.type === "card" ? `Expires ${String(m.expiryMonth).padStart(2, "0")}/${m.expiryYear}` : m.type === "upi" ? "UPI" : "Net Banking"}
                      </p>
                    </div>
                    {m.isDefault ? (
                      <Badge tone="brand" dot>Default</Badge>
                    ) : (
                      <button
                        onClick={() => defaultMutation.mutate(m.id)}
                        className="flex items-center gap-1 text-xs font-semibold text-ink-500 hover:text-brand-600"
                        title="Set as default"
                      >
                        <Star className="h-3.5 w-3.5" /> Set default
                      </button>
                    )}
                    <button
                      onClick={() => handleDelete(m.id)}
                      disabled={deletingId === m.id}
                      className="rounded-lg p-1.5 text-ink-400 hover:bg-danger/10 hover:text-danger disabled:opacity-50"
                      title="Remove"
                    >
                      {deletingId === m.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4" />}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Billing Address / Tax Details */}
        <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Building2 className="h-4 w-4 text-brand-600" />
            <h2 className="text-base font-bold text-ink-900">Billing Address & Tax Details</h2>
          </div>
          {loadingProfile ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : (
            <form
              onSubmit={(e) => { e.preventDefault(); profileMutation.mutate(); }}
              className="space-y-4"
            >
              <Input
                label="Company Name"
                value={profileForm.companyName}
                onChange={(e) => { setProfileForm((p) => ({ ...p, companyName: e.target.value })); setProfileDirty(true); }}
              />
              <Input
                label="Billing Address"
                value={profileForm.address}
                onChange={(e) => { setProfileForm((p) => ({ ...p, address: e.target.value })); setProfileDirty(true); }}
              />
              <div className="grid gap-4 sm:grid-cols-3">
                <Input label="City" value={profileForm.city} onChange={(e) => { setProfileForm((p) => ({ ...p, city: e.target.value })); setProfileDirty(true); }} />
                <Input label="State" value={profileForm.state} onChange={(e) => { setProfileForm((p) => ({ ...p, state: e.target.value })); setProfileDirty(true); }} />
                <Input label="Country" value={profileForm.country} onChange={(e) => { setProfileForm((p) => ({ ...p, country: e.target.value })); setProfileDirty(true); }} />
              </div>
              <Input
                label="GST Number (optional)"
                value={profileForm.gstId}
                onChange={(e) => { setProfileForm((p) => ({ ...p, gstId: e.target.value })); setProfileDirty(true); }}
                placeholder="22AAAAA0000A1Z5"
              />
              <Button type="submit" disabled={!profileDirty} isLoading={profileMutation.isPending}>
                Save Billing Details
              </Button>
            </form>
          )}
        </div>
      </div>

      {/* Escrow Guarantee info */}
      <div className="space-y-6">
        <div className="rounded-3xl border border-surface-border bg-surface-muted/50 p-6 text-center">
          <div className="mx-auto mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-100 text-emerald-600">
            <CheckCircle2 className="h-5 w-5" />
          </div>
          <h3 className="text-sm font-bold text-ink-900">Nexora Payment Protection</h3>
          <p className="mt-1.5 text-xs text-ink-500 leading-relaxed">
            Funds are held safely in escrow and only released when you approve the deliverables. Refund anytime before release.
          </p>
        </div>
      </div>

      {/* Add Payment Method Modal */}
      <Modal isOpen={addingOpen} onClose={() => setAddingOpen(false)} title="Add Payment Method">
        <div className="mb-4 grid grid-cols-3 gap-2">
          {([
            ["card", "Card", CreditCard],
            ["upi", "UPI", Smartphone],
            ["netbanking", "Net Banking", Landmark],
          ] as [BillingMethodType, string, typeof CreditCard][]).map(([key, label, Icon]) => (
            <button
              key={key}
              type="button"
              onClick={() => setMethodType(key)}
              className={cn(
                "flex flex-col items-center gap-1.5 rounded-xl border px-3 py-3 text-xs font-semibold transition-colors",
                methodType === key ? "border-brand-500 bg-brand-50 text-brand-700" : "border-surface-border text-ink-500 hover:border-brand-300"
              )}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={(e) => { e.preventDefault(); addMutation.mutate(); }} className="space-y-4">
          {methodType === "card" && (
            <>
              <Input label="Card Number" value={cardNumber} onChange={(e) => setCardNumber(e.target.value)} placeholder="4242 4242 4242 4242" required maxLength={19} />
              <div className="grid grid-cols-3 gap-3">
                <Select label="Brand" value={cardBrand} onChange={(e) => setCardBrand(e.target.value)}>
                  <option>Visa</option>
                  <option>Mastercard</option>
                  <option>American Express</option>
                  <option>RuPay</option>
                </Select>
                <Input label="Exp. Month" type="number" min={1} max={12} value={expiryMonth} onChange={(e) => setExpiryMonth(e.target.value)} required />
                <Input label="Exp. Year" type="number" min={new Date().getFullYear()} value={expiryYear} onChange={(e) => setExpiryYear(e.target.value)} required />
              </div>
            </>
          )}
          {methodType === "upi" && (
            <Input label="UPI ID" value={upiId} onChange={(e) => setUpiId(e.target.value)} placeholder="yourname@upi" required />
          )}
          {methodType === "netbanking" && (
            <Input label="Bank Name" value={bankName} onChange={(e) => setBankName(e.target.value)} placeholder="State Bank of India" required />
          )}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setAddingOpen(false)}>Cancel</Button>
            <Button type="submit" isLoading={addMutation.isPending}>Add Method</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
