import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Mail, Briefcase, Loader2, CheckCircle2, XCircle, Inbox, ArrowRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FREELANCER_NAV } from "@/constants/nav";
import { useNotification } from "@/context/NotificationContext";
import { invitationService } from "@/services/invitation.service";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/utils/cn";
import type { Invitation } from "@/types";

type FilterStatus = "all" | "pending" | "accepted" | "declined";

const FILTERS: { key: FilterStatus; label: string }[] = [
  { key: "pending",  label: "Pending"  },
  { key: "accepted", label: "Accepted" },
  { key: "declined", label: "Declined" },
  { key: "all",      label: "All"      },
];

export default function FreelancerInvitations() {
  const navigate     = useNavigate();
  const queryClient  = useQueryClient();
  const { notify }   = useNotification();
  const [filter, setFilter] = useState<FilterStatus>("pending");

  const { data: res, isLoading } = useQuery({
    queryKey: ["freelancerInvitations"],
    queryFn: () => invitationService.listReceived(),
  });

  const allInvitations: Invitation[] = res?.data.data?.items ?? [];
  const filtered = allInvitations.filter((inv) => filter === "all" || inv.status === filter);

  const pendingCount  = allInvitations.filter((i) => i.status === "pending").length;
  const acceptedCount = allInvitations.filter((i) => i.status === "accepted").length;
  const declinedCount = allInvitations.filter((i) => i.status === "declined").length;

  const respondMutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: "accept" | "decline" }) =>
      invitationService.respond(id, action),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["freelancerInvitations"] });
      notify(action === "accept" ? "Invitation accepted." : "Invitation declined.", action === "accept" ? "success" : "info");
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to respond.", "error"),
  });

  return (
    <DashboardLayout navItems={FREELANCER_NAV} searchPlaceholder="Search invitations…">
      <div className="mx-auto max-w-4xl pb-12">

        {/* ── Header ── */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Mail className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-extrabold text-ink-900">Invitations</h1>
          </div>
          <p className="mt-2 text-base text-ink-500">
            Clients who want you specifically have invited you to apply to these jobs.
          </p>
        </div>

        {/* Summary Stats */}
        <div className="mb-8 grid grid-cols-3 gap-4">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4 text-center shadow-card">
            <p className="text-2xl font-extrabold text-brand-600">{pendingCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-ink-500">Pending</p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4 text-center shadow-card">
            <p className="text-2xl font-extrabold text-emerald-600">{acceptedCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-ink-500">Accepted</p>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-4 text-center shadow-card">
            <p className="text-2xl font-extrabold text-red-600">{declinedCount}</p>
            <p className="mt-0.5 text-xs font-semibold text-ink-500">Declined</p>
          </div>
        </div>

        {/* Filters */}
        <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-surface-border bg-surface-muted p-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-semibold transition-colors",
                filter === f.key
                  ? "bg-surface-card text-brand-600 shadow-sm"
                  : "text-ink-500 hover:text-ink-700"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {/* List */}
        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-surface-border bg-surface-muted/40 py-20 text-center">
            <Inbox className="h-10 w-10 text-ink-300" />
            <p className="text-base font-semibold text-ink-900">No invitations</p>
            <p className="max-w-xs text-sm text-ink-500">
              {filter === "pending"
                ? "You don't have any pending invitations right now."
                : `No ${filter} invitations.`}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filtered.map((inv) => {
              const client = typeof inv.client === "object" ? inv.client : null;
              const job    = typeof inv.job === "object" ? inv.job : null;
              const isResponding = respondMutation.isPending && respondMutation.variables?.id === inv.id;

              return (
                <div
                  key={inv.id}
                  className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card transition-all hover:shadow-lg"
                >
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex flex-1 min-w-0 gap-4">
                      <Avatar src={client?.avatar} name={client?.fullName || "Client"} size="md" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-ink-900">
                          {client?.companyName || client?.fullName || "A client"}
                        </h3>
                        <p className="text-sm text-ink-500">
                          Invited you to apply for:{" "}
                          <span className="font-semibold text-ink-700">{job?.title || "a job"}</span>
                        </p>
                        {job && (job.budgetMin || job.budgetMax) && (
                          <p className="mt-1 text-sm font-bold text-emerald-600">
                            {formatCurrency(job.budgetMin)}
                            {job.budgetMax ? ` – ${formatCurrency(job.budgetMax)}` : ""}
                            {job.priceType === "hourly" ? "/hr" : ""}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge
                        tone={inv.status === "accepted" ? "success" : inv.status === "declined" ? "danger" : "brand"}
                      >
                        {inv.status.charAt(0).toUpperCase() + inv.status.slice(1)}
                      </Badge>
                      <span className="text-xs text-ink-400">{formatRelativeTime(inv.createdAt)}</span>
                    </div>
                  </div>

                  {inv.message && (
                    <div className="mb-4 rounded-lg border border-surface-border bg-surface-muted p-4">
                      <p className="text-sm text-ink-900 leading-relaxed">{inv.message}</p>
                    </div>
                  )}

                  {inv.status === "pending" ? (
                    <div className="flex gap-3">
                      <button
                        onClick={() => respondMutation.mutate({ id: inv.id, action: "accept" })}
                        disabled={respondMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {isResponding && respondMutation.variables?.action === "accept" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <CheckCircle2 className="h-4 w-4" />
                        )}
                        Accept
                      </button>
                      <button
                        onClick={() => respondMutation.mutate({ id: inv.id, action: "decline" })}
                        disabled={respondMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-red-700 transition-colors disabled:opacity-50"
                      >
                        {isResponding && respondMutation.variables?.action === "decline" ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <XCircle className="h-4 w-4" />
                        )}
                        Decline
                      </button>
                    </div>
                  ) : inv.status === "accepted" && job ? (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
                      <span className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <Briefcase className="h-4 w-4" /> Ready to submit your proposal
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => navigate(`/jobs/${job.id}/proposal`)}
                        icon={<ArrowRight className="h-4 w-4" />}
                        iconPosition="right"
                      >
                        Apply Now
                      </Button>
                    </div>
                  ) : null}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
