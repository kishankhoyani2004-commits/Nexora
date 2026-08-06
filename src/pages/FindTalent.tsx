import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search, Sparkles, ShieldCheck, Star, ArrowRight, ChevronDown, X,
  Code2, Smartphone, BarChart3, Palette, Layers, PenTool, Cloud, Link2,
  DollarSign, Headset, Zap, Clock, Award, Briefcase,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { Select } from "@/components/ui/Select";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/constants/routes";
import { publicService } from "@/services/public.service";
import { cn } from "@/utils/cn";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2, Smartphone, Sparkles, BarChart3, Palette, Layers, PenTool, Cloud,
  ShieldCheck, Link2, DollarSign, Headset,
};

const WHY_HIRE = [
  { icon: ShieldCheck, title: "Escrow-Protected Payments", desc: "Funds are held securely until you approve the delivered work — never pay upfront for nothing." },
  { icon: Sparkles, title: "AI-Powered Matching", desc: "Our engine scores compatibility on skills, past outcomes, and communication style — not just keywords." },
  { icon: Award, title: "Verified Profiles", desc: "Every freelancer profile is tied to a real project history, ratings, and review count you can check." },
  { icon: Clock, title: "Fast Turnaround", desc: "Post a job, review AI-matched proposals, and start collaborating in a single session." },
];

const HIRING_PROCESS = [
  { title: "Post Your Job", description: "Describe what you need — our AI assistant helps turn a rough brief into a high-converting job post." },
  { title: "Get Matched", description: "Receive smart-ranked proposals from freelancers whose skills and history fit your project." },
  { title: "Review & Interview", description: "Compare portfolios, ratings, and rates, then message shortlisted candidates directly." },
  { title: "Hire & Collaborate", description: "Fund escrow, kick off in the built-in workspace, and track milestones as work progresses." },
];

const FAQS = [
  { q: "How is a freelancer's rating calculated?", a: "Ratings are the average of verified client reviews left after a contract is marked complete — covering communication, quality of work, delivery time, and professionalism." },
  { q: "What happens if I'm not happy with the delivered work?", a: "Fixed-price and milestone payments stay in escrow until you approve them. If something's off, you can request revisions or open a dispute before funds are ever released." },
  { q: "Can I message a freelancer before hiring them?", a: "Yes — once you're signed in, you can reach out to any freelancer directly to discuss scope, rate, and timeline before committing to a contract." },
  { q: "Do I need to post a job to browse freelancers?", a: "No, you can search and filter the talent directory freely. You'll need an account to message someone or send a hire invitation." },
];

