import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  LayoutGrid, List as ListIcon, SlidersHorizontal, X,
  Loader2, Plus, Edit, Trash2, ChevronDown, ChevronUp,
  Search, Zap, RefreshCw,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { FindWorkJobCard } from "@/components/cards/FindWorkJobCard";
import { SearchBar } from "@/components/ui/SearchBar";
import { Checkbox } from "@/components/ui/Checkbox";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/EmptyState";
import { Toggle } from "@/components/ui/Toggle";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { useDebounce } from "@/hooks/useDebounce";
import { jobService } from "@/services/job.service";
import { savedJobService } from "@/services/savedJob.service";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/formatters";
import { ROUTES } from "@/constants/routes";
import { CLIENT_NAV, FREELANCER_NAV } from "@/constants/nav";
import type { Job } from "@/types";

// ── Constants ─────────────────────────────────────────────────────────────

const CATEGORIES = [
  "Full Stack Development","Frontend Development","Backend Development",
  "Mobile App Development","AI & Machine Learning","UI/UX Design",
  "DevOps & Cloud Engineering","Data Science & Analytics","Content & SEO",
  "Blockchain & Web3","Graphic Design & Video","Virtual Assistant",
];

const EXPERIENCE_LEVELS = ["entry","intermediate","expert"] as const;

const WORK_TYPES = ["remote","hybrid","onsite"] as const;

const SORT_OPTIONS = [
  { value: "newest",       label: "Newest First" },
  { value: "budgetHigh",   label: "Highest Budget" },
  { value: "budgetLow",    label: "Lowest Budget" },
  { value: "leastCompete", label: "Least Competitive" },
  { value: "relevant",     label: "Most Relevant" },
];

const POSTED_WITHIN_OPTIONS = [
  { value: "",        label: "Any time" },
  { value: "today",   label: "Today" },
  { value: "3days",   label: "Last 3 days" },
  { value: "week",    label: "Last week" },
  { value: "month",   label: "Last month" },
];

const PAGE_SIZE = 12;

// ── Filter section toggle component ──────────────────────────────────────

