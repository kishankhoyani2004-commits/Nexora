import { useState } from "react";
import { createPortal } from "react-dom";
import { Star, X, PenLine, CheckCircle2, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  reviewService,
  type ReviewDto,
  type ReviewableContractDto,
} from "@/services/review.service";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/utils/cn";

type Tab = "toReview" | "given" | "received";

const TABS: { key: Tab; label: string }[] = [
  { key: "toReview", label: "Reviews to Give" },
  { key: "given", label: "Reviews I've Given" },
  { key: "received", label: "Reviews I've Received" },
];

const RATING_FIELDS = [
  { key: "rating", label: "Overall Rating" },
  { key: "communication", label: "Communication" },
  { key: "qualityOfWork", label: "Quality of Work" },
  { key: "deliveryTime", label: "Delivery Time" },
  { key: "professionalism", label: "Professionalism" },
] as const;

type RatingKey = (typeof RATING_FIELDS)[number]["key"];

function StarPicker({ value, onChange, size = "md" }: { value: number; onChange?: (v: number) => void; size?: "sm" | "md" }) {
  const starSize = size === "sm" ? "h-4 w-4" : "h-6 w-6";
  return (
    <span className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((s) => (
        <button
          key={s}
          type="button"
          disabled={!onChange}
          onClick={() => onChange?.(s)}
          className={cn(!onChange && "cursor-default")}
        >
          <Star className={cn(starSize, s <= value ? "fill-amber-400 text-amber-400" : "text-ink-300")} />
        </button>
      ))}
    </span>
  );
}

const emptyForm = { rating: 0, communication: 0, qualityOfWork: 0, deliveryTime: 0, professionalism: 0, comment: "", recommend: true };