export default function FindTalent() {
  const navigate = useNavigate();
  const { isAuthenticated, user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalTab, setModalTab] = useState<"signin" | "signup">("signup");

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<"rating" | "newest" | "rateLow" | "rateHigh">("rating");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  // Set when a filter/search should reveal the results section; consumed by an
  // effect further down that waits for the results to finish loading first.
  const [pendingScroll, setPendingScroll] = useState(false);

  const openModal = (tab: "signin" | "signup" = "signup") => {
    setModalTab(tab);
    setShowLoginModal(true);
  };

  const handlePostJob = () => {
    if (isAuthenticated && user?.role === "client") navigate(ROUTES.CLIENT_POST_JOB);
    else openModal("signup");
  };

  const { data: categoriesData } = useQuery({
    queryKey: ["public", "categories"],
    queryFn: async () => (await publicService.listCategories()).data.data,
    staleTime: 5 * 60_000,
  });

  const { data: freelancersData, isLoading: loadingFreelancers } = useQuery({
    queryKey: ["public", "freelancers", search, category, sortBy],
    queryFn: async () =>
      (
        await publicService.listFreelancers({
          search: search || undefined,
          category: category || undefined,
          sortBy,
          limit: 9,
        })
      ).data.data,
    staleTime: 60_000,
  });

  const { data: testimonials } = useQuery({
    queryKey: ["public", "testimonials", "client"],
    queryFn: async () => (await publicService.getTestimonials("client", 3)).data.data,
    staleTime: 5 * 60_000,
  });

  const freelancers = freelancersData?.items ?? [];
  const topCategories = useMemo(() => (categoriesData ?? []).slice(0, 8), [categoriesData]);

  // Scrolling immediately here doesn't stick: changing the filter swaps the
  // results for shorter loading skeletons, the page gets shorter, and the
  // browser clamps the scroll back toward the top. So only record the intent
  // here and let the effect below scroll once the results have re-rendered.
  const scrollToResults = (slug?: string) => {
    if (slug !== undefined) setCategory(slug);
    setPendingScroll(true);
  };

  useEffect(() => {
    if (!pendingScroll || loadingFreelancers) return;
    // Instant, not smooth: a smooth scroll is animated, so the results
    // re-render mid-flight cancels it (and some browsers/reduced-motion
    // settings drop it entirely). A jump to the results reads fine here.
    document.getElementById("talent-results")?.scrollIntoView({ behavior: "auto", block: "start" });
    setPendingScroll(false);
  }, [pendingScroll, loadingFreelancers]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    scrollToResults();
  };

  return (
    <div className="min-h-screen bg-surface-app">
      <PublicNavbar />

      {/* HERO + SEARCH */}
      <section className="mx-auto max-w-7xl px-6 pb-14 pt-16 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl">
            Hire vetted freelancers,{" "}
            <span className="bg-gradient-to-r from-brand-500 to-brand-secondary bg-clip-text text-transparent">
              matched by AI
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base text-ink-500">
            Search a directory of real, rated professionals — filter by skill, rate, and availability,
            or let Nexora's engine surface the top fits for your project.
          </p>
          <form onSubmit={handleSearchSubmit} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, title, or skill…"
                className="h-12 w-full rounded-xl border border-surface-border bg-surface-card pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-400 shadow-card focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <Button type="submit" size="lg">Search Talent</Button>
          </form>
          <div className="mt-6 flex items-center justify-center gap-4">
            <Button variant="outline" icon={<ArrowRight className="h-4 w-4" />} onClick={handlePostJob}>
              Post a Job Instead
            </Button>
          </div>
        </div>
      </section>

      {/* FREELANCER CATEGORIES */}
      {topCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-extrabold text-ink-900">Browse by Category</h2>
            <button
              onClick={() => navigate(ROUTES.CATEGORIES)}
              className="text-sm font-semibold text-brand-600 hover:underline"
            >
              View All Categories →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {topCategories.map((cat) => {
              const Icon = CATEGORY_ICONS[cat.icon] ?? Sparkles;
              const isActive = category === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => scrollToResults(isActive ? undefined : cat.slug)}
                  className={cn(
                    "group flex flex-col items-start gap-2 rounded-2xl border p-4 text-left transition-all duration-200 hover:-translate-y-1 hover:shadow-card",
                    isActive ? "border-brand-500 bg-brand-50" : "border-surface-border bg-surface-card"
                  )}
                >
                  <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", isActive ? "bg-brand-600 text-white" : "bg-brand-50 text-brand-600")}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className="text-sm font-bold text-ink-900">{cat.label}</span>
                  <span className="text-xs text-ink-400">{cat.freelancerCount} freelancer{cat.freelancerCount === 1 ? "" : "s"}</span>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* AI TALENT MATCHING */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid items-center gap-10 rounded-3xl bg-brand-50 p-10 dark:bg-surface-card lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3 py-1 text-xs font-bold text-brand-700">
              <Zap className="h-3.5 w-3.5" /> AI Talent Matching
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-ink-900">Beyond Filters: Real Fit Scoring</h2>
            <p className="mt-3 text-ink-500">
              Instead of scrolling hundreds of profiles, describe your project and Nexora's engine
              ranks freelancers by skill overlap, delivery track record, and communication signals
              from past contracts.
            </p>
            <ul className="mt-5 space-y-2.5">
              {["Skill & portfolio overlap scoring", "Weighted by verified review history", "Rate and availability aware"].map((item) => (
                <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-ink-700">
                  <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-600 text-white">
                    <Star className="h-3 w-3 fill-current" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
            <Button className="mt-6" icon={<ArrowRight className="h-4 w-4" />} onClick={handlePostJob}>
              Try AI Matching
            </Button>
          </div>
          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
            <p className="text-sm font-medium text-ink-500">Average Match Confidence</p>
            <p className="mt-1 text-4xl font-extrabold text-brand-600">96.2%</p>
            <div className="mt-5 space-y-3">
              {[
                { label: "Skill Coverage", value: 95 },
                { label: "Review History Weight", value: 91 },
                { label: "Rate Fit", value: 88 },
              ].map((row) => (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-xs text-ink-500">
                    <span>{row.label}</span>
                    <span className="font-semibold text-ink-900">{row.value}%</span>
                  </div>
                  <div className="h-1.5 w-full rounded-full bg-surface-muted">
                    <div className="h-full rounded-full bg-brand-500" style={{ width: `${row.value}%` }} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* SEARCH RESULTS / FEATURED FREELANCERS */}
      <section id="talent-results" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-ink-900">
              {search || category ? "Search Results" : "Featured Freelancers"}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              {freelancersData ? `${freelancersData.total} freelancer${freelancersData.total === 1 ? "" : "s"} found` : "Top-rated professionals on Nexora"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <button
                onClick={() => setCategory(null)}
                className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700"
              >
                {categoriesData?.find((c) => c.slug === category)?.label} <X className="h-3 w-3" />
              </button>
            )}
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="!h-10 w-44">
              <option value="rating">Top Rated</option>
              <option value="newest">Newest</option>
              <option value="rateLow">Rate: Low to High</option>
              <option value="rateHigh">Rate: High to Low</option>
            </Select>
          </div>
        </div>

        {loadingFreelancers ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : freelancers.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No freelancers match your search"
            description="Try a different keyword, clear the category filter, or check back soon as more professionals join."
            action={
              (search || category) && (
                <Button variant="outline" onClick={() => { setSearch(""); setSearchInput(""); setCategory(null); }}>
                  Clear Filters
                </Button>
              )
            }
          />
        ) : (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {freelancers.map((person) => (
              <div
                key={person.id}
                className="group rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-pop"
              >
                <div className="flex items-center gap-3">
                  {person.avatar ? (
                    <img src={person.avatar} alt={person.fullName} className="h-14 w-14 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-brand-100 text-lg font-bold text-brand-700">
                      {person.fullName.charAt(0).toUpperCase()}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="truncate font-bold text-ink-900">{person.fullName}</p>
                    <p className="truncate text-sm text-ink-500">{person.title || "Freelancer"}</p>
                  </div>
                </div>
                {person.bio && <p className="mt-3 line-clamp-2 text-xs text-ink-500">{person.bio}</p>}
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {person.skills.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-600">
                      {tag}
                    </span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-bold text-ink-900">
                    {person.hourlyRate > 0 ? `$${person.hourlyRate}/hr` : "Rate on request"}
                  </span>
                  <span className="flex items-center gap-1 text-ink-500">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
                    {person.rating > 0 ? person.rating.toFixed(1) : "New"}
                    {person.reviewCount > 0 && ` (${person.reviewCount})`}
                  </span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <Badge tone={person.availability === "available" ? "success" : person.availability === "busy" ? "warning" : "neutral"} dot>
                    {person.availability === "available" ? "Available" : person.availability === "busy" ? "Busy" : "Unavailable"}
                  </Badge>
                  <button
                    onClick={() => (isAuthenticated ? navigate(`/profile/${person.id}`) : openModal("signin"))}
                    className="text-xs font-semibold text-brand-600 hover:underline"
                  >
                    View Profile →
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* WHY HIRE WITH NEXORA */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">Why Hire with Nexora</h2>
          <p className="mt-2 text-ink-500">Everything you need to hire with confidence, built in.</p>
        </div>
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {WHY_HIRE.map((item) => (
            <div key={item.title} className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand-50 text-brand-600">
                <item.icon className="h-5 w-5" />
              </span>
              <p className="mt-4 font-bold text-ink-900">{item.title}</p>
              <p className="mt-1.5 text-sm text-ink-500">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* HIRING PROCESS */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">How Hiring Works</h2>
          <p className="mt-2 text-ink-500">From brief to hired in four simple steps.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HIRING_PROCESS.map((step, idx) => (
            <div key={step.title} className="relative rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {idx + 1}
              </span>
              <p className="mt-4 font-semibold text-ink-900">{step.title}</p>
              <p className="mt-1.5 text-sm text-ink-500">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CLIENT TESTIMONIALS */}
      {testimonials && testimonials.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="mb-10 text-center text-3xl font-extrabold text-ink-900">What Clients Say</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {testimonials.map((t) => (
              <div key={t.id} className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                <div className="mb-3 flex items-center gap-1">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} className={cn("h-3.5 w-3.5", i < t.rating ? "fill-amber-400 text-amber-400" : "text-surface-border")} />
                  ))}
                </div>
                <p className="text-sm italic text-ink-700">"{t.comment}"</p>
                <div className="mt-4 flex items-center gap-2.5">
                  {t.reviewer.avatar ? (
                    <img src={t.reviewer.avatar} alt={t.reviewer.fullName} className="h-8 w-8 rounded-full object-cover" />
                  ) : (
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">
                      {t.reviewer.fullName.charAt(0)}
                    </div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-ink-900">{t.reviewer.fullName}</p>
                    <p className="text-xs text-ink-400">hired {t.reviewee.fullName}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-6 py-14">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">Frequently Asked Questions</h2>
        </div>
        <div className="space-y-3">
          {FAQS.map((faq, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={faq.q} className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card">
                <button
                  onClick={() => setOpenFaq(isOpen ? null : idx)}
                  className="flex w-full items-center justify-between gap-4 px-6 py-4 text-left"
                  aria-expanded={isOpen}
                >
                  <span className="font-semibold text-ink-900">{faq.q}</span>
                  <ChevronDown className={cn("h-5 w-5 shrink-0 text-ink-400 transition-transform", isOpen && "rotate-180")} />
                </button>
                {isOpen && <p className="px-6 pb-5 text-sm leading-relaxed text-ink-500">{faq.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-secondary px-10 py-14 text-center text-white shadow-2xl">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Ready to find your next hire?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Post a job in minutes and let AI-powered matching bring the right freelancers to you.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-brand-700 hover:bg-white/90 font-bold"
              icon={<Briefcase className="h-4 w-4" />}
              onClick={handlePostJob}
            >
              Post a Job
            </Button>
            <Button
              size="lg"
              className="border-2 border-white bg-transparent text-white hover:bg-white/10 font-bold"
              onClick={() => scrollToResults()}
            >
              Browse Talent
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <LoginModal
        key={modalTab}
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        defaultTab={modalTab}
        defaultRole="client"
      />
    </div>
  );
}
