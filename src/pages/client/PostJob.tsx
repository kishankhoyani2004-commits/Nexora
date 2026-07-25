import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight, ArrowLeft, UploadCloud, Sparkles,
  Bold, Italic, List, Rocket, ShieldCheck, X, Loader2,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { CLIENT_NAV } from "@/constants/nav";
import { cn } from "@/utils/cn";
import { useNotification } from "@/context/NotificationContext";
import { ROUTES } from "@/constants/routes";
import { jobService } from "@/services/job.service";
import { formatCurrency } from "@/utils/formatters";
import type { JobCreatePayload, ExperienceLevel, PriceType, WorkType } from "@/types";

const STEPS = ["Details", "Description", "Review & Publish"];

const CATEGORIES = [
  "UI/UX Design", "AI & ML", "Web Development", "Full Stack Development",
  "Backend Development", "Frontend Development", "Mobile Development",
  "Branding & Design", "Data Science", "Graphic Design",
  "Content Writing", "Video Editing", "Cyber Security", "DevOps & Cloud",
  "Marketing & SEO", "Finance & Accounting", "General",
];

const SUBCATEGORIES: Record<string, string[]> = {
  "Web Development":         ["React", "Next.js", "Vue.js", "Angular", "WordPress", "E-Commerce"],
  "AI & ML":                 ["Machine Learning", "Deep Learning", "NLP", "Computer Vision", "LLMs"],
  "UI/UX Design":            ["Wireframing", "Prototyping", "User Research", "Design Systems"],
  "Data Science":            ["Data Analysis", "Data Visualization", "BI Reporting", "ETL Pipelines"],
  "Mobile Development":      ["iOS", "Android", "React Native", "Flutter"],
  "DevOps & Cloud":          ["AWS", "GCP", "Azure", "CI/CD", "Docker", "Kubernetes"],
  "Full Stack Development":  ["MERN Stack", "MEAN Stack", "Django + React", "Laravel + Vue", "Ruby on Rails"],
  "Backend Development":     ["Node.js", "Python/Django", "Java/Spring", "PHP/Laravel", ".NET"],
  "Frontend Development":    ["React", "Vue.js", "Angular", "Svelte", "HTML/CSS/JS"],
  "Branding & Design":       ["Logo Design", "Brand Identity", "Packaging Design", "Style Guides", "Print Design"],
  "Graphic Design":          ["Illustration", "Social Media Graphics", "Presentation Design", "Print Design", "Motion Graphics"],
  "Content Writing":         ["Blog Writing", "Copywriting", "Technical Writing", "SEO Content", "Ghostwriting"],
  "Video Editing":           ["YouTube Editing", "Motion Graphics", "Color Grading", "Short-Form/Reels", "Animation"],
  "Cyber Security":          ["Penetration Testing", "Security Audits", "Network Security", "Cloud Security", "Compliance"],
  "Marketing & SEO":         ["SEO", "Social Media Marketing", "PPC Advertising", "Email Marketing", "Content Strategy"],
  "Finance & Accounting":    ["Bookkeeping", "Financial Modeling", "Tax Preparation", "Payroll", "Auditing"],
  "General":                 ["Virtual Assistance", "Data Entry", "Research", "Customer Support", "Project Management"],
};

const DURATIONS = [
  "Less than 1 week", "1–2 weeks", "Less than 1 month",
  "1–3 months", "3–6 months", "6+ months",
];

