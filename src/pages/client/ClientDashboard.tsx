import { useState } from "react";
import {
  Briefcase,
  FileText,
  Rocket,
  Wallet,
  Sparkles,
  Pencil,
  Trash2,
  Check,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  Calendar,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { StatCard } from "@/components/cards/StatCard";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { CLIENT_NAV } from "@/constants/nav";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { formatCurrency } from "@/utils/formatters";
import { ROUTES } from "@/constants/routes";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { jobService } from "@/services/job.service";
import { proposalService } from "@/services/proposal.service";
import { contractService } from "@/services/contract.service";
import { useNotification } from "@/context/NotificationContext";
import type { Job, Proposal } from "@/types";

export default function ClientDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotification();

  const clientId = user?.id || user?._id;

  // Modal / Edit state
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editTitle, setEditTitle] = useState("");
  const [editCategory, setEditCategory] = useState("");
  const [editBudget, setEditBudget] = useState(0);
  const [editExperience, setEditExperience] = useState<"entry" | "intermediate" | "expert">("intermediate");
  const [editDescription, setEditDescription] = useState("");

  const [expandedJobId, setExpandedJobId] = useState<string | null>(null);

  // 1. Fetch Client's Jobs
  const { data: jobsResponse, isLoading: isLoadingJobs } = useQuery({
    queryKey: ["clientJobs", clientId],
    queryFn: async () => {
      const res = await jobService.list({ client: clientId });
      return res.data;
    },
    enabled: !!clientId,
  });

  // 2. Fetch Client's Contracts
  const { data: contractsResponse, isLoading: isLoadingContracts } = useQuery({
    queryKey: ["clientContracts"],
    queryFn: async () => {
      const res = await contractService.list();
      return res.data;
    },
  });

  // 3. Fetch Proposals for expanded job
  const { data: proposalsResponse, isLoading: isLoadingProposals } = useQuery({
    queryKey: ["jobProposals", expandedJobId],
    queryFn: async () => {
      const res = await proposalService.listForJob(expandedJobId!);
      return res.data;
    },
    enabled: !!expandedJobId,
  });

  // Mutations
  const deleteJobMutation = useMutation({
    mutationFn: (id: string) => jobService.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
      notify("Job brief deleted successfully.", "success");
    },
    onError: (err: any) => {
      notify(err.message || "Failed to delete job brief.", "error");
    },
  });

  const updateJobMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Job> }) =>
      jobService.update(id, payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
      setEditingJob(null);
      notify("Job brief updated successfully.", "success");
    },
    onError: (err: any) => {
      notify(err.message || "Failed to update job brief.", "error");
    },
  });

  const hireMutation = useMutation({
    mutationFn: (proposalId: string) => contractService.create(proposalId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
      queryClient.invalidateQueries({ queryKey: ["clientContracts"] });
      queryClient.invalidateQueries({ queryKey: ["jobProposals", expandedJobId] });
      notify("Contract successfully created and escrow funded!", "success");
    },
    onError: (err: any) => {
      const msg = err.response?.data?.message || err.message || "Failed to hire freelancer.";
      notify(msg, "error");
    },
  });

  const completeContractMutation = useMutation({
    mutationFn: (contractId: string) =>
      contractService.updateStatus(contractId, { status: "completed" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["clientContracts"] });
      queryClient.invalidateQueries({ queryKey: ["clientJobs"] });
      notify("Contract marked as completed. Funds released to freelancer.", "success");
    },
    onError: (err: any) => {
      notify(err.message || "Failed to update contract.", "error");
    },
  });

  // Calculate live stats
  const clientJobs = jobsResponse?.data?.items || [];
  const clientContracts = contractsResponse?.data || [];

  const activeJobsCount = clientJobs.filter((j) => j.status === "open").length;
  const totalProposalsCount = clientJobs.reduce((sum, j) => sum + (j.proposalsCount || 0), 0);
  const activeContractsCount = clientContracts.filter((c) => c.status === "active").length;
  const totalSpending = clientContracts
    .filter((c) => c.status === "completed" || c.status === "active")
    .reduce((sum, c) => sum + c.budget, 0);

  const stats = [
    { id: "1", label: "Active Job Briefs", value: String(activeJobsCount), icon: Briefcase, tone: "brand" as const },
    { id: "2", label: "Total Proposals", value: String(totalProposalsCount), icon: FileText, tone: "info" as const },
    { id: "3", label: "Running Contracts", value: String(activeContractsCount), icon: Rocket, tone: "success" as const },
    { id: "4", label: "Total Committed", value: formatCurrency(totalSpending), icon: Wallet, tone: "warning" as const },
  ];

  const handleEditClick = (job: Job) => {
    setEditingJob(job);
    setEditTitle(job.title);
    setEditCategory(job.category);
    setEditBudget(job.budgetMin);
    setEditExperience(job.experienceLevel as any);
    setEditDescription(job.description);
  };

  const handleUpdateSubmit = () => {
    if (!editingJob) return;
    updateJobMutation.mutate({
      id: editingJob.id,
      payload: {
        title: editTitle,
        category: editCategory,
        budgetMin: editBudget,
        budgetMax: editBudget,
        experienceLevel: editExperience as any,
        description: editDescription,
      },
    });
  };

  const toggleProposals = (jobId: string) => {
    if (expandedJobId === jobId) {
      setExpandedJobId(null);
    } else {
      setExpandedJobId(jobId);
    }
  };

  const proposalsList = proposalsResponse?.data || [];

  return (
    <DashboardLayout
      navItems={CLIENT_NAV}
      tagline="Freelance Marketplace"
      searchPlaceholder="Search talents or projects..."
      topbarRightSlot={
        <Button size="sm" onClick={() => navigate(ROUTES.POST_JOB)}>
          Create Brief
        </Button>
      }
    >
      {/* Header Banner */}
      <div className="mb-6 flex flex-col gap-6 rounded-2xl border border-surface-border bg-surface-card p-8 shadow-card md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-2xl font-extrabold text-ink-900">
            Good morning, {user?.fullName.split(" ")[0] || "there"}!
          </h1>
          <p className="mt-1.5 max-w-lg text-sm text-ink-500">
            Your hiring pipeline is synced with our live MongoDB database. Manage your active briefs, review proposals, and release escrow funds.
          </p>
        </div>
        <Button variant="secondary" icon={<Sparkles className="h-4 w-4" />} iconPosition="left" onClick={() => navigate(ROUTES.AI_ASSISTANT)}>
          Ask Nexora AI
        </Button>
      </div>

      {/* Stats Grid */}
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((stat) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.value}
            icon={stat.icon}
            tone={stat.tone}
          />
        ))}
      </div>

      {/* Main Grid: Posted Jobs & Active Contracts */}
      <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
        {/* Jobs & Proposals (Col Span 2) */}
        <div className="space-y-4 xl:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Your Posted Jobs</h2>
            <Badge tone="brand">LIVE DATA</Badge>
          </div>

          {isLoadingJobs ? (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-surface-border bg-surface-card">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : clientJobs.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-card p-8 text-center text-ink-500">
              You haven't posted any job briefs yet. Click "Create Brief" to start!
            </div>
          ) : (
            clientJobs.map((job) => (
              <div
                key={job.id}
                className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card transition-all"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <span className="text-xs font-semibold uppercase tracking-wider text-brand-600">
                        {job.category}
                      </span>
                      <h3 className="mt-1 text-base font-bold text-ink-900">{job.title}</h3>
                      <div className="mt-2 flex flex-wrap gap-3 text-xs text-ink-500">
                        <span className="flex items-center gap-1">
                          <Wallet className="h-3.5 w-3.5 text-ink-400" />
                          {formatCurrency(job.budgetMin)}
                        </span>
                        <span className="flex items-center gap-1 capitalize">
                          <Briefcase className="h-3.5 w-3.5 text-ink-400" />
                          {job.experienceLevel}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3.5 w-3.5 text-ink-400" />
                          {new Date(job.postedAt || (job as any).createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge
                        tone={
                          job.status === "open"
                            ? "success"
                            : job.status === "in_progress"
                            ? "brand"
                            : job.status === "completed"
                            ? "info"
                            : "neutral"
                        }
                      >
                        {job.status.replace("_", " ").toUpperCase()}
                      </Badge>
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditClick(job)}
                          aria-label="Edit job"
                          className="rounded-lg p-1.5 hover:bg-surface-muted text-ink-500 transition-colors"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => deleteJobMutation.mutate(job.id)}
                          aria-label="Delete job"
                          className="rounded-lg p-1.5 hover:bg-red-50 text-red-500 transition-colors"
                          disabled={deleteJobMutation.isPending}
                        >
                          {deleteJobMutation.isPending ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </div>
                  </div>

                  <p className="mt-3 text-sm text-ink-600 line-clamp-2">{job.description}</p>

                  <div className="mt-4 flex items-center justify-between border-t border-surface-border pt-4">
                    <span className="text-xs font-semibold text-ink-500">
                      {job.proposalsCount || 0} proposals submitted
                    </span>
                    <button
                      onClick={() => toggleProposals(job.id)}
                      className="flex items-center gap-1 text-xs font-bold text-brand-600 hover:text-brand-700"
                    >
                      {expandedJobId === job.id ? (
                        <>
                          Hide Proposals <ChevronUp className="h-4.5 w-4.5" />
                        </>
                      ) : (
                        <>
                          View Proposals <ChevronDown className="h-4.5 w-4.5" />
                        </>
                      )}
                    </button>
                  </div>
                </div>

                {/* Proposals Expansion */}
                {expandedJobId === job.id && (
                  <div className="border-t border-surface-border bg-surface-muted p-6 space-y-4">
                    <h4 className="text-sm font-bold text-ink-900">Submitted Proposals</h4>
                    {isLoadingProposals ? (
                      <div className="flex justify-center py-4">
                        <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                      </div>
                    ) : proposalsList.length === 0 ? (
                      <p className="text-xs text-ink-500">No proposals received for this brief yet.</p>
                    ) : (
                      proposalsList.map((prop: Proposal) => (
                        <div
                          key={prop.id}
                          className="rounded-xl border border-surface-border bg-surface-card p-4 shadow-sm"
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="text-sm font-bold text-ink-900">
                                {prop.freelancer?.fullName || "Nexora Freelancer"}
                              </p>
                              <p className="text-xs text-ink-500 mt-0.5">
                                Bid: <span className="font-bold text-brand-600">{formatCurrency(prop.bidAmount)}</span> • Delivery: {prop.estimatedDelivery || "21 days"}
                              </p>
                            </div>
                            {prop.status === "submitted" && (
                              <Button
                                size="sm"
                                icon={<Check className="h-3 w-3" />}
                                iconPosition="left"
                                isLoading={hireMutation.isPending}
                                onClick={() => hireMutation.mutate(prop.id)}
                              >
                                Accept & Hire
                              </Button>
                            )}
                            {prop.status === "accepted" && (
                              <Badge tone="success">HIRED</Badge>
                            )}
                          </div>
                          <p className="mt-2 text-xs text-ink-600 whitespace-pre-wrap">{prop.description}</p>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))
          )}
        </div>

        {/* Active Contracts (Col Span 1) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink-900">Active Contracts</h2>
            <Badge tone="success">ESCROW</Badge>
          </div>

          {isLoadingContracts ? (
            <div className="flex h-32 items-center justify-center rounded-2xl border border-surface-border bg-surface-card">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : clientContracts.length === 0 ? (
            <div className="rounded-2xl border border-surface-border bg-surface-card p-8 text-center text-ink-500">
              No active contracts found. Hire freelancers by accepting proposals.
            </div>
          ) : (
            clientContracts.map((contract) => (
              <div
                key={contract.id}
                className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card space-y-4"
              >
                <div>
                  <h3 className="text-sm font-bold text-ink-900">{contract.title}</h3>
                  <p className="text-xs text-ink-500 mt-1">
                    Freelancer: {contract.freelancer?.fullName || "Freelancer"}
                  </p>
                  <p className="text-xs text-ink-500">
                    Budget: <span className="font-semibold text-brand-600">{formatCurrency(contract.budget)}</span>
                  </p>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex gap-1.5 flex-wrap">
                    <Badge tone={contract.status === "completed" ? "success" : "brand"}>
                      {contract.status.toUpperCase()}
                    </Badge>
                    <Badge tone={contract.escrowStatus === "released" ? "success" : "info"}>
                      Escrow: {contract.escrowStatus.toUpperCase()}
                    </Badge>
                  </div>

                  {contract.status === "active" && (
                    <Button
                      size="sm"
                      variant="outline"
                      isLoading={completeContractMutation.isPending}
                      onClick={() => completeContractMutation.mutate(contract.id)}
                    >
                      Complete & Pay
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Edit Job Modal */}
      {editingJob && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="relative w-full max-w-xl rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card max-h-[90vh] overflow-y-auto">
            <button
              onClick={() => setEditingJob(null)}
              className="absolute right-4 top-4 rounded-xl p-1.5 hover:bg-surface-muted text-ink-400 hover:text-ink-600"
            >
              <X className="h-5 w-5" />
            </button>

            <h3 className="text-lg font-extrabold text-ink-900 mb-4">Edit Job Brief</h3>

            <div className="space-y-4">
              <Input
                label="Job Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
              />

              <div className="grid grid-cols-2 gap-4">
                <Select
                  label="Category"
                  value={editCategory}
                  onChange={(e) => setEditCategory(e.target.value)}
                >
                  {["UI/UX Design", "AI & ML", "Web Development", "Branding", "Data Science", "Full Stack Development", "Backend Development"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>

                <Input
                  label="Budget (₹)"
                  type="number"
                  value={editBudget}
                  onChange={(e) => setEditBudget(Number(e.target.value))}
                />
              </div>

              <Select
                label="Experience Level Required"
                value={editExperience}
                onChange={(e) => setEditExperience(e.target.value as any)}
              >
                <option value="entry">Entry</option>
                <option value="intermediate">Intermediate</option>
                <option value="expert">Expert</option>
              </Select>

              <div>
                <label className="block text-sm font-semibold text-ink-700 mb-1.5">Description</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={6}
                  className="w-full rounded-xl border border-surface-border p-3 text-sm text-ink-900 outline-none focus:border-brand-500"
                />
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <Button variant="ghost" onClick={() => setEditingJob(null)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleUpdateSubmit}
                  isLoading={updateJobMutation.isPending}
                >
                  Save Changes
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
