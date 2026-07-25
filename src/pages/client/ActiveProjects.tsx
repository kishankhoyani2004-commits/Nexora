import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Briefcase, Clock, DollarSign, CheckCircle2, AlertCircle, Users,
  MessageCircle, ChevronRight, Filter, Loader2, TrendingUp
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { CLIENT_NAV } from "@/constants/nav";
import { ROUTES } from "@/constants/routes";
import { contractService } from "@/services/contract.service";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import type { Contract } from "@/types";
import { cn } from "@/utils/cn";

type FilterStatus = "all" | "active" | "submitted" | "completed" | "cancelled" | "disputed";

const STATUS_BADGE = {
  active: { tone: "success" as const, label: "Active" },
  submitted: { tone: "brand" as const, label: "Submitted for Review" },
  completed: { tone: "neutral" as const, label: "Completed" },
  cancelled: { tone: "warning" as const, label: "Cancelled" },
  disputed: { tone: "danger" as const, label: "Disputed" },
  pending: { tone: "info" as const, label: "Pending" },
};

const ESCROW_BADGE = {
  funded: { tone: "success" as const, label: "Funded" },
  released: { tone: "neutral" as const, label: "Released" },
  refunded: { tone: "warning" as const, label: "Refunded" },
  none: { tone: "info" as const, label: "Not Set" },
};

export default function ActiveProjects() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotification();

  const [searchParams] = useSearchParams();
  const initialStatus = (searchParams.get("status") as FilterStatus) || "all";
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(
    ["all", "active", "submitted", "completed", "cancelled", "disputed"].includes(initialStatus) ? initialStatus : "all"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch contracts
  const { data: contractsRes, isLoading, isError } = useQuery({
    queryKey: ["contracts", filterStatus],
    queryFn: async () => {
      const res = await contractService.list();
      return res.data;
    },
  });

  const contracts: Contract[] = (contractsRes as any)?.data || [];

  // Filter contracts
  const filteredContracts = contracts.filter((contract: any) => {
    const matchesStatus = filterStatus === "all" || contract.status === filterStatus;
    const matchesSearch =
      contract.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contract.freelancer as any)?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Categorize contracts
  const activeContracts = filteredContracts.filter((c: any) => c.status === "active");
  const completedContracts = filteredContracts.filter((c: any) => c.status === "completed");

  const handleOpenWorkspace = (contractId: string) => {
    navigate(`/workspace/${contractId}`);
  };

  const handleMessage = (freelancerId: string, freelancerName: string) => {
    navigate(
      `/messages?to=${freelancerId}&name=${encodeURIComponent(freelancerName)}`
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={CLIENT_NAV} tagline="Manage Your Projects">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={CLIENT_NAV} tagline="Manage Your Projects">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-ink-900">Active Projects</h1>
          <p className="mt-2 text-base text-ink-500">
            Monitor your ongoing projects, manage milestones, and collaborate with freelancers.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Active Projects
                </p>
                <p className="mt-2 text-2xl font-extrabold text-ink-900">
                  {activeContracts.length}
                </p>
              </div>
              <Briefcase className="h-8 w-8 text-brand-600" />
            </div>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  In Escrow
                </p>
                <p className="mt-2 text-2xl font-extrabold text-emerald-600">
                  {formatCurrency(
                    activeContracts.reduce(
                      (sum: number, c: any) => sum + (c.escrowStatus === "funded" ? c.budget || 0 : 0),
                      0
                    )
                  )}
                </p>
              </div>
              <DollarSign className="h-8 w-8 text-emerald-600" />
            </div>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                  Completed
                </p>
                <p className="mt-2 text-2xl font-extrabold text-ink-900">
                  {completedContracts.length}
                </p>
              </div>
              <CheckCircle2 className="h-8 w-8 text-emerald-600" />
            </div>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <button
              onClick={() => setFilterStatus("all")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                filterStatus === "all"
                  ? "bg-brand-600 text-white"
                  : "border border-surface-border bg-surface-card text-ink-700 hover:bg-surface-muted"
              )}
            >
              All
            </button>
            <button
              onClick={() => setFilterStatus("active")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                filterStatus === "active"
                  ? "bg-brand-600 text-white"
                  : "border border-surface-border bg-surface-card text-ink-700 hover:bg-surface-muted"
              )}
            >
              Active
            </button>
            <button
              onClick={() => setFilterStatus("completed")}
              className={cn(
                "rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                filterStatus === "completed"
                  ? "bg-brand-600 text-white"
                  : "border border-surface-border bg-surface-card text-ink-700 hover:bg-surface-muted"
              )}
            >
              Completed
            </button>
          </div>

          <input
            type="text"
            placeholder="Search projects..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm placeholder-ink-400 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Projects List */}
        {filteredContracts.length === 0 ? (
          <div className="rounded-2xl border border-surface-border bg-surface-card p-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-ink-300" />
            <p className="mt-4 text-base font-semibold text-ink-700">No projects found</p>
            <p className="mt-1 text-sm text-ink-500">
              When you accept a proposal, your project will appear here.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContracts.map((contract: any) => (
              <div
                key={contract.id}
                className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card transition-all hover:shadow-lg"
              >
                {/* Project Header */}
                <div className="mb-4 flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <h3 className="text-lg font-bold text-ink-900">{contract.title}</h3>
                      <Badge tone={STATUS_BADGE[contract.status as keyof typeof STATUS_BADGE]?.tone}>
                        {STATUS_BADGE[contract.status as keyof typeof STATUS_BADGE]?.label}
                      </Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      Job: {(contract.job as any)?.title || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {contract.status === "submitted" && (
                      <Button
                        variant="secondary"
                        onClick={() => navigate(ROUTES.CLIENT_SUBMITTED_PROJECTS)}
                      >
                        Review Submission
                      </Button>
                    )}
                    <Button
                      onClick={() => handleOpenWorkspace(contract.id)}
                      icon={<ChevronRight className="h-4 w-4" />}
                      iconPosition="right"
                    >
                      Open Workspace
                    </Button>
                  </div>
                </div>

                {/* Freelancer Info */}
                <div className="mb-4 rounded-lg border border-surface-border bg-surface-muted p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={(contract.freelancer as any)?.avatar}
                        name={(contract.freelancer as any)?.fullName}
                        size="md"
                      />
                      <div>
                        <p className="font-semibold text-ink-900">
                          {(contract.freelancer as any)?.fullName}
                        </p>
                        <p className="text-xs text-ink-400">Freelancer</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<MessageCircle className="h-3.5 w-3.5" />}
                      onClick={() =>
                        handleMessage(
                          (contract.freelancer as any)?.id || (contract.freelancer as any)?._id,
                          (contract.freelancer as any)?.fullName
                        )
                      }
                    >
                      Message
                    </Button>
                  </div>
                </div>

                {/* Project Details */}
                <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Budget
                    </p>
                    <p className="mt-1 text-lg font-bold text-ink-900">
                      {formatCurrency(contract.budget)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Escrow
                    </p>
                    <p className="mt-1">
                      <Badge
                        tone={
                          ESCROW_BADGE[contract.escrowStatus as keyof typeof ESCROW_BADGE]
                            ?.tone
                        }
                      >
                        {
                          ESCROW_BADGE[contract.escrowStatus as keyof typeof ESCROW_BADGE]
                            ?.label
                        }
                      </Badge>
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Started
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-700">
                      {formatRelativeTime(contract.createdAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">
                      Status
                    </p>
                    <p className="mt-1 text-sm font-semibold text-ink-700 capitalize">
                      {contract.status}
                    </p>
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
