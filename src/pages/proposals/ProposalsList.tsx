import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  FileText, Loader2, Pencil, Trash2, Clock,
  DollarSign, ChevronDown, ChevronUp, Briefcase, ArrowRight,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { FREELANCER_NAV } from "@/constants/nav";
import { ROUTES } from "@/constants/routes";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalService } from "@/services/proposal.service";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/utils/cn";
import type { Proposal } from "@/types";

type TabKey = "all" | "submitted" | "shortlisted" | "accepted" | "rejected" | "draft";

const TABS: { key: TabKey; label: string }[] = [
  { key: "all",         label: "All"         },
  { key: "submitted",   label: "Submitted"   },
  { key: "shortlisted", label: "Shortlisted" },
  { key: "accepted",    label: "Accepted"    },
  { key: "rejected",    label: "Rejected"    },
  { key: "draft",       label: "Drafts"      },
];

const STATUS_TONE = {
  submitted:   "info",
  shortlisted: "warning",
  accepted:    "success",
  rejected:    "danger",
  draft:       "neutral",
  withdrawn:   "danger",
} as const;

const STATUS_LABEL = {
  submitted:   "Under Review",
  shortlisted: "Shortlisted ⭐",
  accepted:    "Hired",
  rejected:    "Rejected",
  draft:       "Draft",
  withdrawn:   "Withdrawn",
} as const;

