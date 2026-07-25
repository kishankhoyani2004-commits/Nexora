import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Briefcase, Clock, DollarSign, CheckCircle2, AlertCircle, Users,
  MessageCircle, ChevronRight, Loader2, TrendingUp, Target, UploadCloud
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { SubmitProjectModal } from "@/components/freelancer/SubmitProjectModal";
import { SubmissionDetailsModal } from "@/components/freelancer/SubmissionDetailsModal";
import { useAuth } from "@/context/AuthContext";
import { FREELANCER_NAV } from "@/constants/nav";
import { contractService } from "@/services/contract.service";
import { workspaceService } from "@/services/workspace.service";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import type { Contract, ProjectSubmission } from "@/types";
import { cn } from "@/utils/cn";

type FilterStatus = "all" | "active" | "submitted" | "completed" | "cancelled" | "disputed";

const STATUS_BADGE = {
  active: { tone: "success" as const, label: "Active" },
  submitted: { tone: "brand" as const, label: "Waiting for Client Approval" },
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

export default function FreelancerActiveProjects() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [filterStatus, setFilterStatus] = useState<FilterStatus>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [submitTarget, setSubmitTarget] = useState<{ id: string; title: string } | null>(null);
  const [viewTarget, setViewTarget] = useState<{ id: string; title: string } | null>(null);

  // Fetch contracts
  const { data: contractsRes, isLoading } = useQuery({
    queryKey: ["contracts", filterStatus],
    queryFn: async () => {
      const res = await contractService.list();
      return res.data;
    },
  });

  const contracts: Contract[] = (contractsRes as any)?.data || [];

  // Submission history — used to show submitted dates and persistent
  // revision-request feedback on each project card (not just a one-time toast).
  const { data: submissionsRes } = useQuery({
    queryKey: ["mySubmissions"],
    queryFn: () => workspaceService.listMySubmissions(),
  });
  const submissionByContract = new Map<string, ProjectSubmission>(
    (submissionsRes?.data.data ?? []).map((s) => [s.contract, s])
  );

  // Filter contracts
  const filteredContracts = contracts.filter((contract: any) => {
    const matchesStatus = filterStatus === "all" || contract.status === filterStatus;
    const matchesSearch =
      contract.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (contract.client as any)?.fullName?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  // Categorize contracts
  const activeContracts = filteredContracts.filter((c: any) => c.status === "active");
  const completedContracts = filteredContracts.filter((c: any) => c.status === "completed");

  const handleOpenWorkspace = (contractId: string) => {
    navigate(`/workspace/${contractId}`);
  };

  const handleMessage = (clientId: string, clientName: string) => {
    navigate(
      `/messages?to=${clientId}&name=${encodeURIComponent(clientName)}`
    );
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={FREELANCER_NAV} tagline="Your Projects">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={FREELANCER_NAV} tagline="Your Projects">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-ink-900">My Active Projects</h1>
          <p className="mt-2 text-base text-ink-500">
            View and manage your ongoing projects, deliver milestones, and communicate with clients.
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
              <Target className="h-8 w-8 text-brand-600" />
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
            <p className="mt-4 text-base font-semibold text-ink-700">No projects yet</p>
            <p className="mt-1 text-sm text-ink-500">
              When a client accepts your proposal, your project will appear here.
            </p>
            <Button
              className="mt-4"
              onClick={() => navigate("/jobs")}
              icon={<ChevronRight className="h-4 w-4" />}
              iconPosition="right"
            >
              Browse Jobs
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredContracts.map((contract: any) => {
              const submission = submissionByContract.get(contract.id);
              const needsRevision = submission?.status === "revision_requested" && contract.status === "active";
              return (
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
                      {needsRevision && <Badge tone="warning">Revision Requested</Badge>}
                    </div>
                    <p className="mt-1 text-sm text-ink-500">
                      Job: {(contract.job as any)?.title || "—"}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {submission && (
                      <Button
                        variant="outline"
                        onClick={() => setViewTarget({ id: contract.id, title: contract.title })}
                      >
                        View Submission
                      </Button>
                    )}
                    {contract.status === "active" && (
                      <Button
                        variant="secondary"
                        icon={<UploadCloud className="h-4 w-4" />}
                        iconPosition="left"
                        onClick={() => setSubmitTarget({ id: contract.id, title: contract.title })}
                      >
                        {needsRevision ? "Resubmit Project" : "Submit Project"}
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

                {/* Revision feedback — persistent on the card, not just a one-time notification */}
                {needsRevision && (
                  <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                    <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">
                      Client requested a revision
                    </p>
                    <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-wrap">
                      {submission?.clientFeedback || "No additional comments were provided."}
                    </p>
                  </div>
                )}

                {/* Client Info */}
                <div className="mb-4 rounded-lg border border-surface-border bg-surface-muted p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar
                        src={(contract.client as any)?.avatar}
                        name={(contract.client as any)?.fullName}
                        size="md"
                      />
                      <div>
                        <p className="font-semibold text-ink-900">
                          {(contract.client as any)?.fullName}
                        </p>
                        <p className="text-xs text-ink-400">Client</p>
                      </div>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      icon={<MessageCircle className="h-3.5 w-3.5" />}
                      onClick={() =>
                        handleMessage(
                          (contract.client as any)?.id || (contract.client as any)?._id,
                          (contract.client as any)?.fullName
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
              );
            })}
          </div>
        )}
      </div>

      {submitTarget && (
        <SubmitProjectModal
          isOpen={!!submitTarget}
          onClose={() => setSubmitTarget(null)}
          projectId={submitTarget.id}
          projectTitle={submitTarget.title}
        />
      )}

      {viewTarget && (
        <SubmissionDetailsModal
          isOpen={!!viewTarget}
          onClose={() => setViewTarget(null)}
          projectId={viewTarget.id}
          projectTitle={viewTarget.title}
        />
      )}
    </DashboardLayout>
  );
}
