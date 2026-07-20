import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  Sparkles,
  Bold,
  Italic,
  List,
  Link as LinkIcon,
  Undo2,
  Redo2,
  Plus,
  Trash2,
  Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { FREELANCER_NAV } from "@/constants/nav";
import type { Milestone } from "@/types";
import { useNotification } from "@/context/NotificationContext";
import { ROUTES } from "@/constants/routes";
import { useQuery } from "@tanstack/react-query";
import { jobService } from "@/services/job.service";
import { proposalService } from "@/services/proposal.service";
import { apiClient } from "@/lib/axios";

export default function SubmitProposal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotification();

  const [description, setDescription] = useState("");
  const [bidAmount, setBidAmount] = useState(625);
  const [milestones, setMilestones] = useState<Milestone[]>([{ id: "m1", name: "", amount: 0 }]);
  const [generating, setGenerating] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const serviceFee = Math.round(bidAmount * 0.05);
  const youReceive = bidAmount - serviceFee;

  // Load job details dynamically from MongoDB
  const { data: jobResponse, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const res = await jobService.getById(id!);
      return res.data;
    },
    enabled: !!id,
  });

  const job = jobResponse?.data;

  // Real Gemini AI proposal generation
  const handleAiGenerate = async () => {
    if (!job) return;
    setGenerating(true);
    try {
      const res = await apiClient.post<{ success: boolean; proposal: string }>("/ai/proposal", {
        jobTitle: job.title,
        jobDescription: job.description,
      });
      setDescription(res.data.proposal);
      notify("AI proposal draft generated successfully!", "success");
    } catch (err: any) {
      notify("Failed to generate AI proposal draft", "error");
    } finally {
      setGenerating(false);
    }
  };

  const addMilestone = () =>
    setMilestones([...milestones, { id: `m${milestones.length + 1}`, name: "", amount: 0 }]);
  const removeMilestone = (id: string) => setMilestones(milestones.filter((m) => m.id !== id));

  const handleMilestoneNameChange = (id: string, name: string) => {
    setMilestones(milestones.map((m) => (m.id === id ? { ...m, name } : m)));
  };

  const handleMilestoneAmountChange = (id: string, amount: number) => {
    setMilestones(milestones.map((m) => (m.id === id ? { ...m, amount } : m)));
  };

  const handleSubmit = async () => {
    if (!description) {
      notify("Please provide a cover letter description", "error");
      return;
    }
    setSubmitting(true);
    try {
      await proposalService.submit(id!, {
        description,
        bidAmount: bidAmount * 80,
        estimatedDelivery: "21 days",
        milestones: milestones.map((m) => ({ name: m.name, amount: m.amount * 80 })),
      });
      notify("Proposal submitted successfully!", "success");
      navigate(ROUTES.PROPOSALS);
    } catch (err: any) {
      const errMsg = err.response?.data?.message || err.message || "Failed to submit proposal";
      notify(errMsg, "error");
    } finally {
      setSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout navItems={FREELANCER_NAV} tagline="Freelance Hub" searchPlaceholder="Search for jobs...">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout navItems={FREELANCER_NAV} tagline="Freelance Hub" searchPlaceholder="Search for jobs...">
        <div className="flex h-64 items-center justify-center text-ink-500">
          Job posting not found.
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={FREELANCER_NAV} tagline="Freelance Hub" searchPlaceholder="Search for jobs...">
      <div className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-3">
          <button onClick={() => navigate(-1)} aria-label="Go back" className="rounded-xl p-2 hover:bg-surface-muted">
            ←
          </button>
          <h1 className="text-2xl font-extrabold text-ink-900">Submit Proposal</h1>
          <span className="ml-auto text-sm text-ink-500">for "{job.title}"</span>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <div className="mb-3 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Proposal Description</p>
                <Button
                  size="sm"
                  icon={<Sparkles className="h-4 w-4" />}
                  iconPosition="left"
                  isLoading={generating}
                  onClick={handleAiGenerate}
                >
                  AI Generate Proposal
                </Button>
              </div>
              <div className="rounded-2xl border border-surface-border">
                <div className="flex items-center gap-3 border-b border-surface-border bg-surface-muted px-4 py-2.5 text-ink-500">
                  <Bold className="h-4 w-4" />
                  <Italic className="h-4 w-4" />
                  <List className="h-4 w-4" />
                  <LinkIcon className="h-4 w-4" />
                  <span className="ml-auto flex gap-3">
                    <Undo2 className="h-4 w-4" />
                    <Redo2 className="h-4 w-4" />
                  </span>
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Introduce yourself and explain why you're the perfect fit for this project…"
                  rows={10}
                  className="w-full resize-none rounded-b-2xl p-4 text-sm text-ink-900 outline-none placeholder:text-ink-400"
                />
              </div>
            </div>

            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <div className="mb-4 flex items-center justify-between">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Project Milestones</p>
                <button onClick={addMilestone} className="flex items-center gap-1 text-sm font-semibold text-brand-600">
                  <Plus className="h-4 w-4" /> Add milestone
                </button>
              </div>
              <div className="space-y-3">
                {milestones.map((m, idx) => (
                  <div key={m.id} className="flex gap-3">
                    <input
                      placeholder={`Milestone ${idx + 1} description`}
                      value={m.name}
                      onChange={(e) => handleMilestoneNameChange(m.id, e.target.value)}
                      className="h-11 flex-1 rounded-xl border border-surface-border px-3 text-sm outline-none"
                    />
                    <input
                      type="number"
                      placeholder="Amount"
                      value={m.amount || ""}
                      onChange={(e) => handleMilestoneAmountChange(m.id, parseFloat(e.target.value) || 0)}
                      className="h-11 w-28 rounded-xl border border-surface-border px-3 text-sm outline-none"
                    />
                    {milestones.length > 1 && (
                      <button onClick={() => removeMilestone(m.id)} className="text-ink-400 hover:text-red-500">
                        <Trash2 className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-5">
            <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-5">
              <div>
                <p className="text-xs font-black uppercase tracking-wider text-ink-400">Escrow Contract Proposal</p>
                <h3 className="text-base font-extrabold text-ink-900 mt-1">Pricing & Budget Calculator</h3>
              </div>

              {/* SINGLE USD CURRENCY INPUT */}
              <div className="space-y-4 rounded-2xl bg-surface-muted/50 border border-surface-border p-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-wider text-ink-400 block mb-1.5">PROPOSAL BUDGET (USD $)</label>
                  <div className="flex items-center rounded-xl border border-surface-border bg-surface-card px-3 focus-within:border-brand-500">
                    <span className="text-sm font-bold text-ink-900">$</span>
                    <input
                      type="number"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(parseInt(e.target.value) || 0)}
                      className="h-11 w-full pl-1.5 text-sm font-bold text-ink-900 bg-surface-card outline-none"
                    />
                  </div>
                </div>
              </div>

              {/* INTERACTIVE BUDGET SLIDER */}
              <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-ink-500">
                  <span>Min: $60</span>
                  <span>Max: $6,250</span>
                </div>
                <input
                  type="range"
                  min="60"
                  max="6250"
                  step="50"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(parseInt(e.target.value) || 60)}
                  className="w-full h-2 rounded-lg bg-surface-muted appearance-none cursor-pointer accent-brand-600 focus:outline-none"
                />
                <p className="text-center text-[10px] text-brand-600 font-bold">Drag to quickly adjust budget</p>
              </div>

              {/* BREAKDOWN SHEET */}
              <div className="space-y-3 pt-3 border-t border-surface-border">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-ink-400">Project Bid Amount</span>
                  <span className="text-ink-900">${bidAmount}</span>
                </div>

                <div className="flex justify-between text-xs font-bold">
                  <span className="text-ink-400">Service Fee (5%)</span>
                  <span className="text-red-500">-${serviceFee}</span>
                </div>

                <div className="h-px bg-surface-border" />

                <div className="flex justify-between text-sm font-black">
                  <span className="text-ink-900 font-black">You Receive</span>
                  <span className="text-brand-600 font-black">${youReceive}</span>
                </div>
              </div>

              <div className="pt-2">
                <Button fullWidth onClick={handleSubmit} isLoading={submitting}>
                  Submit Proposal
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