export default function ClientReviews() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState<Tab>("toReview");

  const [formOpen, setFormOpen] = useState(false);
  const [editingReview, setEditingReview] = useState<ReviewDto | null>(null);
  const [targetContract, setTargetContract] = useState<ReviewableContractDto | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const myId = user?.id || (user as any)?._id;

  // ── Data ─────────────────────────────────────────────────────────────────────
  const { data: reviewableRes, isLoading: loadingReviewable } = useQuery({
    queryKey: ["reviewable-contracts"],
    queryFn: async () => (await reviewService.getReviewableContracts()).data,
  });
  const reviewable = reviewableRes?.data || [];

  const { data: mineRes, isLoading: loadingMine } = useQuery({
    queryKey: ["my-reviews"],
    queryFn: async () => (await reviewService.getMine()).data,
  });
  const given = mineRes?.data.given || [];
  const received = mineRes?.data.received || [];

  const avgReceived = received.length > 0 ? received.reduce((s, r) => s + r.rating, 0) / received.length : 0;

  // ── Create / Edit ────────────────────────────────────────────────────────────
  const openCreateForm = (contract: ReviewableContractDto) => {
    setTargetContract(contract);
    setEditingReview(null);
    setForm(emptyForm);
    setFormOpen(true);
  };

  const openEditForm = (review: ReviewDto) => {
    setEditingReview(review);
    setTargetContract(null);
    setForm({
      rating: review.rating,
      communication: review.communication,
      qualityOfWork: review.qualityOfWork,
      deliveryTime: review.deliveryTime,
      professionalism: review.professionalism,
      comment: review.comment,
      recommend: review.recommend ?? true,
    });
    setFormOpen(true);
  };

  const closeForm = () => {
    setFormOpen(false);
    setEditingReview(null);
    setTargetContract(null);
    setForm(emptyForm);
  };

  const createMutation = useMutation({
    mutationFn: () =>
      reviewService.create({
        contractId: targetContract!.id,
        ...form,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["reviewable-contracts"] });
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      notify("Review submitted successfully!", "success");
      closeForm();
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to submit review.", "error"),
    onSettled: () => setSaving(false),
  });

  const updateMutation = useMutation({
    mutationFn: () => reviewService.update(editingReview!.id, form),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-reviews"] });
      notify("Review updated successfully.", "success");
      closeForm();
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to update review.", "error"),
    onSettled: () => setSaving(false),
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (RATING_FIELDS.some((f) => form[f.key] < 1)) {
      notify("Please rate every category before submitting.", "error");
      return;
    }
    setSaving(true);
    if (editingReview) updateMutation.mutate();
    else createMutation.mutate();
  };

  const otherParty = (review: ReviewDto) => {
    const isGiven = (review.reviewer as any)?.id === myId;
    return isGiven ? review.reviewee : review.reviewer;
  };

  return (
    <DashboardLayout tagline="Client Hub" searchPlaceholder="Search reviews...">
      <div className="mb-6">
        <h1 className="text-2xl font-extrabold text-ink-900">Reviews & Ratings</h1>
        <p className="text-sm text-ink-500">Rate freelancers after project completion and see what they say about working with you.</p>
      </div>

      {/* Summary */}
      <div className="mb-8 grid gap-5 sm:grid-cols-3">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
          <p className="text-xs font-bold uppercase text-ink-400">Your Rating (as a Client)</p>
          <div className="mt-2 flex items-center gap-2">
            <span className="text-2xl font-black text-ink-900">{avgReceived.toFixed(1)}</span>
            <StarPicker value={Math.round(avgReceived)} size="sm" />
          </div>
          <p className="mt-1 text-xs text-ink-400">{received.length} review{received.length !== 1 ? "s" : ""} received</p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
          <p className="text-xs font-bold uppercase text-ink-400">Reviews Given</p>
          <p className="mt-2 text-2xl font-black text-ink-900">{given.length}</p>
        </div>
        <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
          <p className="text-xs font-bold uppercase text-ink-400">Awaiting Your Review</p>
          <p className="mt-2 text-2xl font-black text-ink-900">{reviewable.length}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="mb-5 flex gap-2 border-b border-surface-border">
        {TABS.map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key)}
            className={cn(
              "border-b-2 px-4 py-2.5 text-sm font-semibold transition-colors",
              tab === t.key ? "border-brand-600 text-brand-600 font-bold" : "border-transparent text-ink-500 hover:text-ink-900"
            )}
          >
            {t.label}
            {t.key === "toReview" && reviewable.length > 0 && (
              <span className="ml-1.5 rounded-full bg-brand-100 px-1.5 py-0.5 text-[10px] font-bold text-brand-700">{reviewable.length}</span>
            )}
          </button>
        ))}
      </div>

      {/* ── Tab: Reviews to Give ── */}
      {tab === "toReview" && (
        <div className="space-y-4">
          {loadingReviewable ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
          ) : reviewable.length === 0 ? (
            <div className="rounded-3xl border border-surface-border bg-surface-card p-8 text-center text-ink-500">
              No completed projects awaiting review. Only completed projects can be reviewed.
            </div>
          ) : (
            reviewable.map((c) => (
              <div key={c.id} className="flex flex-col gap-4 rounded-3xl border border-surface-border bg-surface-card p-5 shadow-card sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Avatar src={c.freelancer?.avatar} name={c.freelancer?.fullName || "Freelancer"} size="md" />
                  <div>
                    <h4 className="font-bold text-ink-900">{c.title}</h4>
                    <p className="text-xs text-ink-500">Freelancer: {c.freelancer?.fullName || "Unassigned"} • {formatCurrency(c.budget)}</p>
                  </div>
                </div>
                <Button size="sm" icon={<PenLine className="h-4 w-4" />} iconPosition="left" onClick={() => openCreateForm(c)}>
                  Leave a Review
                </Button>
              </div>
            ))
          )}
        </div>
      )}

      {/* ── Tab: Given / Received ── */}
      {(tab === "given" || tab === "received") && (
        <div className="space-y-4">
          {loadingMine ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
          ) : (tab === "given" ? given : received).length === 0 ? (
            <div className="rounded-3xl border border-surface-border bg-surface-card p-8 text-center text-ink-500">
              {tab === "given" ? "You haven't given any reviews yet." : "No reviews received yet."}
            </div>
          ) : (
            (tab === "given" ? given : received).map((r) => {
              const party = otherParty(r);
              return (
                <div key={r.id} className="rounded-3xl border border-surface-border bg-surface-card p-5 shadow-card space-y-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <Avatar src={party?.avatar} name={party?.fullName || "User"} size="md" />
                      <div>
                        <h4 className="font-bold text-ink-900">{party?.fullName || "User"}</h4>
                        <p className="text-xs text-ink-500">{typeof r.contract === "object" ? r.contract.title : "Project"}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <StarPicker value={r.rating} size="sm" />
                      {tab === "given" && r.canEdit && (
                        <Button size="sm" variant="outline" onClick={() => openEditForm(r)}>Edit</Button>
                      )}
                    </div>
                  </div>

                  {r.comment && <p className="text-sm text-ink-600 italic">"{r.comment}"</p>}

                  <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 pt-2 border-t border-surface-border text-xs">
                    <div><span className="text-ink-400">Communication</span><br /><span className="font-bold text-ink-800">{r.communication}/5</span></div>
                    <div><span className="text-ink-400">Quality</span><br /><span className="font-bold text-ink-800">{r.qualityOfWork}/5</span></div>
                    <div><span className="text-ink-400">Delivery</span><br /><span className="font-bold text-ink-800">{r.deliveryTime}/5</span></div>
                    <div><span className="text-ink-400">Professionalism</span><br /><span className="font-bold text-ink-800">{r.professionalism}/5</span></div>
                  </div>

                  {r.recommend !== null && (
                    <Badge tone={r.recommend ? "success" : "danger"}>
                      {r.recommend ? "Recommended" : "Not Recommended"}
                    </Badge>
                  )}

                  {tab === "given" && !r.canEdit && (
                    <p className="text-[10px] text-ink-400">Edit window has passed for this review.</p>
                  )}
                </div>
              );
            })
          )}
        </div>
      )}

      {/* ── Review Form Modal ── */}
      {formOpen &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl border border-surface-border bg-surface-card p-6 shadow-2xl space-y-4">
              <button onClick={closeForm} className="absolute right-4 top-4 text-ink-400 hover:text-ink-900 transition-colors" aria-label="Close">
                <X className="h-5 w-5" />
              </button>

              <h3 className="text-lg font-bold text-ink-900">
                {editingReview ? "Edit Review" : `Review ${targetContract?.freelancer?.fullName || "Freelancer"}`}
              </h3>
              {targetContract && <p className="text-xs text-ink-500">{targetContract.title}</p>}

              <form onSubmit={handleSubmit} className="space-y-4">
                {RATING_FIELDS.map((f) => (
                  <div key={f.key} className="flex items-center justify-between">
                    <label className="text-sm font-semibold text-ink-700">{f.label}</label>
                    <StarPicker value={form[f.key]} onChange={(v) => setForm((p) => ({ ...p, [f.key as RatingKey]: v }))} />
                  </div>
                ))}

                <div>
                  <label className="block text-xs font-bold uppercase text-ink-700 mb-1.5">Written Review</label>
                  <textarea
                    value={form.comment}
                    onChange={(e) => setForm((p) => ({ ...p, comment: e.target.value }))}
                    placeholder="Share your experience working with this freelancer..."
                    className="w-full h-24 rounded-xl border border-surface-border p-3 text-xs outline-none bg-surface-card"
                  />
                </div>

                <div className="flex items-center justify-between rounded-xl bg-surface-muted p-3">
                  <span className="text-sm font-semibold text-ink-700">Recommend this Freelancer?</span>
                  <div className="flex rounded-lg bg-surface-card p-1 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, recommend: true }))}
                      className={cn("px-3 py-1 rounded-md", form.recommend ? "bg-emerald-500 text-white" : "text-ink-500")}
                    >
                      Yes
                    </button>
                    <button
                      type="button"
                      onClick={() => setForm((p) => ({ ...p, recommend: false }))}
                      className={cn("px-3 py-1 rounded-md", !form.recommend ? "bg-danger text-white" : "text-ink-500")}
                    >
                      No
                    </button>
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={closeForm}>Cancel</Button>
                  <Button type="submit" isLoading={saving} icon={<CheckCircle2 className="h-4 w-4" />} iconPosition="left">
                    {editingReview ? "Save Changes" : "Submit Review"}
                  </Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}
    </DashboardLayout>
  );
}
