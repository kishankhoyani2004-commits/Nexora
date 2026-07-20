import { useState } from "react";
import { FileText, Loader2, Edit, Trash2, Shield } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { FREELANCER_NAV, CLIENT_NAV } from "@/constants/nav";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { proposalService } from "@/services/proposal.service";
import { contractService } from "@/services/contract.service";
import { useNotification } from "@/context/NotificationContext";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Avatar } from "@/components/ui/Avatar";

const statusTone = {
  submitted: "info",
  shortlisted: "warning",
  accepted: "success",
  rejected: "danger",
  draft: "warning",
  withdrawn: "danger",
} as const;

export default function ProposalsList() {
  const { user } = useAuth();
  const isClient = user?.role === "client";
  const navItems = isClient ? CLIENT_NAV : FREELANCER_NAV;
  const queryClient = useQueryClient();
  const { notify } = useNotification();

  // Freelancer Edit State
  const [editingProposal, setEditingProposal] = useState<any>(null);
  const [bidAmount, setBidAmount] = useState(0);
  const [coverLetter, setCoverLetter] = useState("");

  // 1. Fetch Proposals: submitted (Freelancer) vs received (Client)
  const { data: response, isLoading } = useQuery({
    queryKey: isClient ? ["proposals", "received"] : ["proposals", "mine"],
    queryFn: async () => {
      const res = isClient
        ? await proposalService.listReceived()
        : await proposalService.listMine();
      return res.data;
    },
  });

  // Handle paginated vs array structures
  const proposals = isClient
    ? (response?.data as any) || []
    : (response?.data as any)?.items || [];

  // 2. Freelancer Mutations
  const updateMutation = useMutation({
    mutationFn: async () => {
      if (!editingProposal) return;
      await proposalService.update(editingProposal.id || editingProposal._id, {
        bidAmount,
        description: coverLetter,
      });
    },
    onSuccess: () => {
      setEditingProposal(null);
      queryClient.invalidateQueries({ queryKey: ["proposals", "mine"] });
      notify("Proposal updated successfully!", "success");
    },
    onError: (err: any) => {
      notify(err.message || "Failed to update proposal", "error");
    },
  });

  const withdrawMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      await proposalService.withdraw(proposalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals", "mine"] });
      notify("Proposal withdrawn successfully", "success");
    },
    onError: (err: any) => {
      notify(err.message || "Failed to withdraw proposal", "error");
    },
  });

  // 3. Client Accept Proposal & Fund Escrow Mutation
  const acceptMutation = useMutation({
    mutationFn: async (proposalId: string) => {
      await contractService.create(proposalId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["proposals", "received"] });
      notify("Proposal accepted, contract activated, escrow funded!", "success");
    },
    onError: (err: any) => {
      notify(err.message || "Failed to accept proposal", "error");
    },
  });

  const startEdit = (p: any) => {
    setEditingProposal(p);
    setBidAmount(p.bidAmount || 0);
    setCoverLetter(p.coverLetter || "");
  };

  const handleEditSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate();
  };

  return (
    <DashboardLayout navItems={navItems} tagline="Freelance Hub" searchPlaceholder="Search proposals...">
      <h1 className="mb-1 text-2xl font-extrabold text-ink-900">Proposals</h1>
      <p className="mb-6 text-sm text-ink-500">
        {isClient
          ? "Review proposals submitted by freelancers to your active job briefs."
          : "Track every proposal you've submitted across active jobs."}
      </p>

      {isLoading ? (
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : proposals.length === 0 ? (
        <EmptyState
          icon={FileText}
          title={isClient ? "No proposals received yet" : "No proposals submitted yet"}
          description={isClient ? "Your active jobs will display submissions here once freelancers apply." : "Apply to jobs in the marketplace to see them tracked here."}
        />
      ) : (
        <div className="space-y-4">
          {proposals.map((p: any) => {
            const freelancer = p.freelancer || {};
            const job = p.job || {};
            
            return (
              <div
                key={p.id || p._id}
                className="flex flex-col gap-4 rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card transition-colors hover:border-ink-200"
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <h3 className="font-bold text-ink-900">{job.title || "Project Brief"}</h3>
                    <p className="text-sm text-ink-500">
                      {isClient
                        ? `Submitted by ${freelancer.fullName || "Freelancer"}`
                        : `Client: ${job.client?.fullName || "Company"} · Submitted ${new Date(p.createdAt).toLocaleDateString()}`}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="font-extrabold text-ink-900">{formatCurrency(p.bidAmount)}</span>
                    <Badge tone={statusTone[p.status as keyof typeof statusTone] || "info"} className="capitalize">
                      {p.status}
                    </Badge>
                  </div>
                </div>

                <div className="rounded-2xl bg-surface-muted p-4">
                  {isClient && freelancer.fullName && (
                    <div className="mb-3 flex items-center gap-3">
                      <Avatar src={freelancer.avatar || freelancer.avatarUrl} name={freelancer.fullName} size="sm" />
                      <div>
                        <p className="text-sm font-bold text-ink-900">{freelancer.fullName}</p>
                        <p className="text-xs text-ink-400">{freelancer.location || "Location unstated"}</p>
                      </div>
                    </div>
                  )}
                  <p className="text-xs font-bold uppercase tracking-wider text-ink-400 mb-1">Cover Letter</p>
                  <p className="text-sm text-ink-700 whitespace-pre-line">{p.coverLetter}</p>
                </div>

                {/* Role Specific Actions */}
                {isClient ? (
                  p.status === "submitted" && (
                    <div className="flex justify-end pt-2">
                      <Button
                        size="sm"
                        onClick={() => acceptMutation.mutate(p.id || p._id)}
                        isLoading={acceptMutation.isPending}
                        className="flex items-center gap-1"
                      >
                        <Shield className="h-3.5 w-3.5" /> Accept Proposal & Hire
                      </Button>
                    </div>
                  )
                ) : (
                  p.status === "submitted" && (
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="outline" size="sm" onClick={() => startEdit(p)}>
                        <Edit className="h-3.5 w-3.5 mr-1" /> Edit Bid
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          if (confirm("Are you sure you want to withdraw your proposal?")) {
                            withdrawMutation.mutate(p.id || p._id);
                          }
                        }}
                        className="border-danger-200 text-danger-600 hover:bg-danger-50"
                        isLoading={withdrawMutation.isPending}
                      >
                        <Trash2 className="h-3.5 w-3.5 mr-1" /> Withdraw
                      </Button>
                    </div>
                  )
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Freelancer Edit Proposal Modal */}
      {editingProposal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-lg rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
            <h2 className="text-xl font-bold text-ink-900 mb-4">Edit Proposal</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <Input
                label="Bid Amount ($)"
                type="number"
                value={bidAmount}
                onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                required
              />
              <div>
                <label className="block text-xs font-bold uppercase tracking-wider text-ink-500 mb-1">
                  Cover Letter
                </label>
                <textarea
                  rows={6}
                  value={coverLetter}
                  onChange={(e) => setCoverLetter(e.target.value)}
                  className="w-full rounded-xl border border-surface-border bg-surface-card p-3 text-sm text-ink-900 outline-none focus:border-brand-500"
                  required
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="secondary" onClick={() => setEditingProposal(null)} type="button">
                  Cancel
                </Button>
                <Button type="submit" isLoading={updateMutation.isPending}>
                  Save Changes
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