export default function ProposalsList() {
  const { user }        = useAuth();
  const navigate        = useNavigate();
  const { notify }      = useNotification();
  const queryClient     = useQueryClient();

  const [activeTab,       setActiveTab]       = useState<TabKey>("all");
  const [expandedId,      setExpandedId]      = useState<string | null>(null);
  const [editingProposal, setEditingProposal] = useState<Proposal | null>(null);
  const [editBid,         setEditBid]         = useState(0);
  const [editCoverLetter, setEditCoverLetter] = useState("");

  // ── Fetch freelancer's own proposals ────────────────────────────────────
  const { data: res, isLoading } = useQuery({
    queryKey: ["proposals", "mine", user?.id ?? user?._id],
    queryFn:  async () => {
      const r = await proposalService.listMine();
      return (r.data.data as any)?.items ?? [];
    },
  });

  const allProposals: Proposal[] = res ?? [];

  const tabCounts = TABS.reduce<Record<string, number>>((acc, t) => {
    acc[t.key] = t.key === "all"
      ? allProposals.length
      : allProposals.filter((p) => p.status === t.key).length;
    return acc;
  }, {});

  const filtered = activeTab === "all"
    ? allProposals
    : allProposals.filter((p) => p.status === activeTab);

  // ── Mutations ─────────────────────────────────────────────────────────────
  const withdrawMutation = useMutation({
    mutationFn: (id: string) => proposalService.withdraw(id),
    onSuccess:  () => {
      queryClient.invalidateQueries({ queryKey: ["proposals", "mine"] });
      notify("Proposal withdrawn.", "info");
    },
    onError: () => notify("Failed to withdraw proposal.", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: { description: string; bidAmount: number } }) =>
      proposalService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals", "mine"] });
      setEditingProposal(null);
      notify("Proposal updated.", "success");
    },
    onError: () => notify("Failed to update proposal.", "error"),
  });

  const openEdit = (p: Proposal) => {
    setEditingProposal(p);
    setEditBid(p.bidAmount);
    setEditCoverLetter((p as any).coverLetter || p.description || "");
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProposal) return;
    updateMutation.mutate({
      id:      editingProposal.id,
      payload: { description: editCoverLetter, bidAmount: editBid },
    });
  };

  return (
    <DashboardLayout
      navItems={FREELANCER_NAV}
      tagline="Freelance Marketplace"
      searchPlaceholder="Search jobs..."
      topbarRightSlot={
        <Button size="sm" icon={<Briefcase className="h-4 w-4" />} iconPosition="left"
          onClick={() => navigate(ROUTES.JOBS)}>
          Browse Jobs
        </Button>
      }
    >
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">My Proposals</h1>
        <p className="mt-1 text-sm text-ink-500">
          Track every proposal you've submitted. All data is live from MongoDB.
        </p>
      </div>

      {/* ── Summary stats ── */}
      {!isLoading && (
        <div className="mb-6 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {[
            { label: "Total",       value: tabCounts.all,         tone: "brand"   },
            { label: "Under Review",value: tabCounts.submitted,   tone: "info"    },
            { label: "Shortlisted", value: tabCounts.shortlisted, tone: "warning" },
            { label: "Accepted",    value: tabCounts.accepted,    tone: "success" },
          ].map((s) => (
            <div key={s.label} className="rounded-2xl border border-surface-border bg-surface-card p-4 text-center shadow-card">
              <p className="text-2xl font-extrabold text-ink-900">{s.value}</p>
              <p className="mt-0.5 text-xs font-semibold text-ink-500">{s.label}</p>
            </div>
          ))}
        </div>
      )}

      {/* ── Tabs ── */}
      <div className="mb-6 flex gap-1 overflow-x-auto rounded-xl border border-surface-border bg-surface-muted p-1">
        {TABS.map((tab) => (
          <button key={tab.key} onClick={() => setActiveTab(tab.key)}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
              activeTab === tab.key
                ? "bg-surface-card text-brand-600 shadow-sm"
                : "text-ink-500 hover:text-ink-700"
            )}>
            {tab.label}
            <span className={cn(
              "inline-flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-xs font-bold",
              activeTab === tab.key ? "bg-brand-100 text-brand-700" : "bg-surface-border text-ink-500"
            )}>
              {tabCounts[tab.key] ?? 0}
            </span>
          </button>
        ))}
      </div>

      {/* ── Content ── */}
      {isLoading ? (
        <div className="flex h-48 items-center justify-center rounded-2xl border border-surface-border bg-surface-card">
          <Loader2 className="h-7 w-7 animate-spin text-brand-600" />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-surface-border bg-surface-card py-16 text-center">
          <FileText className="mb-4 h-12 w-12 text-ink-300" />
          <p className="text-base font-bold text-ink-700">
            {activeTab === "all" ? "No proposals yet" : `No ${activeTab} proposals`}
          </p>
          <p className="mt-1 text-sm text-ink-400">
            {activeTab === "all"
              ? "Browse open jobs and submit proposals to get started."
              : "Switch to a different tab to see other proposals."}
          </p>
          {activeTab === "all" && (
            <Button className="mt-5" size="sm" onClick={() => navigate(ROUTES.JOBS)}>
              Browse Jobs
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((proposal) => {
            const job        = proposal.job as any;
            const client     = job?.client;
            const pId        = proposal.id ?? (proposal as any)._id;
            const isExpanded = expandedId === pId;

            return (
              <div key={pId} className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card transition-shadow hover:shadow-md">
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    {/* Left */}
                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2 mb-1">
                        <span className="text-xs font-semibold uppercase tracking-wide text-brand-600">
                          {job?.category ?? "Job"}
                        </span>
                      </div>
                      <h3 className="text-base font-bold text-ink-900 truncate">
                        {job?.title ?? "Job Posting"}
                      </h3>
                      {client && (
                        <p className="mt-0.5 text-xs text-ink-500">
                          Client: {client.fullName}
                        </p>
                      )}
                      <div className="mt-2 flex flex-wrap gap-4 text-xs text-ink-500">
                        <span className="flex items-center gap-1 font-bold text-brand-600">
                          <DollarSign className="h-3.5 w-3.5" />
                          {formatCurrency(proposal.bidAmount)} bid
                        </span>
                        {proposal.estimatedDelivery && (
                          <span className="flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5" />
                            {proposal.estimatedDelivery}
                          </span>
                        )}
                        <span className="flex items-center gap-1">
                          <Clock className="h-3.5 w-3.5" />
                          {formatRelativeTime(proposal.createdAt ?? (proposal as any).submittedAt ?? "")}
                        </span>
                      </div>
                    </div>

                    {/* Right */}
                    <div className="flex flex-col items-end gap-3 shrink-0">
                      <Badge
                        tone={STATUS_TONE[proposal.status as keyof typeof STATUS_TONE] ?? "neutral"}
                        dot
                      >
                        {STATUS_LABEL[proposal.status as keyof typeof STATUS_LABEL] ?? proposal.status}
                      </Badge>

                      {proposal.status === "submitted" && (
                        <div className="flex items-center gap-1.5">
                          <button onClick={() => openEdit(proposal)}
                            className="rounded-lg p-2 hover:bg-surface-muted text-ink-500 transition-colors"
                            title="Edit proposal">
                            <Pencil className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => {
                              if (confirm("Withdraw this proposal?"))
                                withdrawMutation.mutate(pId);
                            }}
                            disabled={withdrawMutation.isPending}
                            className="rounded-lg p-2 hover:bg-red-50 text-red-500 transition-colors disabled:opacity-50"
                            title="Withdraw">
                            {withdrawMutation.isPending
                              ? <Loader2 className="h-4 w-4 animate-spin" />
                              : <Trash2 className="h-4 w-4" />}
                          </button>
                        </div>
                      )}

                      {job && (
                        <button
                          onClick={() => navigate(`/jobs/${job.id ?? job._id}`)}
                          className="flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                          View Job <ArrowRight className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expand toggle */}
                  <button
                    onClick={() => setExpandedId(isExpanded ? null : pId)}
                    className="mt-4 flex items-center gap-1 text-xs font-semibold text-brand-600 hover:text-brand-700">
                    {isExpanded
                      ? <><ChevronUp className="h-4 w-4" /> Hide Cover Letter</>
                      : <><ChevronDown className="h-4 w-4" /> View Cover Letter</>}
                  </button>
                </div>

                {/* Expanded cover letter */}
                {isExpanded && (
                  <div className="border-t border-surface-border bg-surface-muted px-6 py-4">
                    <p className="mb-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">Cover Letter</p>
                    <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">
                      {(proposal as any).coverLetter || proposal.description || "No cover letter provided."}
                    </p>
                    {proposal.milestones?.length > 0 && (
                      <div className="mt-4">
                        <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Milestones</p>
                        <div className="space-y-2">
                          {proposal.milestones.map((m, i) => (
                            <div key={m.id ?? i} className="flex justify-between rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-sm">
                              <span className="text-ink-700">{m.name || `Milestone ${i + 1}`}</span>
                              <span className="font-semibold text-brand-600">{formatCurrency(m.amount)}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Edit Proposal Modal ── */}
      {editingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
            <h2 className="mb-5 text-lg font-extrabold text-ink-900">Edit Proposal</h2>
            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <Input
                label="Bid Amount (₹)"
                type="number"
                min={0}
                value={editBid}
                onChange={(e) => setEditBid(Number(e.target.value))}
                required
              />
              <div>
                <label className="mb-1.5 block text-sm font-medium text-ink-700">Cover Letter</label>
                <textarea
                  rows={7}
                  value={editCoverLetter}
                  onChange={(e) => setEditCoverLetter(e.target.value)}
                  className="w-full rounded-xl border border-surface-border bg-surface-card p-3 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 resize-none"
                  required
                />
              </div>
              <div className="flex justify-end gap-3 pt-2">
                <Button variant="ghost" type="button" onClick={() => setEditingProposal(null)}>Cancel</Button>
                <Button type="submit" isLoading={updateMutation.isPending}>Save Changes</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