export default function PostJob() {
  const navigate     = useNavigate();
  const { notify }   = useNotification();

  // ── Step state ───────────────────────────────────────────────────────────
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // ── Step 1: Details ──────────────────────────────────────────────────────
  const [title,       setTitle]       = useState("");
  const [category,    setCategory]    = useState("Web Development");
  const [subcategory, setSubcategory] = useState("");
  const [priceType,   setPriceType]   = useState<PriceType>("fixed");
  const [budgetMin,   setBudgetMin]   = useState(50000);
  const [budgetMax,   setBudgetMax]   = useState(150000);
  const [experience,  setExperience]  = useState<ExperienceLevel>("intermediate");
  const [duration,    setDuration]    = useState("1–3 months");
  const [deadline,    setDeadline]    = useState("");
  const [skills,      setSkills]      = useState<string[]>([]);
  const [skillDraft,  setSkillDraft]  = useState("");
  const [workType,    setWorkType]    = useState<WorkType>("remote");
  const [visibility,  setVisibility]  = useState<"public" | "private">("public");

  // ── Module 2: Professional Post Job fields ───────────────────────────────
  const [englishLevel,        setEnglishLevel]        = useState<"basic" | "intermediate" | "advanced" | "fluent">("intermediate");
  const [freelancersNeeded,   setFreelancersNeeded]   = useState(1);
  const [currency,            setCurrency]            = useState("INR");
  const [estimatedHours,      setEstimatedHours]      = useState(160);
  const [featured,            setFeatured]            = useState(false);
  const [urgent,              setUrgent]              = useState(false);
  const [allowAIMatching,     setAllowAIMatching]     = useState(true);
  const [allowMultipleProposals, setAllowMultipleProposals] = useState(true);
  const [proposalDeadline,    setProposalDeadline]    = useState("");
  const [projectStartDate,    setProjectStartDate]    = useState("");
  const [expectedCompletionDate, setExpectedCompletionDate] = useState("");

  // ── Step 2: Description ──────────────────────────────────────────────────
  const [description, setDescription] = useState("");
  const [generating,  setGenerating]  = useState(false);

  // ── Validation errors ────────────────────────────────────────────────────
  const [errors, setErrors] = useState<Record<string, string>>({});

  const addSkill = () => {
    const trimmed = skillDraft.trim();
    if (trimmed && !skills.includes(trimmed)) setSkills([...skills, trimmed]);
    setSkillDraft("");
  };

  const removeSkill = (s: string) => setSkills(skills.filter((x) => x !== s));

  const validateStep1 = () => {
    const e: Record<string, string> = {};
    if (!title.trim())       e.title    = "Job title is required.";
    if (!category.trim())    e.category = "Category is required.";
    if (budgetMin <= 0)      e.budget   = "Budget must be greater than 0.";
    if (budgetMax < budgetMin) e.budgetMax = "Max budget must be ≥ min budget.";
    if (skills.length === 0) e.skills   = "Add at least one required skill.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const validateStep2 = () => {
    const e: Record<string, string> = {};
    if (!description.trim() || description.trim().length < 50)
      e.description = "Description must be at least 50 characters.";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const goToStep2 = () => { if (validateStep1()) setStep(1); };
  const goToStep3 = () => { if (validateStep2()) setStep(2); };

  const buildPayload = (): JobCreatePayload => ({
    title:                 title.trim(),
    category,
    subcategory:           subcategory || undefined,
    description:           description.trim(),
    skills,
    priceType,
    budgetMin,
    budgetMax,
    experienceLevel:       experience,
    duration,
    deadline:              deadline || undefined,
    visibility,
    workType,
    location:              workType === "remote" ? "Remote" : undefined,
    // Module 2 fields
    englishLevel,
    freelancersNeeded,
    currency,
    estimatedHours:        priceType === "hourly" ? estimatedHours : undefined,
    featured,
    urgent,
    allowAIMatching,
    allowMultipleProposals,
    proposalDeadline:      proposalDeadline || undefined,
    projectStartDate:      projectStartDate || undefined,
    expectedCompletionDate: expectedCompletionDate || undefined,
  });

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      await jobService.saveDraft({
        title: title || "Untitled Draft",
        category,
        description,
        skills,
        priceType,
        budgetMin,
        budgetMax,
        experienceLevel: experience,
        duration,
        deadline: deadline || undefined,
        visibility,
        workType,
        subcategory: subcategory || undefined,
        englishLevel,
        freelancersNeeded,
        currency,
        estimatedHours: priceType === "hourly" ? estimatedHours : undefined,
        featured,
        urgent,
        allowAIMatching,
        allowMultipleProposals,
        proposalDeadline: proposalDeadline || undefined,
        projectStartDate: projectStartDate || undefined,
        expectedCompletionDate: expectedCompletionDate || undefined,
      });
      notify("Draft saved successfully.", "success");
      navigate(ROUTES.CLIENT_MY_JOBS);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to save draft.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handlePublish = async () => {
    if (!validateStep2()) return;
    setSaving(true);
    try {
      await jobService.createAndPublish(buildPayload());
      notify("Job published successfully! Freelancers can now apply.", "success");
      navigate(ROUTES.CLIENT_MY_JOBS);
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to publish job.", "error");
    } finally {
      setSaving(false);
    }
  };

  const generateDescription = async () => {
    if (!title.trim()) { notify("Enter a job title first.", "info"); return; }
    setGenerating(true);
    setDescription(
      `Project Overview\n\nWe are seeking a ${experience}-level ${category} specialist for "${title}". ` +
      `The ideal candidate brings strong technical skills and a detail-oriented mindset.\n\n` +
      `Key Responsibilities\n- Deliver production-ready work aligned with the brief\n` +
      `- Collaborate closely with our internal team\n` +
      `- Maintain clear, proactive communication throughout the project\n\n` +
      `Required Skills\n${skills.length > 0 ? skills.join(", ") : "Please add your required skills."}\n\n` +
      `Project Duration: ${duration}${deadline ? `\nDeadline: ${deadline}` : ""}\n\n` +
      `Budget: ${formatCurrency(budgetMin)}${priceType === "hourly" ? "/hr" : " fixed"}`
    );
    setGenerating(false);
  };

  const subcategoryOptions = SUBCATEGORIES[category] || [];

  return (
    <DashboardLayout navItems={CLIENT_NAV} tagline="Freelance Marketplace" searchPlaceholder="Search talents or projects...">
      <div className="mx-auto max-w-4xl">

        {/* ── Stepper ── */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-1.5">
                <span className={cn(
                  "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold transition-colors",
                  idx === step ? "bg-brand-600 text-white"
                    : idx < step ? "bg-emerald-500 text-white"
                    : "bg-surface-muted text-ink-400"
                )}>
                  {idx < step ? "✓" : idx + 1}
                </span>
                <span className={cn("text-xs font-semibold", idx === step ? "text-brand-700" : "text-ink-400")}>
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && <span className="mb-4 h-px w-16 bg-surface-border" />}
            </div>
          ))}
        </div>

        {/* ══════════════════ STEP 1 — DETAILS ══════════════════ */}
        {step === 0 && (
          <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card">
            <h2 className="text-xl font-extrabold text-ink-900">Job Details</h2>
            <p className="mt-1 text-sm text-ink-500">Step 1 of 3 — Provide the core information for your job post.</p>

            <div className="mt-6 space-y-5">
              {/* Title */}
              <Input
                label="Job Title *"
                placeholder="e.g. Senior React Developer for SaaS Dashboard"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                error={errors.title}
              />

              {/* Category + Subcategory */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Category *" value={category} onChange={(e) => { setCategory(e.target.value); setSubcategory(""); }} error={errors.category}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </Select>
                <Select label="Subcategory" value={subcategory} onChange={(e) => setSubcategory(e.target.value)}>
                  <option value="">— Select subcategory —</option>
                  {subcategoryOptions.map((s) => <option key={s}>{s}</option>)}
                </Select>
              </div>

              {/* Budget Type */}
              <div>
                <p className="mb-2 text-sm font-medium text-ink-700">Budget Type *</p>
                <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-muted p-1">
                  {(["fixed", "hourly"] as PriceType[]).map((type) => (
                    <button key={type} onClick={() => setPriceType(type)}
                      className={cn("rounded-lg py-2 text-sm font-semibold capitalize transition-colors",
                        priceType === type ? "bg-surface-card text-brand-600 shadow-sm" : "text-ink-500")}>
                      {type === "fixed" ? "Fixed Price" : "Hourly Rate"}
                    </button>
                  ))}
                </div>
              </div>

              {/* Budget */}
              {priceType === "fixed" ? (
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Minimum Budget *"
                    type="number"
                    min={0}
                    value={budgetMin || ""}
                    onChange={(e) => setBudgetMin(e.target.value === "" ? 0 : Number(e.target.value))}
                    error={errors.budget}
                  />
                  <Input
                    label="Maximum Budget *"
                    type="number"
                    min={0}
                    value={budgetMax || ""}
                    onChange={(e) => setBudgetMax(e.target.value === "" ? 0 : Number(e.target.value))}
                    error={errors.budgetMax}
                  />
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <Input label="Min Hourly Rate *" type="number" min={0}
                    value={budgetMin || ""} onChange={(e) => setBudgetMin(e.target.value === "" ? 0 : Number(e.target.value))} error={errors.budget} />
                  <Input label="Max Hourly Rate *" type="number" min={0}
                    value={budgetMax || ""} onChange={(e) => setBudgetMax(e.target.value === "" ? 0 : Number(e.target.value))} error={errors.budgetMax} />
                </div>
              )}

              {/* Experience Level */}
              <div>
                <p className="mb-2 text-sm font-medium text-ink-700">Experience Level *</p>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-muted p-1">
                  {(["entry", "intermediate", "expert"] as ExperienceLevel[]).map((lvl) => (
                    <button key={lvl} onClick={() => setExperience(lvl)}
                      className={cn("rounded-lg py-2 text-sm font-semibold capitalize transition-colors",
                        experience === lvl ? "bg-surface-card text-brand-600 shadow-sm" : "text-ink-500")}>
                      {lvl.charAt(0).toUpperCase() + lvl.slice(1)}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration + Deadline */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Project Duration *" value={duration} onChange={(e) => setDuration(e.target.value)}>
                  {DURATIONS.map((d) => <option key={d}>{d}</option>)}
                </Select>
                <Input label="Deadline (optional)" type="date" value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  min={new Date().toISOString().split("T")[0]} />
              </div>

              {/* Work Type + Visibility */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Work Type" value={workType} onChange={(e) => setWorkType(e.target.value as WorkType)}>
                  <option value="remote">Remote</option>
                  <option value="hybrid">Hybrid</option>
                  <option value="onsite">On-site</option>
                </Select>
                <Select label="Visibility" value={visibility} onChange={(e) => setVisibility(e.target.value as "public" | "private")}>
                  <option value="public">Public — visible to all freelancers</option>
                  <option value="private">Private — invite only</option>
                </Select>
              </div>

              {/* English Level + Freelancers Needed */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="English Level Required" value={englishLevel} onChange={(e) => setEnglishLevel(e.target.value as any)}>
                  <option value="basic">Basic</option>
                  <option value="intermediate">Intermediate</option>
                  <option value="advanced">Advanced</option>
                  <option value="fluent">Fluent</option>
                </Select>
                <Input label="Freelancers Needed" type="number" min={1} max={50}
                  value={freelancersNeeded || ""}
                  onChange={(e) => setFreelancersNeeded(e.target.value === "" ? 0 : Number(e.target.value))} />
              </div>

              {/* Currency + Estimated Hours (for hourly) */}
              {priceType === "hourly" && (
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Select label="Currency" value={currency} onChange={(e) => setCurrency(e.target.value)}>
                    <option value="INR">₹ Indian Rupee (INR)</option>
                    <option value="USD">$ US Dollar (USD)</option>
                    <option value="EUR">€ Euro (EUR)</option>
                    <option value="GBP">£ British Pound (GBP)</option>
                    <option value="AUD">A$ Australian Dollar (AUD)</option>
                  </Select>
                  <Input label="Estimated Total Hours" type="number" min={1} max={10000}
                    value={estimatedHours || ""}
                    onChange={(e) => setEstimatedHours(e.target.value === "" ? 0 : Number(e.target.value))}
                    placeholder="e.g. 160 (for a month-long project)" />
                </div>
              )}

              {/* Skills */}
              <div>
                <p className="mb-2 text-sm font-medium text-ink-700">Required Skills *</p>
                <div className={cn(
                  "flex flex-wrap items-center gap-2 rounded-xl border bg-surface-card p-3 transition-colors",
                  errors.skills ? "border-red-400" : "border-surface-border"
                )}>
                  {skills.map((s) => (
                    <Badge key={s} tone="brand" className="gap-1.5">
                      {s}
                      <button onClick={() => removeSkill(s)} aria-label={`Remove ${s}`}
                        className="ml-0.5 rounded-full hover:bg-brand-200 p-0.5">
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                  <input value={skillDraft} onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addSkill(); } }}
                    placeholder={skills.length === 0 ? "Type a skill and press Enter…" : "Add more…"}
                    className="min-w-[140px] flex-1 border-none text-sm outline-none bg-transparent" />
                </div>
                {errors.skills && <p className="mt-1 text-xs text-red-500">{errors.skills}</p>}
              </div>

              {/* Attachments */}
              <div>
                <p className="mb-2 text-sm font-medium text-ink-700">Attachments (optional)</p>
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-border py-8 text-center cursor-pointer hover:border-brand-400 transition-colors">
                  <UploadCloud className="mb-2 h-7 w-7 text-brand-500" />
                  <p className="text-sm font-semibold text-ink-700">Click or drag files to upload</p>
                  <p className="text-xs text-ink-400 mt-0.5">PDF, DOC, PNG, JPG (Max 10MB each)</p>
                </div>
              </div>

              {/* ── Divider ── */}
              <div className="my-8 h-px bg-surface-border" />

              {/* Project Settings */}
              <div>
                <h3 className="mb-4 text-lg font-bold text-ink-900">Project Settings</h3>

                {/* Featured + Urgent */}
                <div className="mb-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={featured} onChange={(e) => setFeatured(e.target.checked)}
                      className="h-4 w-4 rounded border-surface-border text-brand-600 accent-brand-600" />
                    <span className="text-sm font-medium text-ink-700">Featured Job (highlight in search)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={urgent} onChange={(e) => setUrgent(e.target.checked)}
                      className="h-4 w-4 rounded border-surface-border text-brand-600 accent-brand-600" />
                    <span className="text-sm font-medium text-ink-700">Urgent Hiring (high priority)</span>
                  </label>
                </div>

                {/* AI Matching + Multiple Proposals */}
                <div className="mb-4 space-y-3">
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={allowAIMatching} onChange={(e) => setAllowAIMatching(e.target.checked)}
                      className="h-4 w-4 rounded border-surface-border text-brand-600 accent-brand-600" />
                    <span className="text-sm font-medium text-ink-700">Allow AI Matching (future feature)</span>
                  </label>
                  <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={allowMultipleProposals} onChange={(e) => setAllowMultipleProposals(e.target.checked)}
                      className="h-4 w-4 rounded border-surface-border text-brand-600 accent-brand-600" />
                    <span className="text-sm font-medium text-ink-700">Allow Multiple Proposals from Same Freelancer</span>
                  </label>
                </div>

                {/* Proposal Deadline + Project Dates */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Input label="Proposal Deadline (optional)" type="date" value={proposalDeadline}
                    onChange={(e) => setProposalDeadline(e.target.value)}
                    min={new Date().toISOString().split("T")[0]} />
                  <Input label="Project Start Date (optional)" type="date" value={projectStartDate}
                    onChange={(e) => setProjectStartDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]} />
                </div>

                <div className="mt-4">
                  <Input label="Expected Completion Date (optional)" type="date" value={expectedCompletionDate}
                    onChange={(e) => setExpectedCompletionDate(e.target.value)}
                    min={new Date().toISOString().split("T")[0]} />
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} iconPosition="left"
                onClick={() => navigate(ROUTES.CLIENT_DASHBOARD)}>
                Cancel
              </Button>
              <div className="flex gap-3">
                <Button variant="outline" onClick={handleSaveDraft} isLoading={saving}>
                  Save Draft
                </Button>
                <Button icon={<ArrowRight className="h-4 w-4" />} onClick={goToStep2}>
                  Next: Description
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 2 — DESCRIPTION ══════════════════ */}
        {step === 1 && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card lg:col-span-2">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-ink-900">Job Description</h2>
                  <p className="mt-1 text-sm text-ink-500">Describe the project clearly to attract the best freelancers.</p>
                </div>
                <Button size="sm" icon={<Sparkles className="h-4 w-4" />} iconPosition="left"
                  isLoading={generating} onClick={generateDescription}>
                  AI Generate
                </Button>
              </div>

              <div className={cn("rounded-2xl border transition-colors", errors.description ? "border-red-400" : "border-surface-border")}>
                <div className="flex items-center gap-3 border-b border-surface-border bg-surface-muted px-4 py-2 text-ink-400">
                  <Bold className="h-4 w-4" /><Italic className="h-4 w-4" /><List className="h-4 w-4" />
                </div>
                <textarea value={description} onChange={(e) => setDescription(e.target.value)}
                  rows={14} placeholder="Describe what you need done, the context, deliverables, and any technical requirements…"
                  className="w-full resize-none rounded-b-2xl p-4 text-sm text-ink-900 outline-none bg-transparent" />
              </div>
              {errors.description && <p className="mt-1.5 text-xs text-red-500">{errors.description}</p>}
              <p className="mt-2 text-xs text-ink-400">{description.length} characters (minimum 50)</p>
            </div>

            {/* Sidebar panel */}
            <div className="space-y-5">
              <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">Job Summary</p>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between text-ink-600">
                    <span>Category</span><span className="font-semibold text-ink-900">{category}</span>
                  </div>
                  {subcategory && (
                    <div className="flex justify-between text-ink-600">
                      <span>Subcategory</span><span className="font-semibold text-ink-900">{subcategory}</span>
                    </div>
                  )}
                  <div className="flex justify-between text-ink-600">
                    <span>Budget</span>
                    <span className="font-semibold text-brand-600">
                      {priceType === "fixed" ? formatCurrency(budgetMin) : `${formatCurrency(budgetMin)}–${formatCurrency(budgetMax)}/hr`}
                    </span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>Experience</span><span className="font-semibold text-ink-900 capitalize">{experience}</span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>Duration</span><span className="font-semibold text-ink-900">{duration}</span>
                  </div>
                  <div className="flex justify-between text-ink-600">
                    <span>Visibility</span>
                    <Badge tone={visibility === "public" ? "success" : "neutral"} className="capitalize">{visibility}</Badge>
                  </div>
                </div>
                {skills.length > 0 && (
                  <div className="mt-4 flex flex-wrap gap-1.5">
                    {skills.slice(0, 5).map((s) => <Badge key={s} tone="brand">{s}</Badge>)}
                    {skills.length > 5 && <Badge tone="neutral">+{skills.length - 5} more</Badge>}
                  </div>
                )}
              </div>

              <Button fullWidth icon={<ArrowRight className="h-4 w-4" />} onClick={goToStep3}>
                Next: Review & Publish
              </Button>
              <button onClick={() => setStep(0)} className="w-full text-center text-sm font-semibold text-ink-500 hover:text-ink-700">
                ← Back to Details
              </button>
            </div>
          </div>
        )}

        {/* ══════════════════ STEP 3 — REVIEW & PUBLISH ══════════════════ */}
        {step === 2 && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-ink-900">Review Your Job Post</h2>
                <Badge tone="warning">Pending Publish</Badge>
              </div>

              <span className="inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-600">
                <Rocket className="h-3.5 w-3.5" /> {category}{subcategory ? ` › ${subcategory}` : ""}
              </span>
              <h3 className="mt-2 text-2xl font-extrabold text-ink-900">{title || "Untitled Job"}</h3>
              <p className="mt-1 text-sm text-ink-500">
                {workType.charAt(0).toUpperCase() + workType.slice(1)} · {experience.charAt(0).toUpperCase() + experience.slice(1)} level · {duration}
                {deadline ? ` · Deadline: ${new Date(deadline).toLocaleDateString()}` : ""}
              </p>

              <div className="my-5 h-px bg-surface-border" />
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Description</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{description}</p>

              <div className="my-5 h-px bg-surface-border" />
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((s) => <Badge key={s} tone="brand">{s}</Badge>)}
              </div>

              <div className="my-5 h-px bg-surface-border" />
              <div className="grid grid-cols-2 gap-4 text-sm md:grid-cols-3">
                <div>
                  <p className="text-xs font-bold uppercase text-ink-400 mb-1">Budget</p>
                  <p className="font-bold text-brand-600 text-lg">
                    {priceType === "fixed" ? formatCurrency(budgetMin) : `${formatCurrency(budgetMin)}–${formatCurrency(budgetMax)}/hr`}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-ink-400 mb-1">Visibility</p>
                  <Badge tone={visibility === "public" ? "success" : "neutral"} className="capitalize">{visibility}</Badge>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-ink-400 mb-1">English Level</p>
                  <p className="font-semibold text-ink-900 capitalize">{englishLevel}</p>
                </div>
                <div>
                  <p className="text-xs font-bold uppercase text-ink-400 mb-1">Freelancers Needed</p>
                  <p className="font-semibold text-ink-900">{freelancersNeeded}</p>
                </div>
                {priceType === "hourly" && (
                  <div>
                    <p className="text-xs font-bold uppercase text-ink-400 mb-1">Estimated Hours</p>
                    <p className="font-semibold text-ink-900">{estimatedHours}</p>
                  </div>
                )}
                <div>
                  <p className="text-xs font-bold uppercase text-ink-400 mb-1">Settings</p>
                  <div className="flex gap-1 flex-wrap">
                    {featured && <Badge tone="warning" className="text-xs">Featured</Badge>}
                    {urgent && <Badge tone="danger" className="text-xs">Urgent</Badge>}
                    {allowAIMatching && <Badge tone="info" className="text-xs">AI Matching</Badge>}
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">Publish Options</p>
                <Button fullWidth icon={<Rocket className="h-4 w-4" />} iconPosition="left"
                  isLoading={saving} onClick={handlePublish} className="mb-2.5">
                  Publish Job Now
                </Button>
                <Button fullWidth variant="outline" isLoading={saving} onClick={handleSaveDraft} className="mb-2.5">
                  Save as Draft
                </Button>
                <Button fullWidth variant="ghost" onClick={() => setStep(1)}>
                  ← Back to Edit
                </Button>
              </div>

              <div className="rounded-2xl bg-brand-50 p-5 text-center">
                <ShieldCheck className="mx-auto mb-2 h-7 w-7 text-brand-600" />
                <p className="text-sm font-bold text-ink-900">Ready to Go Live</p>
                <p className="mt-1 text-xs text-ink-500">
                  Once published, your job is instantly visible to qualified freelancers on the platform.
                </p>
              </div>

              {saving && (
                <div className="flex items-center justify-center gap-2 rounded-xl bg-surface-muted p-3 text-sm text-ink-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving to MongoDB…</span>
                </div>
              )}
            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
