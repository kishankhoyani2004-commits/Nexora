import { useState, useRef } from "react";
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
  UploadCloud,
  Paperclip,
  X,
  Wand2,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { FREELANCER_NAV } from "@/constants/nav";
import type { Milestone, JobAttachment } from "@/types";
import { useNotification } from "@/context/NotificationContext";
import { ROUTES } from "@/constants/routes";
import { useQuery } from "@tanstack/react-query";
import { jobService } from "@/services/job.service";
import { proposalService } from "@/services/proposal.service";
import { aiService } from "@/services/ai.service";

export default function SubmitProposal() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { notify } = useNotification();

  const [description, setDescription] = useState("");
  const [bidAmount, setBidAmount] = useState<number | "">("");
  const [deliveryDays, setDeliveryDays] = useState<number | "">("");
  const [milestones, setMilestones] = useState<Milestone[]>([{ id: "m1", name: "", amount: 0 }]);
  const [attachments, setAttachments] = useState<JobAttachment[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [generating, setGenerating] = useState(false);
  const [improving, setImproving] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [estimatingBid, setEstimatingBid] = useState(false);
  const [bidSuggestion, setBidSuggestion] = useState<{ suggestedBid: number; reasoning: string } | null>(null);
  const [estimatingDelivery, setEstimatingDelivery] = useState(false);
  const [deliverySuggestion, setDeliverySuggestion] = useState<{ estimatedDelivery: string; reasoning: string } | null>(null);

  const numericBid = typeof bidAmount === "number" ? bidAmount : 0;
  const serviceFee = Math.round(numericBid * 0.05);
  const youReceive = numericBid - serviceFee;

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

  // Real Gemini AI proposal generation — deeply tailored to this specific job
  const handleAiGenerate = async () => {
    if (!id) return;
    setGenerating(true);
    try {
      const res = await aiService.generateProposalForJob(id);
      setDescription(res.data.data.content);
      notify("AI proposal draft generated specifically for this project!", "success");
    } catch (err: any) {
      notify("Failed to generate AI proposal draft", "error");
    } finally {
      setGenerating(false);
    }
  };

  // Polish or refine user's existing draft
  const handleAiImprove = async () => {
    if (!description.trim()) return;
    setImproving(true);
    try {
      const res = await aiService.improveProposalText(description);
      setDescription(res.data.data.content);
      notify("Proposal draft refined and improved by AI!", "success");
    } catch (err: any) {
      notify("Failed to improve proposal draft", "error");
    } finally {
      setImproving(false);
    }
  };

  // Job budget/duration are stored in INR on the backend; this page's pricing
  // calculator works in USD (see the *80 conversion on submit below), so AI
  // suggestions are converted back to USD to stay consistent with the UI.
  const handleEstimateBid = async () => {
    if (!id) return;
    setEstimatingBid(true);
    try {
      const res = await aiService.estimateBidAmount(id);
      setBidSuggestion(res.data.data);
    } catch {
      notify("Failed to fetch AI bid estimate.", "error");
    } finally {
      setEstimatingBid(false);
    }
  };

  const handleEstimateDelivery = async () => {
    if (!id) return;
    setEstimatingDelivery(true);
    try {
      const res = await aiService.estimateProposalDeliveryTime(id);
      setDeliverySuggestion(res.data.data);
    } catch {
      notify("Failed to fetch AI delivery estimate.", "error");
    } finally {
      setEstimatingDelivery(false);
    }
  };

  // Best-effort parse of a free-form estimate like "2 weeks" into a day count.
  const parseDeliveryDays = (text: string): number | null => {
    const match = text.match(/(\d+)\s*(day|week|month)/i);
    if (!match) return null;
    const n = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    if (unit.startsWith("week")) return n * 7;
    if (unit.startsWith("month")) return n * 30;
    return n;
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

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploadingFile(true);
    try {
      for (const file of Array.from(files)) {
        const res = await proposalService.uploadAttachment(file);
        setAttachments((prev) => [...prev, res.data.data]);
      }
      notify("File uploaded successfully.", "success");
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to upload file.", "error");
    } finally {
      setUploadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const removeAttachment = (url: string) =>
    setAttachments((prev) => prev.filter((a) => a.url !== url));

  const handleSubmit = async () => {
    if (!description.trim()) {
      notify("Please write a cover letter before submitting.", "error");
      return;
    }
    if (!bidAmount || Number(bidAmount) <= 0) {
      notify("Please enter your proposal budget.", "error");
      return;
    }
    if (!deliveryDays || Number(deliveryDays) < 1) {
      notify("Please enter a valid delivery time in days.", "error");
      return;
    }
    setSubmitting(true);
    try {
      await proposalService.submit(id!, {
        description,          // backend stores as description
        coverLetter: description, // and also as coverLetter for consistency
        bidAmount:   Number(bidAmount) * 80,  // convert USD → INR
        estimatedDelivery: `${deliveryDays} day${Number(deliveryDays) === 1 ? "" : "s"}`,
        milestones: milestones
          .filter((m) => m.name.trim())
          .map((m) => ({ name: m.name, amount: m.amount * 80 })),
        attachments,
      });
      notify("Proposal submitted successfully!", "success");
      navigate(ROUTES.PROPOSALS);
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || "Failed to submit proposal.", "error");
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
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Proposal Description</p>
                <div className="flex items-center gap-2">
                  {description.trim().length > 0 && (
                    <Button
                      size="sm"
                      variant="outline"
                      icon={<Wand2 className="h-4 w-4" />}
                      iconPosition="left"
                      isLoading={improving}
                      onClick={handleAiImprove}
                    >
                      Improve Draft
                    </Button>
                  )}
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

            {/* Attachments */}
            <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <p className="mb-4 text-xs font-bold uppercase tracking-wide text-ink-400">Attachments (optional)</p>
              <input
                ref={fileInputRef}
                type="file"
                multiple
                onChange={handleFileSelect}
                className="hidden"
                id="proposal-attachments-input"
              />
              <label
                htmlFor="proposal-attachments-input"
                className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-border py-8 text-center cursor-pointer hover:border-brand-400 transition-colors"
              >
                {uploadingFile ? (
                  <Loader2 className="mb-2 h-7 w-7 animate-spin text-brand-500" />
                ) : (
                  <UploadCloud className="mb-2 h-7 w-7 text-brand-500" />
                )}
                <p className="text-sm font-semibold text-ink-700">
                  {uploadingFile ? "Uploading…" : "Click or drag files to upload"}
                </p>
                <p className="text-xs text-ink-400 mt-0.5">PDF, DOC, PNG, JPG (Max 10MB each)</p>
              </label>

              {attachments.length > 0 && (
                <div className="mt-4 space-y-2">
                  {attachments.map((a) => (
                    <div key={a.url} className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-muted px-3 py-2">
                      <Paperclip className="h-4 w-4 shrink-0 text-brand-600" />
                      <span className="flex-1 truncate text-sm text-ink-700">{a.filename}</span>
                      <button onClick={() => removeAttachment(a.url)} aria-label={`Remove ${a.filename}`}
                        className="text-ink-400 hover:text-red-500">
                        <X className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
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
                  <div className="mb-1.5 flex items-center justify-between">
                    <label className="text-[10px] font-black uppercase tracking-wider text-ink-400">PROPOSAL BUDGET (USD $)</label>
                    <button
                      onClick={handleEstimateBid}
                      disabled={estimatingBid}
                      className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:underline disabled:opacity-50"
                    >
                      {estimatingBid ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                      AI Estimate
                    </button>
                  </div>
                  <div className="flex items-center rounded-xl border border-surface-border bg-surface-card px-3 focus-within:border-brand-500">
                    <span className="text-sm font-bold text-ink-900">$</span>
                    <input
                      type="number"
                      placeholder="e.g. 500"
                      value={bidAmount}
                      onChange={(e) => setBidAmount(e.target.value === "" ? "" : Number(e.target.value))}
                      className="h-11 w-full pl-1.5 text-sm font-bold text-ink-900 bg-surface-card outline-none"
                    />
                  </div>
                  {bidSuggestion && (
                    <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50 p-2.5 text-xs text-ink-700">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-brand-700">${Math.round(bidSuggestion.suggestedBid / 80)}</span>
                        <button
                          onClick={() => { setBidAmount(Math.round(bidSuggestion.suggestedBid / 80)); setBidSuggestion(null); }}
                          className="font-bold text-brand-600 hover:underline"
                        >
                          Apply
                        </button>
                      </div>
                      <p className="mt-1 text-ink-500">{bidSuggestion.reasoning}</p>
                    </div>
                  )}
                </div>
              </div>

              {/* DELIVERY TIME */}
              <div>
                <div className="mb-1.5 flex items-center justify-between">
                  <label className="text-[10px] font-black uppercase tracking-wider text-ink-400">Delivery Time (days)</label>
                  <button
                    onClick={handleEstimateDelivery}
                    disabled={estimatingDelivery}
                    className="flex items-center gap-1 text-[10px] font-bold text-brand-600 hover:underline disabled:opacity-50"
                  >
                    {estimatingDelivery ? <Loader2 className="h-3 w-3 animate-spin" /> : <Wand2 className="h-3 w-3" />}
                    AI Estimate
                  </button>
                </div>
                <div className="flex items-center rounded-xl border border-surface-border bg-surface-card px-3 focus-within:border-brand-500">
                  <input
                    type="number"
                    min={1}
                    placeholder="e.g. 14"
                    value={deliveryDays}
                    onChange={(e) => setDeliveryDays(e.target.value === "" ? "" : Number(e.target.value))}
                    className="h-11 w-full text-sm font-bold text-ink-900 bg-surface-card outline-none"
                  />
                  <span className="text-xs font-semibold text-ink-400 shrink-0">days</span>
                </div>
                {deliverySuggestion && (
                  <div className="mt-2 rounded-xl border border-brand-200 bg-brand-50 p-2.5 text-xs text-ink-700">
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-brand-700">{deliverySuggestion.estimatedDelivery}</span>
                      {parseDeliveryDays(deliverySuggestion.estimatedDelivery) && (
                        <button
                          onClick={() => { setDeliveryDays(parseDeliveryDays(deliverySuggestion.estimatedDelivery)!); setDeliverySuggestion(null); }}
                          className="font-bold text-brand-600 hover:underline"
                        >
                          Apply
                        </button>
                      )}
                    </div>
                    <p className="mt-1 text-ink-500">{deliverySuggestion.reasoning}</p>
                  </div>
                )}
              </div>

              {/* BREAKDOWN SHEET */}
              <div className="space-y-3 pt-3 border-t border-surface-border">
                <div className="flex justify-between text-xs font-bold">
                  <span className="text-ink-400">Project Bid Amount</span>
                  <span className="text-ink-900">{bidAmount !== "" ? `$${bidAmount}` : "$0"}</span>
                </div>

                <div className="flex justify-between text-xs font-bold">
                  <span className="text-ink-400">Service Fee (5%)</span>
                  <span className="text-red-500">-${serviceFee}</span>
                </div>

                <div className="h-px bg-surface-border" />

                <div className="flex justify-between text-sm font-black">
                  <span className="text-ink-900 font-black">You Receive</span>
                  <span className="text-brand-600 font-black">${youReceive > 0 ? youReceive : 0}</span>
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
