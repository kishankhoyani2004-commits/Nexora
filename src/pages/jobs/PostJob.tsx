import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRight,
  ArrowLeft,
  UploadCloud,
  Sparkles,
  Bold,
  Italic,
  List,
  ListOrdered,
  Link as LinkIcon,
  Lightbulb,
  Rocket,
  ShieldCheck,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { Button } from "@/components/ui/Button";
import { formatCurrency } from "@/utils/formatters";
import { Badge } from "@/components/ui/Badge";
import { CLIENT_NAV } from "@/constants/nav";
import { cn } from "@/utils/cn";
import { useNotification } from "@/context/NotificationContext";
import { ROUTES } from "@/constants/routes";
import { aiService } from "@/services/ai.service";
import { jobService } from "@/services/job.service";

const STEPS = ["Details", "Description", "Review & Publish"];

export default function PostJob() {
  const [step, setStep] = useState(0);
  const [title, setTitle] = useState("");
  const [category, setCategory] = useState("UI/UX Design");
  const [budget, setBudget] = useState(125000);
  const [experience, setExperience] = useState<"Entry" | "Intermediate" | "Expert">("Intermediate");
  const [skills, setSkills] = useState<string[]>(["Figma", "Tailwind CSS", "React"]);
  const [skillDraft, setSkillDraft] = useState("");
  const [description, setDescription] = useState(
    "Project Overview\n\nWe are seeking a high-end specialist to lead the next phase of this AI-powered initiative, focusing on precision, scalability, and a seamless end-user experience."
  );
  const [timeline, setTimeline] = useState<"Long" | "Medium" | "Short">("Long");
  const [generating, setGenerating] = useState(false);

  const navigate = useNavigate();
  const { notify } = useNotification();

  const addSkill = () => {
    if (skillDraft.trim() && !skills.includes(skillDraft.trim())) {
      setSkills([...skills, skillDraft.trim()]);
    }
    setSkillDraft("");
  };

  const generateDescription = async () => {
    setGenerating(true);
    try {
      // Placeholder call — backend implements the real generation.
      await aiService.generateJobDescription(title || "New project");
    } catch {
      // Swallow network errors from the placeholder endpoint; fall back to local copy.
    } finally {
      setDescription(
        `Project Overview\n\nWe are seeking a ${experience.toLowerCase()}-level ${category} specialist for "${
          title || "this project"
        }". The ideal candidate blends strong technical execution with a keen eye for detail.\n\nKey Responsibilities\n- Deliver production-ready work aligned with the brief\n- Collaborate closely with our internal team\n- Maintain clear, proactive communication throughout\n\nRequired Skills\n${skills.join(
          ", "
        )}`
      );
      setGenerating(false);
    }
  };

  const publish = async () => {
    setGenerating(true); // repurpose generating or just do standard async
    try {
      await jobService.create({
        title,
        description,
        budgetMin: budget,
        budgetMax: budget,
        priceType: "fixed",
        experienceLevel: experience.toLowerCase() as any,
        skills,
        category,
        duration: timeline === "Long" ? "6+ months" : timeline === "Medium" ? "1-3 months" : "< 1 month",
      });
      notify("Job published successfully!", "success");
      navigate(ROUTES.JOBS);
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || "Failed to publish job.", "error");
    } finally {
      setGenerating(false);
    }
  };

  return (
    <DashboardLayout navItems={CLIENT_NAV} tagline="Freelance Marketplace" searchPlaceholder="Search talents or projects...">
      <div className="mx-auto max-w-4xl">
        {/* Stepper */}
        <div className="mb-8 flex items-center justify-center gap-4">
          {STEPS.map((label, idx) => (
            <div key={label} className="flex items-center gap-4">
              <div className="flex flex-col items-center gap-2">
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-full text-sm font-bold",
                    idx === step
                      ? "bg-brand-600 text-white"
                      : idx < step
                      ? "bg-brand-100 text-brand-600"
                      : "bg-surface-muted text-ink-400"
                  )}
                >
                  {idx + 1}
                </span>
                <span className={cn("text-xs font-semibold", idx === step ? "text-brand-700" : "text-ink-400")}>
                  {label}
                </span>
              </div>
              {idx < STEPS.length - 1 && <span className="h-px w-16 bg-surface-border" />}
            </div>
          ))}
        </div>

        {/* STEP 1 */}
        {step === 0 && (
          <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card">
            <h2 className="text-xl font-extrabold text-ink-900">Project Details</h2>
            <p className="mt-1 text-sm text-ink-500">
              Step 1 of 3: Provide the foundational information for your AI-powered project.
            </p>

            <div className="mt-6 space-y-6">
              <Input
                label="Project Title"
                placeholder="e.g. Next-Gen Creative AI Interface Design"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Select label="Category" value={category} onChange={(e) => setCategory(e.target.value)}>
                  {["UI/UX Design", "AI & ML", "Web Development", "Branding", "Data Science"].map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
                <Input label="Expected Deadline" type="date" />
              </div>

              <div className="rounded-2xl bg-surface-muted p-5">
                <div className="mb-3 flex items-center justify-between">
                  <span className="text-xs font-bold uppercase tracking-wide text-ink-500">Project Budget</span>
                  <span className="text-2xl font-extrabold text-brand-600">
                    {formatCurrency(budget)}
                  </span>
                </div>
                <input
                  type="range"
                  min={5000}
                  max={1000000}
                  step={5000}
                  value={budget}
                  onChange={(e) => setBudget(Number(e.target.value))}
                  className="w-full accent-brand-600"
                />
                <div className="mt-1 flex justify-between text-xs text-ink-400">
                  <span>{formatCurrency(5000)}</span>
                  <span>{formatCurrency(1000000)}+</span>
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-ink-700">Experience Level Required</p>
                <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-muted p-1">
                  {(["Entry", "Intermediate", "Expert"] as const).map((level) => (
                    <button
                      key={level}
                      onClick={() => setExperience(level)}
                      className={cn(
                        "rounded-lg py-2 text-sm font-semibold transition-colors",
                        experience === level ? "bg-surface-card text-brand-600 shadow-sm" : "text-ink-500"
                      )}
                    >
                      {level}
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-ink-700">Required Skills</p>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-surface-border bg-surface-card p-3">
                  {skills.map((skill) => (
                    <Badge key={skill} tone="brand" className="gap-1.5">
                      {skill}
                      <button onClick={() => setSkills(skills.filter((s) => s !== skill))} aria-label={`Remove ${skill}`}>
                        ×
                      </button>
                    </Badge>
                  ))}
                  <input
                    value={skillDraft}
                    onChange={(e) => setSkillDraft(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), addSkill())}
                    placeholder="Add skill…"
                    className="min-w-[100px] flex-1 border-none text-sm outline-none"
                  />
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-medium text-ink-700">Supporting Documents</p>
                <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-surface-border py-10 text-center">
                  <UploadCloud className="mb-3 h-8 w-8 text-brand-500" />
                  <p className="text-sm font-semibold text-ink-900">Click or drag to upload files</p>
                  <p className="text-xs text-ink-400">PDF, JPG, PNG or MP4 (Max 50MB)</p>
                </div>
              </div>
            </div>

            <div className="mt-8 flex items-center justify-between">
              <Button variant="ghost" icon={<ArrowLeft className="h-4 w-4" />} iconPosition="left" onClick={() => navigate(-1)}>
                Cancel
              </Button>
              <Button icon={<ArrowRight className="h-4 w-4" />} onClick={() => setStep(1)}>
                Next Step
              </Button>
            </div>
          </div>
        )}

        {/* STEP 2 */}
        {step === 1 && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card lg:col-span-2">
              <div className="mb-4 flex items-start justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-ink-900">AI Project Description</h2>
                  <p className="mt-1 text-sm text-ink-500">Refine your project requirements with the precision of Nexora AI.</p>
                </div>
                <Button
                  size="sm"
                  icon={<Sparkles className="h-4 w-4" />}
                  iconPosition="left"
                  isLoading={generating}
                  onClick={generateDescription}
                >
                  Generate AI Job Description
                </Button>
              </div>

              <div className="rounded-2xl border border-surface-border">
                <div className="flex items-center gap-3 border-b border-surface-border bg-surface-muted px-4 py-2.5 text-ink-500">
                  <Bold className="h-4 w-4" />
                  <Italic className="h-4 w-4" />
                  <List className="h-4 w-4" />
                  <ListOrdered className="h-4 w-4" />
                  <LinkIcon className="h-4 w-4" />
                </div>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={12}
                  className="w-full resize-none rounded-b-2xl p-4 text-sm text-ink-900 outline-none"
                />
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">Project Timeline</p>
                <div className="space-y-2.5">
                  {[
                    { key: "Long", title: "Long Term (6+ months)", desc: "Best for foundational development" },
                    { key: "Medium", title: "Medium Term (1-3 months)", desc: "Ideal for specific project phases" },
                    { key: "Short", title: "Short Term (< 1 month)", desc: "Perfect for quick tasks/consulting" },
                  ].map((option) => (
                    <button
                      key={option.key}
                      onClick={() => setTimeline(option.key as typeof timeline)}
                      className={cn(
                        "w-full rounded-xl border p-3 text-left transition-colors",
                        timeline === option.key ? "border-brand-600 bg-brand-50" : "border-surface-border"
                      )}
                    >
                      <p className="text-sm font-semibold text-ink-900">{option.title}</p>
                      <p className="text-xs text-ink-500">{option.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-brand-50 p-5">
                <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">
                  <Lightbulb className="h-3.5 w-3.5" /> AI Suggestions
                </p>
                <p className="text-sm text-ink-700">
                  Nexora AI recommends adding a 'Performance Expectations' section to attract senior-level
                  talent.
                </p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <Badge tone="violet">Recommended: Milestones</Badge>
                </div>
              </div>

              <Button fullWidth icon={<ArrowRight className="h-4 w-4" />} onClick={() => setStep(2)}>
                Next: Review & Post
              </Button>
              <button onClick={() => setStep(0)} className="w-full text-center text-sm font-semibold text-ink-500">
                Back to Basic Info
              </button>
            </div>
          </div>
        )}

        {/* STEP 3 */}
        {step === 2 && (
          <div className="grid gap-6 lg:grid-cols-3">
            <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card lg:col-span-2">
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-xl font-extrabold text-ink-900">Review your post</h2>
                <Badge tone="info">Draft</Badge>
              </div>
              <span className="mb-2 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-600">
                <Rocket className="h-3.5 w-3.5" /> {category}
              </span>
              <h3 className="text-2xl font-extrabold text-ink-900">{title || "Untitled Project"}</h3>
              <p className="mt-1 text-sm text-ink-500">
                Remote (Global) · Estimated timeline: {timeline} Term · {experience}
              </p>
              <div className="my-5 h-px bg-surface-border" />
              <p className="mb-2 text-xs font-bold uppercase tracking-wide text-ink-400">Project Description</p>
              <p className="whitespace-pre-line text-sm leading-relaxed text-ink-700">{description}</p>
              <div className="my-5 h-px bg-surface-border" />
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">Required Skills</p>
              <div className="flex flex-wrap gap-2">
                {skills.map((skill) => (
                  <Badge key={skill} tone="brand">
                    {skill}
                  </Badge>
                ))}
              </div>
            </div>

            <div className="space-y-5">
              <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
                <p className="mb-3 text-xs font-bold uppercase tracking-wide text-ink-400">Budget & Timeline</p>
                <p className="text-2xl font-extrabold text-brand-600">{formatCurrency(budget)}</p>
                <div className="mt-3 space-y-2 text-sm">
                  <div className="flex justify-between text-ink-500">
                    <span>Price Type</span>
                    <span className="font-semibold text-ink-900">Fixed Price</span>
                  </div>
                  <div className="flex justify-between text-ink-500">
                    <span>Experience</span>
                    <span className="font-semibold text-ink-900">{experience}</span>
                  </div>
                </div>
                <Button fullWidth className="mt-5" icon={<Rocket className="h-4 w-4" />} iconPosition="left" onClick={publish}>
                  Publish Job
                </Button>
                <Button fullWidth variant="outline" className="mt-2.5" onClick={() => setStep(1)}>
                  Back to Edit
                </Button>
              </div>

              <div className="rounded-2xl bg-brand-50 p-5 text-center">
                <ShieldCheck className="mx-auto mb-2 h-7 w-7 text-brand-600" />
                <p className="text-sm font-bold text-ink-900">High Matching Score</p>
                <p className="mt-1 text-xs text-ink-500">
                  Our AI predicts 150+ elite freelancers match your requirements perfectly.
                </p>
                <div className="mt-3 h-1.5 rounded-full bg-surface-card">
                  <div className="h-full w-[92%] rounded-full bg-brand-600" />
                </div>
                <p className="mt-1.5 text-xs font-semibold text-brand-700">92% Precision Match</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
