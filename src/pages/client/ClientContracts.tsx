import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { FileText, Loader2, ChevronRight, Briefcase } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CLIENT_NAV } from "@/constants/nav";
import { contractService } from "@/services/contract.service";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import type { Contract, ContractStatus } from "@/types";

type FilterStatus = "all" | ContractStatus;

const STATUS_BADGE: Record<ContractStatus, { tone: "success" | "brand" | "neutral" | "warning" | "danger" | "info"; label: string }> = {
  pending: { tone: "info", label: "Pending" },
  active: { tone: "success", label: "Active" },
  submitted: { tone: "brand", label: "Submitted for Review" },
  completed: { tone: "neutral", label: "Completed" },
  cancelled: { tone: "warning", label: "Cancelled" },
  disputed: { tone: "danger", label: "Disputed" },
};

const ESCROW_BADGE: Record<string, { tone: "success" | "neutral" | "warning" | "info"; label: string }> = {
  funded: { tone: "success", label: "Funded" },
  released: { tone: "neutral", label: "Released" },
  refunded: { tone: "warning", label: "Refunded" },
  none: { tone: "info", label: "Not Set" },
};

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "submitted", label: "Submitted" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "disputed", label: "Disputed" },
];

export default function ClientContracts() {
  const navigate = useNavigate();
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["contracts", "all"],
    queryFn: async () => {
      const r = await contractService.list();
      return r.data;
    },
  });

  const contracts: Contract[] = (res as any)?.data || [];

  const filtered = contracts.filter((c: any) => {
    const matchesStatus = filterStatus === "all" || c.status === filterStatus;
    const matchesSearch =
      c.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (c.freelancer as any)?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const totalValue = contracts.reduce((sum, c: any) => sum + (c.budget || 0), 0);

  return (
    <DashboardLayout navItems={CLIENT_NAV} tagline="Freelance Marketplace" searchPlaceholder="Search talents or projects...">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <FileText className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-extrabold text-ink-900">Contracts</h1>
          </div>
          <p className="mt-2 text-base text-ink-500">
            Every contract you've created with a freelancer, across every status — your full contract ledger.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Total Contracts</p>
            <p className="mt-2 text-2xl font-extrabold text-ink-900">{contracts.length}</p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Active</p>
            <p className="mt-2 text-2xl font-extrabold text-emerald-600">
              {contracts.filter((c) => c.status === "active").length}
            </p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Total Contract Value</p>
            <p className="mt-2 text-2xl font-extrabold text-brand-600">{formatCurrency(totalValue)}</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-1 overflow-x-auto rounded-xl border border-surface-border bg-surface-muted p-1">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                onClick={() => setFilterStatus(f.key)}
                className={cn(
                  "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                  filterStatus === f.key ? "bg-surface-card text-brand-600 shadow-sm" : "text-ink-500 hover:text-ink-700"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          <input
            type="text"
            placeholder="Search by contract or freelancer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm placeholder-ink-400 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="rounded-2xl border border-surface-border bg-surface-card p-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-ink-300" />
            <p className="mt-4 text-base font-semibold text-ink-700">No contracts found</p>
            <p className="mt-1 text-sm text-ink-500">
              {searchQuery || filterStatus !== "all" ? "Try a different filter or search term." : "Accept a proposal to create your first contract."}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((contract: any) => (
              <div
                key={contract.id}
                className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card transition-all hover:shadow-lg"
              >
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex flex-1 min-w-0 gap-4">
                    <Avatar
                      src={(contract.freelancer as any)?.avatar}
                      name={(contract.freelancer as any)?.fullName}
                      size="md"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-lg font-bold text-ink-900">{contract.title}</h3>
                      <p className="text-sm text-ink-500">
                        Freelancer: <span className="font-semibold text-ink-700">{(contract.freelancer as any)?.fullName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge tone={STATUS_BADGE[contract.status as ContractStatus]?.tone}>
                      {STATUS_BADGE[contract.status as ContractStatus]?.label}
                    </Badge>
                    <span className="text-xs text-ink-400">{formatRelativeTime(contract.createdAt)}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Budget</p>
                    <p className="mt-1 text-lg font-bold text-ink-900">{formatCurrency(contract.budget)}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Escrow</p>
                    <p className="mt-1">
                      <Badge tone={ESCROW_BADGE[contract.escrowStatus]?.tone}>
                        {ESCROW_BADGE[contract.escrowStatus]?.label}
                      </Badge>
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Payment</p>
                    <p className="mt-1 text-sm font-semibold text-ink-700">
                      {contract.stripePaymentIntentId ? "Stripe" : "Escrow"}
                    </p>
                  </div>
                  <div className="flex items-end justify-end">
                    <Button
                      size="sm"
                      onClick={() => navigate(`/workspace/${contract.id}`)}
                      icon={<ChevronRight className="h-4 w-4" />}
                      iconPosition="right"
                    >
                      Open Workspace
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
