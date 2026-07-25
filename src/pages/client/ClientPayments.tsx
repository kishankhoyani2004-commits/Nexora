import { useState } from "react";
import { createPortal } from "react-dom";
import {
  CreditCard, ShieldCheck, Undo2, Plus, Loader2, CheckCircle2,
  Eye, Download, X, Wallet,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { paymentService, type TransactionDto } from "@/services/payment.service";
import { useNotification } from "@/context/NotificationContext";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/utils/cn";

type StatusFilter = "all" | "completed" | "pending" | "refunded";

const FILTERS: { key: StatusFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "completed", label: "Completed" },
  { key: "pending", label: "Pending" },
  { key: "refunded", label: "Refunded" },
];

const METHOD_LABELS: Record<string, string> = {
  escrow: "Escrow",
  stripe: "Stripe",
  card: "Card",
  bank_transfer: "Bank Transfer",
};

export default function ClientPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  const [filter, setFilter] = useState<StatusFilter>("all");
  const [releasingId, setReleasingId] = useState<string | null>(null);
  const [refundingId, setRefundingId] = useState<string | null>(null);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [viewingTx, setViewingTx] = useState<TransactionDto | null>(null);

  // 1. Milestones submitted by freelancers, awaiting payment release
  const { data: releasableRes, isLoading: loadingReleasable } = useQuery({
    queryKey: ["releasable-milestones"],
    queryFn: async () => (await paymentService.getReleasableMilestones()).data,
  });
  const releasableMilestones = releasableRes?.data || [];

  // 2. Transaction history (server-side filtered by status)
  const { data: txRes, isLoading: loadingTx } = useQuery({
    queryKey: ["paymentsHistory", filter],
    queryFn: async () => (await paymentService.listTransactions(filter === "all" ? undefined : filter)).data,
  });
  const transactions = txRes?.data || [];

  // ── Release milestone payment ───────────────────────────────────────────────
  const releaseMutation = useMutation({
    mutationFn: (milestoneId: string) => paymentService.releaseMilestonePayment(milestoneId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["releasable-milestones"] });
      queryClient.invalidateQueries({ queryKey: ["paymentsHistory"] });
      notify("Milestone payment released to the freelancer!", "success");
    },
    onError: (err: any) => {
      notify(err.response?.data?.message || "Failed to release payment.", "error");
    },
    onSettled: () => setReleasingId(null),
  });

  const handleRelease = (milestoneId: string, title: string) => {
    if (confirm(`Release payment for milestone "${title}"? This action is irreversible.`)) {
      setReleasingId(milestoneId);
      releaseMutation.mutate(milestoneId);
    }
  };

  // ── Refund ───────────────────────────────────────────────────────────────────
  const refundMutation = useMutation({
    mutationFn: (earningId: string) => paymentService.refundPayment(earningId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["paymentsHistory"] });
      notify("Refund processed successfully.", "success");
    },
    onError: (err: any) => {
      notify(err.response?.data?.message || "Failed to process refund.", "error");
    },
    onSettled: () => setRefundingId(null),
  });

  const handleRefund = (tx: TransactionDto) => {
    if (confirm(`Refund ${formatCurrency(tx.amount)} for "${tx.projectTitle}"? This cannot be undone.`)) {
      setRefundingId(tx.id);
      refundMutation.mutate(tx.id);
    }
  };

  // ── Receipt download ─────────────────────────────────────────────────────────
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

  // ── Stats (derived from the unfiltered lifetime totals, not the active filter) ──
  const { data: allTxRes } = useQuery({
    queryKey: ["paymentsHistory", "all"],
    queryFn: async () => (await paymentService.listTransactions()).data,
  });
  const allTransactions = allTxRes?.data || [];

  const totalSpent = allTransactions.filter((t) => t.status === "completed").reduce((s, t) => s + t.amount, 0);
  const totalEscrow = allTransactions.filter((t) => t.status === "pending").reduce((s, t) => s + t.amount, 0);
  const totalRefunded = allTransactions.filter((t) => t.status === "refunded").reduce((s, t) => s + t.amount, 0);

  return (
    <DashboardLayout tagline="Client Hub" searchPlaceholder="Search payments...">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Payments & Transactions</h1>
        <p className="text-sm text-ink-500">Release milestone payments, review transaction history, and download receipts.</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <StatCard label="Total Spent" value={formatCurrency(totalSpent)} icon={CreditCard} tone="success" />
        <StatCard label="In Escrow" value={formatCurrency(totalEscrow)} icon={ShieldCheck} tone="warning" />
        <StatCard label="Total Refunded" value={formatCurrency(totalRefunded)} icon={Undo2} tone="danger" />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Left column: Release Payments & Transaction History */}
        <div className="space-y-8">
          {/* Release Milestone Payment */}
          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink-900 mb-1">Release Milestone Payment</h2>
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
                      <Button
                        size="sm"
                        onClick={() => handleRelease(m.milestoneId, m.title)}
                        isLoading={releasingId === m.milestoneId}
                      >
                        Release Payment
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Transaction Ledger */}
          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
              <h2 className="text-lg font-bold text-ink-900">Transaction History</h2>
              <div className="flex rounded-xl bg-surface-muted p-1 text-xs font-semibold">
                {FILTERS.map((f) => (
                  <button
                    key={f.key}
                    onClick={() => setFilter(f.key)}
                    className={cn(
                      "px-3 py-1.5 rounded-lg transition-colors",
                      filter === f.key ? "bg-surface-card text-brand-600 shadow-sm" : "text-ink-500 hover:text-ink-900"
                    )}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {loadingTx ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-400">No transactions found for this filter.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-ink-700">
                  <thead>
                    <tr className="border-b border-surface-border text-xs uppercase text-ink-400">
                      <th className="pb-2 pr-3">Transaction ID</th>
                      <th className="pb-2 pr-3">Project</th>
                      <th className="pb-2 pr-3">Freelancer</th>
                      <th className="pb-2 pr-3">Amount</th>
                      <th className="pb-2 pr-3">Date</th>
                      <th className="pb-2 pr-3">Status</th>
                      <th className="pb-2 pr-3">Method</th>
                      <th className="pb-2 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {transactions.map((t) => (
                      <tr key={t.id}>
                        <td className="py-2.5 pr-3 font-mono text-xs text-ink-500">{t.transactionId}</td>
                        <td className="py-2.5 pr-3 font-semibold text-ink-900">
                          {t.projectTitle}
                          {t.milestoneTitle && <span className="block text-[10px] text-ink-400 font-normal">{t.milestoneTitle}</span>}
                        </td>
                        <td className="py-2.5 pr-3 text-ink-600">{t.freelancerName}</td>
                        <td className="py-2.5 pr-3 font-bold">{formatCurrency(t.amount)}</td>
                        <td className="py-2.5 pr-3 text-xs text-ink-500">{new Date(t.date).toLocaleDateString()}</td>
                        <td className="py-2.5 pr-3">
                          <Badge
                            tone={t.status === "completed" ? "success" : t.status === "refunded" ? "danger" : "warning"}
                            className="capitalize"
                          >
                            {t.status}
                          </Badge>
                        </td>
                        <td className="py-2.5 pr-3 text-xs text-ink-500">{METHOD_LABELS[t.method] || t.method}</td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => setViewingTx(t)}
                              className="rounded-lg p-1.5 bg-surface-muted hover:bg-surface-border text-ink-500 hover:text-ink-900 transition-colors"
                              title="View Payment Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDownloadReceipt(t)}
                              disabled={downloadingId === t.id}
                              className="rounded-lg p-1.5 bg-surface-muted hover:bg-surface-border text-ink-500 hover:text-ink-900 transition-colors disabled:opacity-50"
                              title="Download Receipt"
                            >
                              {downloadingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            </button>
                            {t.status === "completed" && (
                              <button
                                onClick={() => handleRefund(t)}
                                disabled={refundingId === t.id}
                                className="rounded-lg p-1.5 bg-surface-muted hover:bg-danger/10 text-ink-500 hover:text-danger transition-colors disabled:opacity-50"
                                title="Refund"
                              >
                                {refundingId === t.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Undo2 className="h-4 w-4" />}
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right column: Payment Methods */}
        <div className="space-y-6">
          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
            <h2 className="text-base font-bold text-ink-900 mb-4">Payment Methods</h2>

            <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-500 to-brand-secondary p-5 text-white shadow-lg mb-4">
              <div className="flex justify-between items-start mb-6">
                <div>
                  <p className="text-[10px] text-white/70 uppercase font-semibold">Primary Card</p>
                  <p className="text-sm font-bold tracking-wider mt-1">Visa Classic</p>
                </div>
                <span className="text-lg font-black italic">VISA</span>
              </div>

              <div className="mb-4">
                <p className="text-sm font-semibold tracking-widest">••••  ••••  ••••  4242</p>
              </div>

              <div className="flex justify-between items-end">
                <div>
                  <p className="text-[9px] text-white/60 uppercase">Card Holder</p>
                  <p className="text-xs font-bold mt-0.5">{user?.companyName || user?.fullName || "Company Account"}</p>
                </div>
                <div>
                  <p className="text-[9px] text-white/60 uppercase">Expires</p>
                  <p className="text-xs font-bold mt-0.5">12/28</p>
                </div>
              </div>
            </div>

            <Button variant="outline" fullWidth className="flex items-center justify-center gap-1.5 border-dashed">
              <Plus className="h-4 w-4" /> Add Payment Method
            </Button>
          </div>

          {/* Escrow Guarantee info */}
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
      </div>

      {/* ── View Payment Details Modal ── */}
      {viewingTx &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-3xl border border-surface-border bg-surface-card p-6 shadow-2xl space-y-4">
              <button
                onClick={() => setViewingTx(null)}
                className="absolute right-4 top-4 text-ink-400 hover:text-ink-900 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>

              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-brand-50 text-brand-600">
                <Wallet className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-ink-900">Payment Details</h3>

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

              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setViewingTx(null)}>Close</Button>
                <Button
                  icon={<Download className="h-4 w-4" />}
                  iconPosition="left"
                  onClick={() => handleDownloadReceipt(viewingTx)}
                  isLoading={downloadingId === viewingTx.id}
                >
                  Download Receipt
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </DashboardLayout>
  );
}
