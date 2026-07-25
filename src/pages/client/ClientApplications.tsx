import { useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Briefcase, Loader2, CheckCircle2, XCircle, Star, MessageCircle,
  ChevronRight, UserCircle2, Bookmark,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Avatar } from "@/components/ui/Avatar";
import { CLIENT_NAV } from "@/constants/nav";
import { ROUTES } from "@/constants/routes";
import { useNotification } from "@/context/NotificationContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalService } from "@/services/proposal.service";
import { contractService } from "@/services/contract.service";
import { savedFreelancerService } from "@/services/savedFreelancer.service";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import type { Proposal } from "@/types";

type FilterStatus = "all" | "pending" | "shortlisted" | "accepted" | "rejected";

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "pending",     label: "Pending"     },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "accepted",    label: "Accepted"    },
  { key: "rejected",    label: "Rejected"    },
  { key: "all",         label: "All"         },
];

export default function ClientApplications() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  const [searchParams] = useSearchParams();

  const initialFilter = (searchParams.get("filter") as FilterStatus) || "pending";
  const [filterStatus, setFilterStatus] = useState<FilterStatus>(
    FILTERS.some((f) => f.key === initialFilter) ? initialFilter : "pending"
  );
  const [searchQuery, setSearchQuery] = useState("");

  // Fetch every proposal received across the client's jobs (all statuses).
  const { data: res, isLoading } = useQuery({
    queryKey: ["proposals", "received"],
    queryFn: async () => {
      const r = await proposalService.listReceived();
      return r.data.data as Proposal[];
    },
  });

  const allApplications: Proposal[] = res ?? [];

  const statusOf = (app: any) => (app.status === "submitted" ? "pending" : app.status);

  const filteredApplications = allApplications.filter((app: any) => {
    const matchesStatus = filterStatus === "all" || statusOf(app) === filterStatus;
    const matchesSearch =
      (app.freelancer as any)?.fullName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (app.job as any)?.title?.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesStatus && matchesSearch;
  });

  const pendingCount     = allApplications.filter((a) => a.status === "submitted").length;
  const shortlistedCount = allApplications.filter((a) => a.status === "shortlisted").length;
  const acceptedCount    = allApplications.filter((a) => a.status === "accepted").length;
  const rejectedCount    = allApplications.filter((a) => a.status === "rejected").length;

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ["proposals"] });
    queryClient.invalidateQueries({ queryKey: ["jobProposals"] });
    queryClient.invalidateQueries({ queryKey: ["clientDashboardStats"] });
    queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
    queryClient.invalidateQueries({ queryKey: ["contracts"] });
    queryClient.invalidateQueries({ queryKey: ["freelancer-contracts"] });
    queryClient.invalidateQueries({ queryKey: ["freelancerDashboardStats"] });
    queryClient.invalidateQueries({ queryKey: ["earnings"] });
  };

  const acceptMutation = useMutation({
    mutationFn: (proposalId: string) => contractService.create(proposalId),
    onSuccess: () => {
      invalidateAll();
      notify("Application accepted! Active project created and earnings updated.", "success");
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to accept application.", "error"),
  });

  const rejectMutation = useMutation({
    mutationFn: (proposalId: string) => proposalService.reject(proposalId),
    onSuccess: () => {
      invalidateAll();
      notify("Application rejected.", "info");
    },
    onError: () => notify("Failed to reject application.", "error"),
  });

  const shortlistMutation = useMutation({
    mutationFn: (proposalId: string) => proposalService.shortlist(proposalId),
    onSuccess: () => {
      invalidateAll();
      notify("Freelancer shortlisted.", "success");
    },
    onError: () => notify("Failed to shortlist.", "error"),
  });

  // ── Saved freelancers (bookmark toggle on each applicant) ──────────────────
  const { data: savedIdsRes } = useQuery({
    queryKey: ["savedFreelancerIds"],
    queryFn: () => savedFreelancerService.getIds(),
  });
  const savedIds = new Set<string>(savedIdsRes?.data.data ?? []);

  const saveFreelancerMutation = useMutation({
    mutationFn: ({ id, saving }: { id: string; saving: boolean }): Promise<any> =>
      (saving ? savedFreelancerService.save(id) : savedFreelancerService.unsave(id)) as Promise<any>,
    onSuccess: (_, { saving }) => {
      queryClient.invalidateQueries({ queryKey: ["savedFreelancerIds"] });
      queryClient.invalidateQueries({ queryKey: ["savedFreelancers"] });
      notify(saving ? "Freelancer saved." : "Freelancer removed from saved.", saving ? "success" : "info");
    },
    onError: () => notify("Something went wrong.", "error"),
  });

  const isPending = acceptMutation.isPending || rejectMutation.isPending || shortlistMutation.isPending;

  if (isLoading) {
    return (
      <DashboardLayout navItems={CLIENT_NAV} tagline="Review & Manage Applications">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={CLIENT_NAV} tagline="Review & Manage Applications">
      <div className="mx-auto max-w-6xl">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-extrabold text-ink-900">Applications</h1>
          <p className="mt-2 text-base text-ink-500">
            Review every proposal freelancers have submitted to your jobs. Accept to create an active
            project, or reject to decline.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-2 gap-4 sm:grid-cols-4">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4 text-center shadow-card">
            <p className="text-2xl font-extrabold text-ink-900">{pendingCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-ink-500">Pending</p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4 text-center shadow-card">
            <p className="text-2xl font-extrabold text-amber-600">{shortlistedCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-ink-500">Shortlisted</p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4 text-center shadow-card">
            <p className="text-2xl font-extrabold text-emerald-600">{acceptedCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-ink-500">Accepted</p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4 text-center shadow-card">
            <p className="text-2xl font-extrabold text-red-600">{rejectedCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-ink-500">Rejected</p>
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
                  filterStatus === f.key
                    ? "bg-surface-card text-brand-600 shadow-sm"
                    : "text-ink-500 hover:text-ink-700"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <input
            type="text"
            placeholder="Search by freelancer or job..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm placeholder-ink-400 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {/* Applications List */}
        {filteredApplications.length === 0 ? (
          <div className="rounded-2xl border border-surface-border bg-surface-card p-12 text-center">
            <Briefcase className="mx-auto h-12 w-12 text-ink-300" />
            <p className="mt-4 text-base font-semibold text-ink-700">No applications</p>
            <p className="mt-1 text-sm text-ink-500">
              {filterStatus === "pending"
                ? "You don't have any pending applications yet."
                : `No ${filterStatus} applications.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredApplications.map((application: any) => (
              <div
                key={application.id}
                className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card transition-all hover:shadow-lg"
              >
                {/* Header */}
                <div className="mb-4 flex items-start justify-between gap-4">
                  <div className="flex gap-4 flex-1 min-w-0">
                    <Avatar
                      src={(application.freelancer as any)?.avatar}
                      name={(application.freelancer as any)?.fullName}
                      size="md"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-lg font-bold text-ink-900">
                        {(application.freelancer as any)?.fullName}
                      </h3>
                      <p className="text-sm text-ink-500">
                        Applied for: <span className="font-semibold text-ink-700">{(application.job as any)?.title}</span>
                      </p>
                      {((application.freelancer as any)?.reviewCount ?? 0) > 0 && (
                        <div className="mt-1 flex items-center gap-2">
                          <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                          <span className="text-xs font-semibold text-ink-700">
                            {(application.freelancer as any)?.rating?.toFixed(1)} ({(application.freelancer as any)?.reviewCount} reviews)
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-2 shrink-0">
                    <Badge
                      tone={
                        application.status === "accepted"
                          ? "success"
                          : application.status === "rejected"
                          ? "danger"
                          : application.status === "shortlisted"
                          ? "warning"
                          : "info"
                      }
                    >
                      {application.status === "submitted"
                        ? "Pending"
                        : application.status.charAt(0).toUpperCase() + application.status.slice(1)}
                    </Badge>
                    <span className="text-xs text-ink-400">
                      {formatRelativeTime(application.createdAt)}
                    </span>
                  </div>
                </div>

                {/* Proposal Details */}
                <div className="mb-4 rounded-lg border border-surface-border bg-surface-muted p-4">
                  <p className="text-sm text-ink-900 leading-relaxed">
                    {(application as any).coverLetter || application.description}
                  </p>
                </div>

                {/* Bid & Delivery */}
                <div className="mb-4 grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Bid Amount</p>
                    <p className="mt-1 text-lg font-bold text-emerald-600">
                      {formatCurrency((application as any).bidAmount)}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Delivery Time</p>
                    <p className="mt-1 text-lg font-bold text-ink-900">{(application as any).estimatedDelivery}</p>
                  </div>
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-wide text-ink-400">Job Budget</p>
                    <p className="mt-1 text-lg font-bold text-ink-900">
                      {formatCurrency((application.job as any)?.budgetMin ?? (application.job as any)?.budget)}
                    </p>
                  </div>
                </div>

                {/* Actions */}
                {(application.status === "submitted" || application.status === "shortlisted") && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => acceptMutation.mutate(application.id)}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                    >
                      <CheckCircle2 className="h-4 w-4" />
                      Accept & Create Project
                    </button>
                    {application.status === "submitted" && (
                      <button
                        onClick={() => shortlistMutation.mutate(application.id)}
                        disabled={isPending}
                        className="flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        <Star className="h-4 w-4" />
                        Shortlist
                      </button>
                    )}
                    <button
                      onClick={() => rejectMutation.mutate(application.id)}
                      disabled={isPending}
                      className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                      <XCircle className="h-4 w-4" />
                      Reject
                    </button>
                    {(application.freelancer as any)?.id && (
                      <>
                        <button
                          onClick={() => navigate(`/profile/${(application.freelancer as any).id}`)}
                          title="View Freelancer Profile"
                          className="flex items-center justify-center rounded-lg border border-surface-border px-4 py-2.5 text-sm font-bold text-ink-700 hover:bg-surface-muted transition-colors"
                        >
                          <UserCircle2 className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => navigate(`${ROUTES.MESSAGES}?to=${(application.freelancer as any).id}`)}
                          title="Send Message"
                          className="flex items-center justify-center rounded-lg border border-surface-border px-4 py-2.5 text-sm font-bold text-ink-700 hover:bg-surface-muted transition-colors"
                        >
                          <MessageCircle className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => {
                            const id = (application.freelancer as any).id;
                            saveFreelancerMutation.mutate({ id, saving: !savedIds.has(id) });
                          }}
                          disabled={saveFreelancerMutation.isPending}
                          title={savedIds.has((application.freelancer as any).id) ? "Remove from Saved" : "Save Freelancer"}
                          className={cn(
                            "flex items-center justify-center rounded-lg border px-4 py-2.5 text-sm font-bold transition-colors disabled:opacity-50",
                            savedIds.has((application.freelancer as any).id)
                              ? "border-brand-300 bg-brand-50 text-brand-600"
                              : "border-surface-border text-ink-700 hover:bg-surface-muted"
                          )}
                        >
                          <Bookmark
                            className="h-4 w-4"
                            fill={savedIds.has((application.freelancer as any).id) ? "currentColor" : "none"}
                          />
                        </button>
                      </>
                    )}
                  </div>
                )}

                {application.status === "accepted" && (
                  <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                    <span className="text-sm font-semibold text-emerald-700">
                      ✓ Accepted - Project created and active
                    </span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => navigate(ROUTES.CLIENT_ACTIVE_PROJECTS)}
                      icon={<ChevronRight className="h-4 w-4" />}
                      iconPosition="right"
                    >
                      View Project
                    </Button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
