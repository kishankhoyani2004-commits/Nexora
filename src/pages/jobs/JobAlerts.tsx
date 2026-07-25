import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  BellRing, Plus, Pencil, Trash2, Pause, Play,
  Mail, Bell, Clock, Zap, CheckCircle2, X,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { Toggle } from "@/components/ui/Toggle";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { useNotification } from "@/context/NotificationContext";
import { useConfirm } from "@/context/ConfirmContext";
import { jobAlertService } from "@/services/jobAlert.service";
import type { CreateAlertPayload } from "@/services/jobAlert.service";
import { cn } from "@/utils/cn";
import { formatRelativeTime } from "@/utils/formatters";
import type { JobAlert } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  "","Full Stack Development","Frontend Development","Backend Development",
  "Mobile App Development","AI & Machine Learning","UI/UX Design",
  "DevOps & Cloud Engineering","Data Science & Analytics","Content & SEO",
  "Blockchain & Web3","Graphic Design & Video","Virtual Assistant",
];

const EMPTY_FORM: CreateAlertPayload = {
  name: "", keywords: [], skills: [], category: "",
  budgetMin: 0, budgetMax: 0, experienceLevel: "", priceType: "",
  location: "", workType: "", frequency: "daily",
  notifyEmail: true, notifyInApp: true,
};

// ── Alert form component ──────────────────────────────────────────────────