function FilterSection({
  title, children, defaultOpen = true,
}: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-surface-border pb-4">
      <button
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-ink-700"
        onClick={() => setOpen(!open)}
      >
        {title}
        {open ? <ChevronUp className="h-4 w-4 text-ink-400" /> : <ChevronDown className="h-4 w-4 text-ink-400" />}
      </button>
      {open && <div className="mt-3 space-y-2">{children}</div>}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────

export default function BrowseJobs() {
  const { user }    = useAuth();
  const navigate    = useNavigate();
  const queryClient = useQueryClient();
  const { notify }  = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const isClient = user?.role === "client";

  // ── Persist filters in URL so browser back works and Dashboard redirects ──
  const getParam  = (key: string, fallback = "") => searchParams.get(key) ?? fallback;
  const getArrayParam = (key: string): string[] => {
    const v = searchParams.get(key);
    return v ? v.split(",").filter(Boolean) : [];
  };

  const [search,         setSearch]         = useState(getParam("q"));
  const [category,       setCategory]       = useState(getParam("category"));
  const [experienceLevels, setExperienceLevels] = useState<string[]>(getArrayParam("exp"));
  const [workTypes,      setWorkTypes]      = useState<string[]>(getArrayParam("work"));
  const [priceType,      setPriceType]      = useState(getParam("priceType"));
  const [minBudget,      setMinBudget]      = useState(getParam("minBudget"));
  const [maxBudget,      setMaxBudget]      = useState(getParam("maxBudget"));
  const [clientRating,   setClientRating]   = useState(getParam("rating"));
  const [paymentVerified,setPaymentVerified]= useState(getParam("verified") === "true");
  const [postedWithin,   setPostedWithin]   = useState(getParam("posted"));
  const [sortBy,         setSortBy]         = useState(getParam("sort", "newest"));
  const [view,           setView]           = useState<"grid"|"list">("grid");
  const [page,           setPage]           = useState(Number(getParam("page","1")));
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 350);

  // ── Sync state → URL params (no page reload) ──────────────────────────────
  useEffect(() => {
    const p = new URLSearchParams();
    if (debouncedSearch)    p.set("q",        debouncedSearch);
    if (category)           p.set("category", category);
    if (experienceLevels.length) p.set("exp", experienceLevels.join(","));
    if (workTypes.length)   p.set("work",     workTypes.join(","));
    if (priceType)          p.set("priceType",priceType);
    if (minBudget)          p.set("minBudget",minBudget);
    if (maxBudget)          p.set("maxBudget",maxBudget);
    if (clientRating)       p.set("rating",   clientRating);
    if (paymentVerified)    p.set("verified", "true");
    if (postedWithin)       p.set("posted",   postedWithin);
    if (sortBy !== "newest") p.set("sort",    sortBy);
    if (page > 1)           p.set("page",     String(page));
    setSearchParams(p, { replace: true });
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [debouncedSearch, category, experienceLevels, workTypes, priceType,
      minBudget, maxBudget, clientRating, paymentVerified, postedWithin, sortBy, page]);

  // Reset to page 1 when filters change
  const resetPage = useCallback(() => setPage(1), []);
  useEffect(() => { resetPage(); },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [debouncedSearch, category, experienceLevels, workTypes, priceType,
     minBudget, maxBudget, clientRating, paymentVerified, postedWithin, sortBy]);

  // ── Data queries ───────────────────────────────────────────────────────────
  const { data: jobsRes, isLoading: jobsLoading } = useQuery({
    queryKey: isClient
      ? ["jobs", "mine", user?.id ?? user?._id]
      : ["browse-jobs", debouncedSearch, category, experienceLevels, workTypes,
         priceType, minBudget, maxBudget, clientRating, paymentVerified, postedWithin,
         sortBy, page],
    queryFn: () =>
      isClient
        ? jobService.list({ client: user?.id ?? user?._id })
        : jobService.list({
            search:          debouncedSearch || undefined,
            category:        category || undefined,
            experienceLevel: experienceLevels.length ? experienceLevels : undefined,
            workType:        workTypes.length === 1 ? workTypes[0] : undefined,
            priceType:       priceType || undefined,
            minBudget:       minBudget  ? Number(minBudget)  : undefined,
            maxBudget:       maxBudget  ? Number(maxBudget)  : undefined,
            clientRating:    clientRating ? Number(clientRating) : undefined,
            paymentVerified: paymentVerified || undefined,
            postedWithin:    postedWithin || undefined,
            sortBy,
            page,
            limit: PAGE_SIZE,
          }),
    staleTime: 60_000,
  });

  // Saved job IDs — for toggle state on cards
  const { data: savedIdsRes } = useQuery({
    queryKey: ["savedJobIds"],
    queryFn:  () => savedJobService.getIds(),
    enabled:  !isClient,
    staleTime: 30_000,
  });
  const savedIds = new Set<string>((savedIdsRes?.data?.data as any) ?? []);

  const jobs: Job[]     = (jobsRes?.data?.data as any)?.items ?? [];
  const totalJobs       = (jobsRes?.data?.data as any)?.total ?? 0;
  const totalPages      = Math.max(1, Math.ceil(totalJobs / PAGE_SIZE));

  // ── Save / unsave mutation ─────────────────────────────────────────────────
  const saveMutation = useMutation({
    mutationFn: ({ id, saving }: { id: string; saving: boolean }): Promise<any> =>
      (saving ? savedJobService.save(id) : savedJobService.unsave(id)) as Promise<any>,
    onSuccess: (_, { saving }) => {
      queryClient.invalidateQueries({ queryKey: ["savedJobIds"] });
      queryClient.invalidateQueries({ queryKey: ["savedJobs"] });
      notify(saving ? "Job saved!" : "Job removed from saved.", saving ? "success" : "info");
    },
    onError: () => notify("Something went wrong.", "error"),
  });

  const handleSave = (jobId: string) => {
    const saving = !savedIds.has(jobId);
    saveMutation.mutate({ id: jobId, saving });
  };

  // ── Client mutations (edit / delete) ──────────────────────────────────────
  const [editingJob, setEditingJob] = useState<Job | null>(null);
  const [editForm, setEditForm]     = useState({ title: "", description: "", budgetMin: 0, budgetMax: 0, experienceLevel: "intermediate" });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => jobService.delete(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["jobs","mine"] }); notify("Job deleted.", "success"); },
    onError: (e: any) => notify(e.message ?? "Failed to delete.", "error"),
  });

  const editMutation = useMutation({
    mutationFn: () => jobService.update(editingJob!.id, editForm as any),
    onSuccess: () => { setEditingJob(null); queryClient.invalidateQueries({ queryKey: ["jobs","mine"] }); notify("Job updated.", "success"); },
    onError: (e: any) => notify(e.message ?? "Failed to update.", "error"),
  });

  const startEdit = (job: Job) => {
    setEditingJob(job);
    setEditForm({ title: job.title, description: job.description, budgetMin: job.budgetMin, budgetMax: job.budgetMax, experienceLevel: job.experienceLevel });
  };

  // ── Clear all filters ──────────────────────────────────────────────────────
  const clearFilters = () => {
    setSearch(""); setCategory(""); setExperienceLevels([]); setWorkTypes([]);
    setPriceType(""); setMinBudget(""); setMaxBudget(""); setClientRating("");
    setPaymentVerified(false); setPostedWithin(""); setSortBy("newest"); setPage(1);
  };

  const activeFilterCount = [
    category, ...experienceLevels, ...workTypes, priceType,
    minBudget, maxBudget, clientRating,
    paymentVerified ? "verified" : "", postedWithin,
  ].filter(Boolean).length;

  // ═══════════════════════════════════════════════════════════════════════
  // CLIENT VIEW
  // ═══════════════════════════════════════════════════════════════════════
  if (isClient) {
    return (
      <DashboardLayout navItems={CLIENT_NAV} searchPlaceholder="Search your jobs…">
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-extrabold text-ink-900">My Posted Jobs</h1>
            <p className="text-sm text-ink-500">Manage your active job briefs and applicants.</p>
          </div>
          <Button onClick={() => navigate(ROUTES.POST_JOB)} icon={<Plus className="h-4 w-4" />} iconPosition="left">
            Post a Project
          </Button>
        </div>

        {jobsLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState icon={ListIcon} title="No jobs posted yet"
            description="Create a project brief to match with elite freelancer talent."
            action={<Button onClick={() => navigate(ROUTES.POST_JOB)}>Post a Job</Button>} />
        ) : (
          <div className="space-y-4">
            {jobs.map((job) => (
              <div key={job.id} className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h2 className="text-base font-bold text-ink-900 truncate">{job.title}</h2>
                      <Badge tone={job.status === "open" ? "success" : "info"}>{job.status}</Badge>
                    </div>
                    <p className="mt-1 text-sm text-ink-500 line-clamp-2">{job.description}</p>
                    <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold text-ink-400">
                      <span>Budget: {formatCurrency(job.budgetMin)} – {formatCurrency(job.budgetMax)}</span>
                      <span>·</span>
                      <span className="capitalize">{job.experienceLevel}</span>
                      <span>·</span>
                      <span className="text-brand-600">{job.proposalsCount ?? 0} proposals</span>
                    </div>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button variant="outline" size="sm" icon={<Edit className="h-3.5 w-3.5" />} iconPosition="left" onClick={() => startEdit(job)}>Edit</Button>
                    <Button variant="danger" size="sm" icon={<Trash2 className="h-3.5 w-3.5" />} iconPosition="left"
                      onClick={() => { if (confirm("Delete this job?")) deleteMutation.mutate(job.id); }}
                      isLoading={deleteMutation.isPending}>Delete</Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Edit modal */}
        {editingJob && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink-900/50 p-4 backdrop-blur-sm">
            <div className="w-full max-w-lg rounded-2xl border border-surface-border bg-surface-card p-6 shadow-pop">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-lg font-bold text-ink-900">Edit Job Brief</h2>
                <button onClick={() => setEditingJob(null)} className="rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted"><X className="h-5 w-5" /></button>
              </div>
              <form onSubmit={(e) => { e.preventDefault(); editMutation.mutate(); }} className="space-y-4">
                <Input label="Job Title" value={editForm.title} onChange={(e) => setEditForm({ ...editForm, title: e.target.value })} required />
                <div>
                  <label className="mb-1.5 block text-sm font-medium text-ink-700">Description</label>
                  <textarea rows={4} value={editForm.description} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })}
                    className="w-full rounded-xl border border-surface-border bg-surface-card p-3 text-sm text-ink-900 outline-none focus:border-brand-500" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input label="Min Budget (₹)" type="number" value={editForm.budgetMin} onChange={(e) => setEditForm({ ...editForm, budgetMin: +e.target.value })} />
                  <Input label="Max Budget (₹)" type="number" value={editForm.budgetMax} onChange={(e) => setEditForm({ ...editForm, budgetMax: +e.target.value })} />
                </div>
                <Select label="Experience Level" value={editForm.experienceLevel} onChange={(e) => setEditForm({ ...editForm, experienceLevel: e.target.value })}>
                  <option value="entry">Entry</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="expert">Expert</option>
                </Select>
                <div className="flex justify-end gap-2 pt-1">
                  <Button variant="outline" onClick={() => setEditingJob(null)} type="button">Cancel</Button>
                  <Button type="submit" isLoading={editMutation.isPending}>Save Changes</Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </DashboardLayout>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════
  // FREELANCER VIEW — filter sidebar
  // ═══════════════════════════════════════════════════════════════════════

  const FilterSidebar = (
    <aside className="space-y-5">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-bold text-ink-900">Filters
          {activeFilterCount > 0 && <span className="ml-2 rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>}
        </h2>
        {activeFilterCount > 0 && (
          <button onClick={clearFilters} className="text-xs font-semibold text-brand-600 hover:underline">Clear all</button>
        )}
      </div>

      {/* Category */}
      <FilterSection title="Category">
        <Select value={category} onChange={(e) => setCategory(e.target.value)}>
          <option value="">All Categories</option>
          {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
        </Select>
      </FilterSection>

      {/* Experience level */}
      <FilterSection title="Experience Level">
        {EXPERIENCE_LEVELS.map((lvl) => (
          <Checkbox key={lvl} label={<span className="capitalize">{lvl}</span>}
            checked={experienceLevels.includes(lvl)}
            onChange={() => setExperienceLevels((p) => p.includes(lvl) ? p.filter((l) => l !== lvl) : [...p, lvl])}
          />
        ))}
      </FilterSection>

      {/* Work type */}
      <FilterSection title="Work Type">
        {WORK_TYPES.map((wt) => (
          <Checkbox key={wt} label={<span className="capitalize">{wt}</span>}
            checked={workTypes.includes(wt)}
            onChange={() => setWorkTypes((p) => p.includes(wt) ? p.filter((w) => w !== wt) : [...p, wt])}
          />
        ))}
      </FilterSection>

      {/* Price type */}
      <FilterSection title="Project Type">
        <div className="flex gap-2">
          {["","fixed","hourly"].map((pt) => (
            <button key={pt} onClick={() => setPriceType(pt)}
              className={cn("rounded-xl border px-3 py-1.5 text-xs font-semibold capitalize transition-colors",
                priceType === pt ? "border-brand-600 bg-brand-50 text-brand-700" : "border-surface-border text-ink-500 hover:border-brand-400")}>
              {pt === "" ? "Any" : pt}
            </button>
          ))}
        </div>
      </FilterSection>

      {/* Budget */}
      <FilterSection title="Budget Range (₹)">
        <div className="flex gap-2">
          <Input placeholder="Min" type="number" value={minBudget} onChange={(e) => setMinBudget(e.target.value)} className="text-xs" />
          <Input placeholder="Max" type="number" value={maxBudget} onChange={(e) => setMaxBudget(e.target.value)} className="text-xs" />
        </div>
      </FilterSection>

      {/* Client rating */}
      <FilterSection title="Client Rating">
        {["","3","4","4.5"].map((r) => (
          <button key={r} onClick={() => setClientRating(r)}
            className={cn("block w-full rounded-lg border px-3 py-1.5 text-left text-xs font-semibold transition-colors",
              clientRating === r ? "border-brand-600 bg-brand-50 text-brand-700" : "border-surface-border text-ink-500 hover:border-brand-400")}>
            {r === "" ? "Any rating" : `★ ${r}+ stars`}
          </button>
        ))}
      </FilterSection>

      {/* Payment verified */}
      <FilterSection title="Client Status" defaultOpen={false}>
        <Toggle checked={paymentVerified} onChange={setPaymentVerified} label="Payment Verified Only" />
      </FilterSection>

      {/* Posted within */}
      <FilterSection title="Posted Date" defaultOpen={false}>
        {POSTED_WITHIN_OPTIONS.map((opt) => (
          <button key={opt.value} onClick={() => setPostedWithin(opt.value)}
            className={cn("block w-full rounded-lg border px-3 py-1.5 text-left text-xs font-semibold transition-colors",
              postedWithin === opt.value ? "border-brand-600 bg-brand-50 text-brand-700" : "border-surface-border text-ink-500 hover:border-brand-400")}>
            {opt.label}
          </button>
        ))}
      </FilterSection>

      {/* Pro upsell */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-brand-600 to-brand-700 p-5 text-white">
        <Zap className="absolute -bottom-3 -right-3 h-20 w-20 text-white/10" />
        <p className="relative text-sm font-bold">Upgrade to Pro</p>
        <p className="relative mt-1 text-xs text-white/80">Unlock AI-powered matching, priority listings, and advanced filters.</p>
        <button className="relative mt-4 w-full rounded-xl bg-white py-2 text-xs font-bold text-brand-700 hover:bg-brand-50 transition-colors">
          Go Pro — Free Trial
        </button>
      </div>
    </aside>
  );

  // ═══════════════════════════════════════════════════════════════════════
  // FREELANCER MAIN RENDER
  // ═══════════════════════════════════════════════════════════════════════
  return (
    <DashboardLayout navItems={FREELANCER_NAV} searchPlaceholder="Search jobs…">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-start">

        {/* ── Desktop filter sidebar ─────────────────────────────────── */}
        <div className="hidden w-64 shrink-0 lg:block">{FilterSidebar}</div>

        {/* ── Main content ───────────────────────────────────────────── */}
        <div className="min-w-0 flex-1 space-y-5">

          {/* Search + sort bar */}
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <SearchBar
              placeholder="Search by title, skills, category, company…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1"
            />
            <div className="flex shrink-0 items-center gap-2">
              {/* Mobile filter toggle */}
              <button
                onClick={() => setMobileFiltersOpen(!mobileFiltersOpen)}
                className="flex items-center gap-1.5 rounded-xl border border-surface-border bg-surface-card px-3 h-11 text-sm font-semibold text-ink-600 hover:border-brand-400 lg:hidden"
              >
                <SlidersHorizontal className="h-4 w-4" />
                Filters
                {activeFilterCount > 0 && (
                  <span className="rounded-full bg-brand-600 px-1.5 py-0.5 text-[10px] font-bold text-white">{activeFilterCount}</span>
                )}
              </button>
              <Select value={sortBy} onChange={(e) => setSortBy(e.target.value)} className="w-44">
                {SORT_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Select>
              <div className="flex rounded-xl border border-surface-border">
                <button onClick={() => setView("grid")} aria-label="Grid view"
                  className={cn("rounded-l-xl p-2.5", view === "grid" ? "bg-brand-50 text-brand-600" : "text-ink-400 hover:text-ink-700")}>
                  <LayoutGrid className="h-4 w-4" />
                </button>
                <button onClick={() => setView("list")} aria-label="List view"
                  className={cn("rounded-r-xl p-2.5", view === "list" ? "bg-brand-50 text-brand-600" : "text-ink-400 hover:text-ink-700")}>
                  <ListIcon className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>

          {/* Mobile filter drawer */}
          {mobileFiltersOpen && (
            <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card lg:hidden">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="font-bold text-ink-900">Filters</h3>
                <button onClick={() => setMobileFiltersOpen(false)} className="rounded-lg p-1 text-ink-400 hover:bg-surface-muted"><X className="h-5 w-5" /></button>
              </div>
              {FilterSidebar}
            </div>
          )}

          {/* Active filter chips */}
          {activeFilterCount > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-400">Active filters:</span>
              {category && <Badge tone="brand" className="gap-1">{category}<button onClick={() => setCategory("")}>×</button></Badge>}
              {experienceLevels.map((l) => <Badge key={l} tone="info" className="gap-1 capitalize">{l}<button onClick={() => setExperienceLevels((p) => p.filter((x) => x !== l))}>×</button></Badge>)}
              {workTypes.map((w) => <Badge key={w} tone="success" className="gap-1 capitalize">{w}<button onClick={() => setWorkTypes((p) => p.filter((x) => x !== w))}>×</button></Badge>)}
              {priceType && <Badge tone="warning" className="gap-1 capitalize">{priceType}<button onClick={() => setPriceType("")}>×</button></Badge>}
              {paymentVerified && <Badge tone="success" className="gap-1">Verified<button onClick={() => setPaymentVerified(false)}>×</button></Badge>}
              {postedWithin && <Badge tone="neutral" className="gap-1">{POSTED_WITHIN_OPTIONS.find((o) => o.value === postedWithin)?.label}<button onClick={() => setPostedWithin("")}>×</button></Badge>}
              <button onClick={clearFilters} className="text-xs text-danger font-semibold hover:underline">Clear all</button>
            </div>
          )}

          {/* Results header */}
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-lg font-extrabold text-ink-900">Browse Jobs</h1>
              <p className="text-sm text-ink-500">
                {jobsLoading ? "Loading…" : (
                  <><span className="font-bold text-brand-600">{totalJobs}</span> job{totalJobs !== 1 ? "s" : ""} found</>
                )}
              </p>
            </div>
            <button onClick={() => queryClient.invalidateQueries({ queryKey: ["browse-jobs"] })}
              className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border text-ink-400 hover:bg-surface-muted transition-colors">
              <RefreshCw className="h-4 w-4" />
            </button>
          </div>

          {/* Loading skeleton */}
          {jobsLoading && (
            <div className={cn("gap-4", view === "grid" ? "grid sm:grid-cols-2 xl:grid-cols-3" : "space-y-3")}>
              {Array.from({ length: 6 }).map((_, i) => (
                <div key={i} className="rounded-2xl border border-surface-border bg-surface-card p-5 animate-pulse space-y-3">
                  <div className="h-4 w-3/4 rounded bg-surface-muted" />
                  <div className="h-3 w-1/2 rounded bg-surface-muted" />
                  <div className="h-16 w-full rounded bg-surface-muted" />
                </div>
              ))}
            </div>
          )}

          {/* Empty state */}
          {!jobsLoading && jobs.length === 0 && (
            <EmptyState icon={Search} title="No jobs match your search"
              description="Try adjusting your filters or search terms to find more opportunities."
              action={<Button variant="outline" onClick={clearFilters}>Clear filters</Button>}
            />
          )}

          {/* Job cards */}
          {!jobsLoading && jobs.length > 0 && (
            <div className={cn(view === "grid" ? "grid gap-4 sm:grid-cols-2 xl:grid-cols-3" : "space-y-3")}>
              {jobs.map((job) => (
                <FindWorkJobCard
                  key={job.id}
                  job={job}
                  variant={view}
                  isSaved={savedIds.has(job.id)}
                  onSave={handleSave}
                />
              ))}
            </div>
          )}

          {/* Pagination */}
          {!jobsLoading && totalPages > 1 && (
            <div className="pt-4">
              <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
