import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  BookOpen,
  CreditCard,
  Briefcase,
  ShieldAlert,
  ScrollText,
  ChevronDown,
  ChevronUp,
  MessageSquare,
  Bug,
  Send,
  ArrowRight,
  HelpCircle,
  Wallet,
  Sparkles,
  FolderKanban,
  Settings as SettingsIcon,
  Loader2,
  CheckCircle2,
  X,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { CLIENT_NAV, FREELANCER_NAV } from "@/constants/nav";
import { ROUTES } from "@/constants/routes";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { settingsService } from "@/services/settings.service";
import { cn } from "@/utils/cn";

// ─── Types ────────────────────────────────────────────────────────────────────

interface FaqItem {
  id: string;
  question: string;
  answer: string;
  category: string;
}

interface CategoryCard {
  icon: React.ReactNode;
  title: string;
  description: string;
}

type SupportFormType = "contact" | "bug" | "feedback";

// ─── Data ─────────────────────────────────────────────────────────────────────

const CATEGORIES: CategoryCard[] = [
  { icon: <BookOpen size={24} />, title: "Getting Started", description: "New to Nexora? Learn the basics and set up your account." },
  { icon: <CreditCard size={24} />, title: "Account & Billing", description: "Manage your profile, subscription, and billing details." },
  { icon: <Briefcase size={24} />, title: "Jobs & Proposals", description: "Post jobs, submit proposals, and manage applications." },
  { icon: <Wallet size={24} />, title: "Payments & Escrow", description: "Understand how funds are held, released, and transferred." },
  { icon: <ShieldAlert size={24} />, title: "Dispute Resolution", description: "Learn how to resolve conflicts and escalate issues." },
  { icon: <ScrollText size={24} />, title: "Platform Policies", description: "Review terms, acceptable use policies, and guidelines." },
];

const ALL_FAQS: FaqItem[] = [
  {
    id: "post-job",
    category: "Jobs & Proposals",
    question: "How do I post a job on Nexora?",
    answer:
      "To post a job, navigate to Post Job from your dashboard. Fill in the job title, description, required skills, budget type (fixed or hourly), and deadline. Once submitted, your job will be visible to qualified freelancers on the platform. You can edit or close the listing at any time from My Jobs.",
  },
  {
    id: "submit-proposal",
    category: "Jobs & Proposals",
    question: "How do freelancers submit proposals?",
    answer:
      "Freelancers can browse available jobs via Browse Jobs and click Submit Proposal on any listing. They provide a cover letter, proposed rate, estimated timeline, and relevant portfolio links. As a client, you'll receive all proposals in your Proposals tab and can accept, shortlist, or decline them.",
  },
  {
    id: "escrow",
    category: "Payments & Escrow",
    question: "How does escrow work?",
    answer:
      "When you hire a freelancer, the agreed amount is locked in Nexora's secure escrow account — it is not sent to the freelancer yet. Once the freelancer delivers the work and you approve it, the funds are released automatically. If a dispute arises, Nexora's mediation team steps in to review the case and decide on a fair outcome.",
  },
  {
    id: "withdraw-earnings",
    category: "Payments & Escrow",
    question: "How can I withdraw my earnings?",
    answer:
      "Freelancers can withdraw earnings from the Earnings page. Nexora supports PayPal, bank transfer (ACH/SEPA), and cryptocurrency payouts. A minimum balance of $20 is required. Withdrawals are processed within 1–3 business days depending on your selected method. Funds must have cleared the 5-day security hold before they can be withdrawn.",
  },
  {
    id: "client-no-response",
    category: "Dispute Resolution",
    question: "What happens if a client doesn't respond?",
    answer:
      "If a client becomes unresponsive after work has been delivered, the freelancer can open a dispute from the project workspace. Nexora will attempt to mediate within 48 hours. If the client still does not respond within 7 days, the escrow funds may be released to the freelancer based on evidence of delivery.",
  },
  {
    id: "leave-review",
    category: "Getting Started",
    question: "How do I leave a review?",
    answer:
      "After a contract is marked complete, both parties are prompted to leave a review within 14 days. Go to the completed project in your Projects section and click Leave Review. Reviews are public and permanently affect both parties' reputation scores on the platform.",
  },
  {
    id: "change-role",
    category: "Account & Billing",
    question: "Can I change my account role (client ↔ freelancer)?",
    answer:
      "Yes. Go to Settings → Account and look for the Role section. You can request a role switch which takes effect after verification. Note that switching roles does not delete your existing history — your reviews, contracts, and payment history are all preserved. You may need to complete a brief profile update for the new role.",
  },
  {
    id: "platform-fees",
    category: "Account & Billing",
    question: "What are Nexora's platform fees?",
    answer:
      "Nexora charges a service fee to freelancers based on lifetime earnings with each client: 20% for the first $500, 10% for $500–$10,000, and 5% above $10,000. Clients pay a 3% payment processing fee on top of the project amount. There are no hidden fees — all charges are shown transparently at checkout and in your Payments dashboard.",
  },
  {
    id: "terms",
    category: "Platform Policies",
    question: "Where can I read Nexora's Terms of Service?",
    answer:
      "Our full Terms of Service and Acceptable Use Policy are linked in the footer of every page. They cover account eligibility, prohibited conduct, intellectual property, and dispute procedures — worth a skim before your first contract.",
  },
];