function AlertForm({
  initial = EMPTY_FORM,
  onSubmit,
  onCancel,
  isLoading,
}: {
  initial?: CreateAlertPayload;
  onSubmit: (data: CreateAlertPayload) => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  const [form, setForm]       = useState<CreateAlertPayload>(initial);
  const [kwDraft, setKwDraft] = useState("");
  const [skDraft, setSkDraft] = useState("");

  const set = (patch: Partial<CreateAlertPayload>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const addTag = (field: "keywords" | "skills", draft: string, setDraft: (v: string) => void) => {
    const val = draft.trim();
    if (!val) return;
    if (!(form[field] as string[]).includes(val))
      set({ [field]: [...(form[field] as string[]), val] });
    setDraft("");
  };

  const removeTag = (field: "keywords" | "skills", val: string) =>
    set({ [field]: (form[field] as string[]).filter((t) => t !== val) });

  return (
    <form
      className="space-y-4 max-h-[70vh] overflow-y-auto pr-1"
      onSubmit={(e) => { e.preventDefault(); onSubmit(form); }}
    >
      {/* Alert name */}
      <Input
        label="Alert Name *"
        placeholder="e.g. React Developer — Remote"
        value={form.name}
        onChange={(e) => set({ name: e.target.value })}
        required
      />

      {/* Keywords */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-700">Keywords</label>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-surface-border bg-surface-card p-2.5 min-h-[44px]">
          {form.keywords!.map((kw) => (
            <span key={kw} className="inline-flex items-center gap-1 rounded-full bg-brand-100 px-2.5 py-0.5 text-xs font-semibold text-brand-700">
              {kw}
              <button type="button" onClick={() => removeTag("keywords", kw)} aria-label={`Remove ${kw}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            className="min-w-[120px] flex-1 border-none bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
            placeholder="Add keyword…"
            value={kwDraft}
            onChange={(e) => setKwDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("keywords", kwDraft, setKwDraft))}
          />
        </div>
      </div>

      {/* Skills */}
      <div>
        <label className="mb-1.5 block text-sm font-medium text-ink-700">Required Skills</label>
        <div className="flex flex-wrap gap-1.5 rounded-xl border border-surface-border bg-surface-card p-2.5 min-h-[44px]">
          {form.skills!.map((sk) => (
            <span key={sk} className="inline-flex items-center gap-1 rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">
              {sk}
              <button type="button" onClick={() => removeTag("skills", sk)} aria-label={`Remove ${sk}`}>
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
          <input
            className="min-w-[120px] flex-1 border-none bg-transparent text-sm text-ink-900 outline-none placeholder:text-ink-400"
            placeholder="Add skill…"
            value={skDraft}
            onChange={(e) => setSkDraft(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addTag("skills", skDraft, setSkDraft))}
          />
        </div>
      </div>

      {/* Category + Experience */}
      <div className="grid grid-cols-2 gap-3">
        <Select label="Category" value={form.category} onChange={(e) => set({ category: e.target.value })}>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c || "Any Category"}</option>)}
        </Select>
        <Select label="Experience Level" value={form.experienceLevel} onChange={(e) => set({ experienceLevel: e.target.value })}>
          <option value="">Any Level</option>
          <option value="entry">Entry</option>
          <option value="intermediate">Intermediate</option>
          <option value="expert">Expert</option>
        </Select>
      </div>

      {/* Budget */}
      <div className="grid grid-cols-2 gap-3">
        <Input label="Min Budget (₹)" type="number" min={0} value={form.budgetMin || ""}
          placeholder="0" onChange={(e) => set({ budgetMin: +e.target.value })} />
        <Input label="Max Budget (₹)" type="number" min={0} value={form.budgetMax || ""}
          placeholder="Any" onChange={(e) => set({ budgetMax: +e.target.value })} />
      </div>

      {/* Project type + Work type */}
      <div className="grid grid-cols-2 gap-3">
        <Select label="Project Type" value={form.priceType} onChange={(e) => set({ priceType: e.target.value })}>
          <option value="">Any</option>
          <option value="fixed">Fixed Price</option>
          <option value="hourly">Hourly</option>
        </Select>
        <Select label="Work Type" value={form.workType} onChange={(e) => set({ workType: e.target.value })}>
          <option value="">Any</option>
          <option value="remote">Remote</option>
          <option value="hybrid">Hybrid</option>
          <option value="onsite">On-site</option>
        </Select>
      </div>

      {/* Location */}
      <Input label="Location" placeholder="e.g. Bangalore, Mumbai, Remote"
        value={form.location} onChange={(e) => set({ location: e.target.value })} />

      {/* Frequency */}
      <div>
        <p className="mb-2 text-sm font-medium text-ink-700">Notification Frequency</p>
        <div className="grid grid-cols-3 gap-2">
          {(["instant","daily","weekly"] as const).map((freq) => (
            <button key={freq} type="button"
              onClick={() => set({ frequency: freq })}
              className={cn(
                "rounded-xl border py-2 text-xs font-semibold capitalize transition-colors",
                form.frequency === freq
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-surface-border text-ink-500 hover:border-brand-400"
              )}>
              {freq === "instant" ? "⚡ Instant" : freq === "daily" ? "📅 Daily" : "📆 Weekly"}
            </button>
          ))}
        </div>
      </div>

      {/* Notification channels */}
      <div className="flex flex-col gap-3 rounded-xl border border-surface-border bg-surface-muted/50 p-4">
        <p className="text-sm font-semibold text-ink-700">Notification Channels</p>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-ink-600"><Mail className="h-4 w-4" /> Email notifications</span>
          <Toggle checked={form.notifyEmail!} onChange={(v) => set({ notifyEmail: v })} />
        </div>
        <div className="flex items-center justify-between">
          <span className="flex items-center gap-2 text-sm text-ink-600"><Bell className="h-4 w-4" /> In-app notifications</span>
          <Toggle checked={form.notifyInApp!} onChange={(v) => set({ notifyInApp: v })} />
        </div>
      </div>

      {/* Actions */}
      <div className="flex justify-end gap-2 pt-1 sticky bottom-0 bg-surface-card pb-1">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" isLoading={isLoading}>
          {initial.name ? "Save Changes" : "Create Alert"}
        </Button>
      </div>
    </form>
  );
}

// ── Alert card component ──────────────────────────────────────────────────

function AlertCard({
  alert,
  onEdit,
  onToggle,
  onDelete,
  isToggling,
  isDeleting,
}: {
  alert: JobAlert;
  onEdit: () => void;
  onToggle: () => void;
  onDelete: () => void;
  isToggling: boolean;
  isDeleting: boolean;
}) {
  const freqIcon = alert.frequency === "instant" ? <Zap className="h-3.5 w-3.5" />
    : alert.frequency === "daily" ? <Clock className="h-3.5 w-3.5" />
    : <Bell className="h-3.5 w-3.5" />;

  const tags = [
    ...alert.keywords.map((k) => ({ label: k, tone: "brand" as const })),
    ...alert.skills.map((s)  => ({ label: s, tone: "success" as const })),
  ];

  return (
    <div className={cn(
      "rounded-2xl border bg-surface-card p-5 shadow-card transition-all",
      alert.active
        ? "border-surface-border hover:border-brand-300 hover:shadow-pop"
        : "border-surface-border opacity-60"
    )}>
      {/* Header row */}
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="font-bold text-ink-900 truncate">{alert.name}</h3>
            <Badge tone={alert.active ? "success" : "neutral"} dot>
              {alert.active ? "Active" : "Paused"}
            </Badge>
          </div>
          <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-ink-400">
            <span className="flex items-center gap-1 capitalize">{freqIcon} {alert.frequency}</span>
            {alert.notifyEmail && <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> Email</span>}
            {alert.notifyInApp && <span className="flex items-center gap-1"><Bell className="h-3 w-3" /> In-app</span>}
            {alert.lastTriggeredAt && (
              <span className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-emerald-500" />
                Last triggered {formatRelativeTime(alert.lastTriggeredAt)}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          <button onClick={onEdit}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-ink-500 hover:bg-brand-50 hover:text-brand-600 transition-colors"
            aria-label="Edit alert">
            <Pencil className="h-3.5 w-3.5" />
          </button>
          <button onClick={onToggle} disabled={isToggling}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-ink-500 hover:bg-amber-50 hover:text-amber-600 transition-colors disabled:opacity-50"
            aria-label={alert.active ? "Pause alert" : "Resume alert"}>
            {alert.active ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
          </button>
          <button onClick={onDelete} disabled={isDeleting}
            className="flex h-8 w-8 items-center justify-center rounded-lg bg-surface-muted text-ink-500 hover:bg-red-50 hover:text-red-500 transition-colors disabled:opacity-50"
            aria-label="Delete alert">
            <Trash2 className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {/* Filters summary */}
      <div className="mb-3 flex flex-wrap gap-2 text-xs">
        {alert.category && <Badge tone="info">{alert.category}</Badge>}
        {alert.experienceLevel && <Badge tone="neutral" className="capitalize">{alert.experienceLevel}</Badge>}
        {alert.priceType && <Badge tone="neutral" className="capitalize">{alert.priceType}</Badge>}
        {alert.workType && <Badge tone="success" className="capitalize">{alert.workType}</Badge>}
        {alert.location && <Badge tone="neutral">📍 {alert.location}</Badge>}
        {(alert.budgetMin > 0 || alert.budgetMax > 0) && (
          <Badge tone="warning">
            ₹{alert.budgetMin > 0 ? alert.budgetMin.toLocaleString("en-IN") : "0"}
            {alert.budgetMax > 0 ? ` – ₹${alert.budgetMax.toLocaleString("en-IN")}` : "+"}
          </Badge>
        )}
      </div>

      {/* Keywords + skills */}
      {tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {tags.slice(0, 6).map(({ label, tone }) => (
            <Badge key={label} tone={tone}>{label}</Badge>
          ))}
          {tags.length > 6 && <Badge tone="neutral">+{tags.length - 6}</Badge>}
        </div>
      )}

      {/* Footer */}
      <p className="mt-3 text-[11px] text-ink-300">
        Created {formatRelativeTime(alert.createdAt)}
      </p>
    </div>
  );
}

// ── Main page component ───────────────────────────────────────────────────

export default function JobAlerts() {
  const queryClient = useQueryClient();
  const { notify }  = useNotification();
  const confirm     = useConfirm();

  const [modalOpen, setModalOpen]       = useState(false);
  const [editingAlert, setEditingAlert] = useState<JobAlert | null>(null);

  // ── Fetch alerts ─────────────────────────────────────────────────────
  const { data: res, isLoading } = useQuery({
    queryKey: ["jobAlerts"],
    queryFn:  () => jobAlertService.list(),
    staleTime: 60_000,
  });

  const alerts: JobAlert[] = (res?.data?.data as any) ?? [];
  const activeCount = alerts.filter((a) => a.active).length;

  // ── Mutations ─────────────────────────────────────────────────────────
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["jobAlerts"] });

  const createMutation = useMutation({
    mutationFn: (payload: CreateAlertPayload) => jobAlertService.create(payload),
    onSuccess: () => { invalidate(); setModalOpen(false); notify("Alert created!", "success"); },
    onError:   () => notify("Failed to create alert.", "error"),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<CreateAlertPayload> }) =>
      jobAlertService.update(id, payload),
    onSuccess: () => { invalidate(); setEditingAlert(null); notify("Alert updated.", "success"); },
    onError:   () => notify("Failed to update alert.", "error"),
  });

  const toggleMutation = useMutation({
    mutationFn: (id: string) => jobAlertService.toggle(id),
    onSuccess: () => { invalidate(); },
    onError:   () => notify("Failed to toggle alert.", "error"),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobAlertService.delete(id),
    onSuccess: () => { invalidate(); notify("Alert deleted.", "info"); },
    onError:   () => notify("Failed to delete alert.", "error"),
  });

  // ── Handlers ──────────────────────────────────────────────────────────
  const handleCreate = (data: CreateAlertPayload) => createMutation.mutate(data);
  const handleUpdate = (data: CreateAlertPayload) => {
    if (!editingAlert) return;
    updateMutation.mutate({ id: editingAlert.id, payload: data });
  };

  function alertToFormPayload(a: JobAlert): CreateAlertPayload {
    return {
      name: a.name, keywords: a.keywords, skills: a.skills,
      category: a.category, budgetMin: a.budgetMin, budgetMax: a.budgetMax,
      experienceLevel: a.experienceLevel, priceType: a.priceType,
      location: a.location, workType: a.workType,
      frequency: a.frequency, notifyEmail: a.notifyEmail, notifyInApp: a.notifyInApp,
    };
  }

  return (
    <DashboardLayout searchPlaceholder="Search jobs…">
      <div className="mx-auto max-w-screen-xl space-y-6 pb-12">

        {/* ── Header ───────────────────────────────────────────────── */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="mb-1 flex items-center gap-2.5">
              <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-pop">
                <BellRing className="h-4 w-4" />
              </span>
              <span className="text-xs font-bold uppercase tracking-widest text-brand-500">
                Find Work
              </span>
            </div>
            <h1 className="text-2xl font-bold text-ink-900">Job Alerts</h1>
            <p className="mt-0.5 text-sm text-ink-500">
              Get notified the moment the right job is posted
            </p>
          </div>
          <Button
            icon={<Plus className="h-4 w-4" />} iconPosition="left"
            onClick={() => setModalOpen(true)}
          >
            Create Alert
          </Button>
        </div>

        {/* ── Stats banner ─────────────────────────────────────────── */}
        {alerts.length > 0 && (
          <div className="grid grid-cols-3 gap-4 sm:grid-cols-3">
            {[
              { label: "Total Alerts",  value: alerts.length,                    icon: BellRing,    tone: "bg-brand-100 text-brand-600"   },
              { label: "Active",        value: activeCount,                       icon: CheckCircle2,tone: "bg-emerald-100 text-emerald-600"},
              { label: "Paused",        value: alerts.length - activeCount,       icon: Pause,       tone: "bg-amber-100 text-amber-600"   },
            ].map(({ label, value, icon: Icon, tone }) => (
              <div key={label} className="flex items-center gap-3 rounded-2xl border border-surface-border bg-surface-card p-4 shadow-card">
                <span className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl", tone)}>
                  <Icon className="h-4 w-4" />
                </span>
                <div>
                  <p className="text-xs text-ink-400">{label}</p>
                  <p className="text-xl font-bold text-ink-900">{value}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Loading skeletons ─────────────────────────────────────── */}
        {isLoading && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="rounded-2xl border border-surface-border bg-surface-card p-5 animate-pulse space-y-3 h-44">
                <div className="h-4 w-3/4 rounded bg-surface-muted" />
                <div className="h-3 w-1/2 rounded bg-surface-muted" />
                <div className="h-8 w-full rounded bg-surface-muted" />
              </div>
            ))}
          </div>
        )}

        {/* ── Empty state ───────────────────────────────────────────── */}
        {!isLoading && alerts.length === 0 && (
          <EmptyState
            icon={BellRing}
            title="No job alerts yet"
            description="Create personalised alerts and get notified instantly when matching jobs are posted."
            action={
              <Button icon={<Plus className="h-4 w-4" />} iconPosition="left" onClick={() => setModalOpen(true)}>
                Create Your First Alert
              </Button>
            }
          />
        )}

        {/* ── Alert cards grid ─────────────────────────────────────── */}
        {!isLoading && alerts.length > 0 && (
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {alerts.map((alert) => (
              <AlertCard
                key={alert.id}
                alert={alert}
                onEdit={() => setEditingAlert(alert)}
                onToggle={() => toggleMutation.mutate(alert.id)}
                onDelete={async () => {
                  if (await confirm({ title: "Delete Alert", message: `Delete alert "${alert.name}"?`, confirmLabel: "Delete" })) {
                    deleteMutation.mutate(alert.id);
                  }
                }}
                isToggling={toggleMutation.isPending && toggleMutation.variables === alert.id}
                isDeleting={deleteMutation.isPending && deleteMutation.variables === alert.id}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Create modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title="Create Job Alert"
        className="max-w-xl"
      >
        <AlertForm
          onSubmit={handleCreate}
          onCancel={() => setModalOpen(false)}
          isLoading={createMutation.isPending}
        />
      </Modal>

      {/* ── Edit modal ───────────────────────────────────────────────── */}
      <Modal
        isOpen={!!editingAlert}
        onClose={() => setEditingAlert(null)}
        title="Edit Job Alert"
        className="max-w-xl"
      >
        {editingAlert && (
          <AlertForm
            initial={alertToFormPayload(editingAlert)}
            onSubmit={handleUpdate}
            onCancel={() => setEditingAlert(null)}
            isLoading={updateMutation.isPending}
          />
        )}
      </Modal>
    </DashboardLayout>
  );
}
