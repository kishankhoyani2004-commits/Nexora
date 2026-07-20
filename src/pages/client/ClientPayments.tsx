import { useState } from "react";
import { CreditCard, ShieldCheck, ArrowUpRight, Plus, Loader2, CheckCircle2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Avatar";
import { CLIENT_NAV } from "@/constants/nav";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { contractService } from "@/services/contract.service";
import { apiClient } from "@/lib/axios";
import { useNotification } from "@/context/NotificationContext";
import { formatCurrency } from "@/utils/formatters";

export default function ClientPayments() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  const [releasingId, setReleasingId] = useState<string | null>(null);

  // 1. Fetch Client's Contracts / Active Projects
  const { data: contractsResponse, isLoading: isLoadingContracts } = useQuery({
    queryKey: ["clientContracts"],
    queryFn: async () => {
      const res = await contractService.list();
      return res.data;
    },
  });

  // 2. Fetch Transaction History
  const { data: paymentsResponse, isLoading: isLoadingPayments } = useQuery({
    queryKey: ["paymentsHistory"],
    queryFn: async () => {
      const res = await apiClient.get("/payments/history");
      return res.data;
    },
  });

  const contracts = contractsResponse?.data || [];
  const transactions = paymentsResponse?.data || [];

  // Filter funded escrows
  const activeEscrow = contracts.filter(
    (c: any) => c.status === "active" && c.escrowStatus === "funded"
  );

  // Release payment mutation
  const releaseMutation = useMutation({
    mutationFn: async (contractId: string) => {
      await contractService.updateStatus(contractId, {
        status: "completed",
        escrowStatus: "released",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientContracts"] });
      queryClient.invalidateQueries({ queryKey: ["paymentsHistory"] });
      notify("Payment released successfully to the freelancer!", "success");
    },
    onError: (err: any) => {
      notify(err.message || "Failed to release payment.", "error");
    },
    onSettled: () => {
      setReleasingId(null);
    },
  });

  const handleReleasePayment = (contractId: string) => {
    if (confirm("Are you sure you want to release the escrowed funds to the freelancer? This action is irreversible.")) {
      setReleasingId(contractId);
      releaseMutation.mutate(contractId);
    }
  };

  // Calculate statistics
  const totalSpent = transactions
    .filter((t: any) => t.status === "completed")
    .reduce((sum: number, t: any) => sum + t.amount, 0);

  const totalEscrow = activeEscrow.reduce((sum: number, c: any) => sum + c.budget, 0);

  const totalReleased = contracts
    .filter((c: any) => c.escrowStatus === "released")
    .reduce((sum: number, c: any) => sum + c.budget, 0);

  return (
    <DashboardLayout navItems={CLIENT_NAV} tagline="Client Hub" searchPlaceholder="Search payments...">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Payments & Escrow</h1>
        <p className="text-sm text-ink-500">Manage funding, active milestones, release payments, and review transactions.</p>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <StatCard
          label="Total Spent"
          value={formatCurrency(totalSpent)}
          icon={CreditCard}
        />
        <StatCard
          label="In Escrow"
          value={formatCurrency(totalEscrow)}
          icon={ShieldCheck}
          tone="warning"
        />
        <StatCard
          label="Total Released"
          value={formatCurrency(totalReleased)}
          icon={ArrowUpRight}
          tone="success"
        />
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        {/* Left column: Escrows & History */}
        <div className="space-y-8">
          {/* Active Escrows */}
          <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
            <h2 className="text-lg font-bold text-ink-900 mb-4">Active Escrow Accounts</h2>
            {isLoadingContracts ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : activeEscrow.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-400">
                No active escrow accounts funded at this time.
              </div>
            ) : (
              <div className="divide-y divide-surface-border">
                {activeEscrow.map((c: any) => (
                  <div key={c.id || c._id} className="flex flex-col gap-4 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar src={c.freelancer?.avatar || c.freelancer?.avatarUrl} name={c.freelancer?.fullName || "Freelancer"} size="md" />
                      <div>
                        <h4 className="font-bold text-ink-900">{c.title}</h4>
                        <p className="text-xs text-ink-500">Freelancer: {c.freelancer?.fullName || "Unassigned"}</p>
                      </div>
                    </div>
                    <div className="flex items-center justify-between gap-4 sm:justify-end">
                      <div className="text-right">
                        <p className="text-sm font-bold text-ink-900">{formatCurrency(c.budget)}</p>
                        <p className="text-[10px] text-ink-400">Escrow Funded</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => handleReleasePayment(c.id || c._id)}
                        isLoading={releasingId === (c.id || c._id)}
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
            <h2 className="text-lg font-bold text-ink-900 mb-4">Transaction History</h2>
            {isLoadingPayments ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="py-8 text-center text-sm text-ink-400">
                No transactions recorded yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm text-ink-700">
                  <thead>
                    <tr className="border-b border-surface-border text-xs uppercase text-ink-400">
                      <th className="pb-2">Date</th>
                      <th className="pb-2">Description</th>
                      <th className="pb-2">Amount</th>
                      <th className="pb-2">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {transactions.map((t: any) => (
                      <tr key={t.id || t._id} className="py-2.5">
                        <td className="py-2.5 text-xs text-ink-500">
                          {t.date ? new Date(t.date).toLocaleDateString() : "N/A"}
                        </td>
                        <td className="py-2.5 font-semibold text-ink-900">{t.projectTitle}</td>
                        <td className="py-2.5 font-bold">{formatCurrency(t.amount)}</td>
                        <td className="py-2.5">
                          <Badge tone={t.status === "completed" ? "success" : "warning"} className="capitalize">
                            {t.status}
                          </Badge>
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
            
            {/* Demo credit card */}
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
                  <p className="text-xs font-bold mt-0.5">{user?.fullName || "Company Account"}</p>
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
              Funds are held safely in escrow and only released when you approve the deliverables. Cancel anytime to request a refund.
            </p>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