const FORM_TABS: { type: SupportFormType; label: string; icon: React.ReactNode; placeholder: string }[] = [
  { type: "contact", label: "Contact Support", icon: <MessageSquare size={16} />, placeholder: "Describe what you need help with…" },
  { type: "bug", label: "Report a Problem", icon: <Bug size={16} />, placeholder: "What went wrong? Steps to reproduce help us fix it faster." },
  { type: "feedback", label: "Feedback", icon: <Sparkles size={16} />, placeholder: "Tell us what you think — ideas, praise, or gripes all welcome." },
];

// ─── Component ────────────────────────────────────────────────────────────────

export default function HelpCenter() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const isClient = user?.role === "client";

  const navItems = isClient ? CLIENT_NAV : FREELANCER_NAV;

  const quickLinks = [
    { label: "AI Assistant", href: ROUTES.AI_ASSISTANT, icon: Sparkles },
    { label: "Workspace", href: ROUTES.WORKSPACE, icon: FolderKanban },
    { label: "Payments", href: isClient ? ROUTES.CLIENT_PAYMENTS : ROUTES.FREELANCER_EARNINGS, icon: Wallet },
    { label: "Projects", href: isClient ? ROUTES.CLIENT_ACTIVE_PROJECTS : ROUTES.FREELANCER_ACTIVE_PROJECTS, icon: Briefcase },
    { label: "Settings", href: ROUTES.SETTINGS, icon: SettingsIcon },
  ];

  // Role-aware FAQ ordering: clients see "How to post a job" first,
  // freelancers see "How to submit a proposal" first.
  const faqs = useMemo<FaqItem[]>(() => {
    const postJob = ALL_FAQS.find((f) => f.id === "post-job")!;
    const submitProposal = ALL_FAQS.find((f) => f.id === "submit-proposal")!;
    const rest = ALL_FAQS.filter((f) => f.id !== "post-job" && f.id !== "submit-proposal");
    return isClient ? [postJob, submitProposal, ...rest] : [submitProposal, postJob, ...rest];
  }, [isClient]);

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [openFaqId, setOpenFaqId] = useState<string | null>(null);

  const filteredFaqs = useMemo(() => {
    let result = faqs;
    if (activeCategory) result = result.filter((f) => f.category === activeCategory);
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter((f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
    }
    return result;
  }, [searchQuery, activeCategory, faqs]);

  const toggleFaq = (id: string) => setOpenFaqId((prev) => (prev === id ? null : id));

  // ── Support form state ──────────────────────────────────────────────────
  const [formType, setFormType] = useState<SupportFormType>("contact");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const switchForm = (type: SupportFormType) => {
    setFormType(type);
    setSubmitted(false);
    setFormErrors({});
  };

  const handleSubmitForm = async () => {
    const errors: Record<string, string> = {};
    if (!subject.trim()) errors.subject = "Subject is required.";
    if (!message.trim() || message.trim().length < 10) errors.message = "Please add at least 10 characters.";
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setSubmitting(true);
      await settingsService.submitFeedback(formType, subject.trim(), message.trim(), user?.email);
      setSubmitted(true);
      setSubject("");
      setMessage("");
      notify("Thanks — we've received your message.", "success");
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to send. Please try again.", "error");
    } finally {
      setSubmitting(false);
    }
  };

  const activeFormMeta = FORM_TABS.find((f) => f.type === formType)!;

  return (
    <DashboardLayout navItems={navItems}>
      <div className="flex flex-col gap-12 pb-12 pt-6">
        {/* ── Hero ── */}
        <section className="relative overflow-hidden rounded-3xl border border-brand-200 bg-gradient-to-br from-brand-50 via-surface-card to-surface-card px-6 py-14 text-center dark:border-brand-800">
          <div className="relative z-10 mx-auto flex max-w-2xl flex-col items-center gap-4">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold uppercase tracking-wide text-brand-700">
              <HelpCircle size={14} />
              Support Center
            </span>
            <h1 className="text-3xl font-extrabold text-ink-900 sm:text-4xl">How can we help you?</h1>
            <p className="text-ink-500">Search our knowledge base or browse by category below.</p>
            <div className="relative mt-2 w-full max-w-lg">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                placeholder="Search for help..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoComplete="off"
                className="h-14 w-full rounded-2xl border border-surface-border bg-surface-card pl-12 pr-12 text-sm text-ink-900 placeholder:text-ink-400 shadow-card transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery("")}
                  aria-label="Clear search"
                  className="absolute right-4 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded-full bg-surface-muted text-ink-400 transition-colors hover:bg-red-100 hover:text-danger"
                >
                  <X size={14} />
                </button>
              )}
            </div>
          </div>
        </section>

        {/* ── Categories ── */}
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-extrabold text-ink-900">Browse by Category</h2>
              <p className="text-sm text-ink-500">Find answers organized by topic.</p>
            </div>
            {activeCategory && (
              <button
                onClick={() => setActiveCategory(null)}
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                Clear filter ×
              </button>
            )}
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {CATEGORIES.map((cat) => {
              const isActive = activeCategory === cat.title;
              return (
                <button
                  key={cat.title}
                  onClick={() => setActiveCategory(isActive ? null : cat.title)}
                  className={cn(
                    "group flex items-start gap-3.5 rounded-2xl border p-5 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-card",
                    isActive
                      ? "border-brand-500 bg-brand-50 shadow-card"
                      : "border-surface-border bg-surface-card hover:border-brand-300"
                  )}
                >
                  <span
                    className={cn(
                      "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors",
                      isActive ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600 group-hover:bg-brand-100"
                    )}
                  >
                    {cat.icon}
                  </span>
                  <div className="flex-1">
                    <p className="text-sm font-bold text-ink-900">{cat.title}</p>
                    <p className="mt-0.5 text-xs leading-relaxed text-ink-500">{cat.description}</p>
                  </div>
                  <ArrowRight
                    size={16}
                    className={cn(
                      "mt-1 shrink-0 text-ink-300 transition-all duration-200",
                      "group-hover:translate-x-0.5 group-hover:text-brand-500",
                      isActive && "text-brand-500"
                    )}
                  />
                </button>
              );
            })}
          </div>
        </section>

        {/* ── FAQ ── */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink-900">Popular Articles</h2>
            <p className="text-sm text-ink-500">
              {activeCategory
                ? `Showing articles in "${activeCategory}".`
                : isClient
                ? "Answers to the most common questions for clients."
                : "Answers to the most common questions for freelancers."}
            </p>
          </div>

          {filteredFaqs.length === 0 ? (
            <div className="flex flex-col items-center gap-3 rounded-2xl border border-dashed border-surface-border bg-surface-card py-14 text-center">
              <Search size={36} className="text-ink-300" />
              <p className="text-sm text-ink-500">
                No articles match{searchQuery ? ` "${searchQuery}"` : " this category"}.
              </p>
              <button
                onClick={() => { setSearchQuery(""); setActiveCategory(null); }}
                className="text-sm font-semibold text-brand-600 hover:underline"
              >
                Clear filters
              </button>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filteredFaqs.map((faq) => {
                const isOpen = openFaqId === faq.id;
                return (
                  <div
                    key={faq.id}
                    className={cn(
                      "overflow-hidden rounded-2xl border bg-surface-card transition-colors",
                      isOpen ? "border-brand-300 shadow-card" : "border-surface-border"
                    )}
                  >
                    <button
                      onClick={() => toggleFaq(faq.id)}
                      aria-expanded={isOpen}
                      className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-muted"
                    >
                      <span className="text-sm font-semibold text-ink-900">{faq.question}</span>
                      <span className="shrink-0 text-brand-600">
                        {isOpen ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                      </span>
                    </button>
                    {isOpen && (
                      <div className="border-t border-surface-border px-5 pb-5 pt-4">
                        <p className="text-sm leading-relaxed text-ink-500">{faq.answer}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </section>

        {/* ── Quick Links ── */}
        <section className="flex flex-col gap-4">
          <h2 className="text-xl font-extrabold text-ink-900">Quick Links</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
            {quickLinks.map((link) => (
              <Link
                key={link.label}
                to={link.href}
                className="group flex flex-col items-center gap-2 rounded-2xl border border-surface-border bg-surface-card px-4 py-5 text-center transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-card"
              >
                <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                  <link.icon size={20} />
                </span>
                <span className="text-xs font-semibold text-ink-900">{link.label}</span>
              </Link>
            ))}
          </div>
        </section>

        {/* ── Still Need Help? ── */}
        <section className="flex flex-col gap-4">
          <div>
            <h2 className="text-xl font-extrabold text-ink-900">Still need help?</h2>
            <p className="text-sm text-ink-500">Send us a message and our support team will get back to you.</p>
          </div>

          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
            <div className="mb-5 flex flex-wrap gap-2 border-b border-surface-border pb-4">
              {FORM_TABS.map((f) => (
                <button
                  key={f.type}
                  onClick={() => switchForm(f.type)}
                  className={cn(
                    "flex items-center gap-1.5 rounded-xl px-3.5 py-2 text-sm font-semibold transition-colors",
                    formType === f.type
                      ? "bg-brand-50 text-brand-700"
                      : "text-ink-500 hover:bg-surface-muted hover:text-ink-900"
                  )}
                >
                  {f.icon}
                  {f.label}
                </button>
              ))}
            </div>

            {submitted ? (
              <div className="flex flex-col items-center gap-3 py-8 text-center">
                <span className="flex h-14 w-14 items-center justify-center rounded-full bg-emerald-100 text-success">
                  <CheckCircle2 size={28} />
                </span>
                <p className="text-base font-bold text-ink-900">Message sent!</p>
                <p className="max-w-sm text-sm text-ink-500">
                  Thanks for reaching out — our team typically responds within 24 hours on business days.
                </p>
                <Button variant="outline" size="sm" className="mt-2" onClick={() => setSubmitted(false)}>
                  Send another message
                </Button>
              </div>
            ) : (
              <div className="space-y-4">
                <Input
                  label="Subject"
                  placeholder={
                    formType === "contact" ? "e.g. Question about escrow release"
                    : formType === "bug" ? "e.g. Upload button not responding"
                    : "e.g. Suggestion for the proposal editor"
                  }
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  error={formErrors.subject}
                />
                <Textarea
                  label="Message"
                  placeholder={activeFormMeta.placeholder}
                  rows={5}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  error={formErrors.message}
                />
                <Button
                  icon={<Send className="h-4 w-4" />}
                  iconPosition="left"
                  isLoading={submitting}
                  onClick={handleSubmitForm}
                >
                  {submitting ? "Sending…" : `Send ${activeFormMeta.label}`}
                </Button>
              </div>
            )}
          </div>
        </section>
      </div>
    </DashboardLayout>
  );
}
