import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
  Search, Star, ArrowRight, ChevronDown, X, Zap,
  Award, MapPin, Clock, Flame,
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
import { jobService } from "@/services/job.service";
import { publicService } from "@/services/public.service";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import { cn } from "@/utils/cn";

const HOW_IT_WORKS = [
  { title: "Create Your Profile", description: "Showcase your skills, portfolio, and rate — it's how clients and our AI find you." },
  { title: "Browse & Apply", description: "Search live jobs or let AI recommendations surface the ones worth your time." },
  { title: "Get Hired", description: "Send a proposal, discuss scope with the client, and start the contract with escrow funded." },
  { title: "Deliver & Get Paid", description: "Submit milestones, get client approval, and receive secure, on-time payouts." },
];

const FAQS = [
  { q: "Is Nexora free for freelancers to join?", a: "Yes — creating a profile and browsing or applying to jobs is completely free. Nexora takes a service fee only from earnings, on a sliding scale that decreases the more you earn with a client." },
  { q: "How do I get matched with better jobs?", a: "Complete your profile with real skills and a portfolio, and keep your availability status current — our AI recommendation engine weighs profile completeness and history heavily." },
  { q: "When do I actually get paid?", a: "Clients fund escrow before work begins. Once you deliver and the client approves a milestone, funds are released to your Nexora balance and can be withdrawn." },
  { q: "Can I work with clients outside recommended jobs?", a: "Absolutely — browse and search the full job board anytime, recommendations are just a shortcut, not a restriction." },
];

export default function FindWork() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { isAuthenticated, user } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalTab, setModalTab] = useState<"signin" | "signup">("signup");

  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [category, setCategory] = useState<string | null>(() => searchParams.get("category"));
  const [sortBy, setSortBy] = useState<"newest" | "budgetHigh" | "budgetLow">("newest");
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  // Set when a filter/search should reveal the results section; consumed by an
  // effect further down that waits for the results to finish loading first.
  const [pendingScroll, setPendingScroll] = useState(false);

  // A category link from the Categories page lands here with ?category=slug
  // already set from initial state above — this only needs to react to a
  // second navigation while already on this page (e.g. clicking another
  // category chip elsewhere without a full remount).
  useEffect(() => {
    const fromUrl = searchParams.get("category");
    if (fromUrl && fromUrl !== category) {
      setCategory(fromUrl);
      setPendingScroll(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const openModal = (tab: "signin" | "signup" = "signup") => {
    setModalTab(tab);
    setShowLoginModal(true);
  };

  const isFreelancer = isAuthenticated && user?.role === "freelancer";

  const { data: jobsData, isLoading: loadingJobs } = useQuery({
    queryKey: ["public", "jobs", search, category, sortBy],
    queryFn: async () =>
      (
        await jobService.list({
          search: search || undefined,
          category: category || undefined,
          sortBy,
          limit: 9,
        })
      ).data.data,
    staleTime: 60_000,
  });

  const { data: recommendedData, isLoading: loadingRecommended } = useQuery({
    queryKey: ["freelancer", "recommendedJobs", "findwork"],
    queryFn: async () => (await jobService.getRecommended(3)).data.data.items,
    enabled: isFreelancer,
    staleTime: 60_000,
  });

  const { data: trendingSkills } = useQuery({
    queryKey: ["public", "trending-skills"],
    queryFn: async () => (await publicService.getTrendingSkills(10)).data.data,
    staleTime: 5 * 60_000,
  });

  const { data: categoriesData } = useQuery({
    queryKey: ["public", "categories"],
    queryFn: async () => (await publicService.listCategories()).data.data,
    staleTime: 5 * 60_000,
  });

  const { data: successStories } = useQuery({
    queryKey: ["public", "testimonials", "freelancer"],
    queryFn: async () => (await publicService.getTestimonials("freelancer", 3)).data.data,
    staleTime: 5 * 60_000,
  });

  const jobs = jobsData?.items ?? [];
  const topCategories = useMemo(() => (categoriesData ?? []).slice(0, 6), [categoriesData]);

  // Scrolling immediately here doesn't stick: changing the filter swaps the
  // results for shorter loading skeletons, the page gets shorter, and the
  // browser clamps the scroll back toward the top. So only record the intent
  // here and let the effect below scroll once the results have re-rendered.
  const scrollToResults = (slug?: string) => {
    if (slug !== undefined) setCategory(slug);
    setPendingScroll(true);
  };

  useEffect(() => {
    if (!pendingScroll || loadingJobs) return;
    // Instant, not smooth: a smooth scroll is animated, so the results
    // re-render mid-flight cancels it (and some browsers/reduced-motion
    // settings drop it entirely). A jump to the results reads fine here.
    document.getElementById("job-results")?.scrollIntoView({ behavior: "auto", block: "start" });
    setPendingScroll(false);
  }, [pendingScroll, loadingJobs]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSearch(searchInput);
    scrollToResults();
  };

  const handleViewJob = (id: string) => {
    if (isAuthenticated) navigate(`/jobs/${id}`);
    else openModal("signin");
  };

  return (
    <div className="min-h-screen bg-surface-app">
      <PublicNavbar />

      {/* HERO + SEARCH */}
      <section className="mx-auto max-w-7xl px-6 pb-14 pt-16 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl">
            Discover projects worth{" "}
            <span className="bg-gradient-to-r from-brand-500 to-brand-secondary bg-clip-text text-transparent">
              your time
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base text-ink-500">
            Search live jobs straight from Nexora clients, or let AI recommendations do the sorting
            for you based on your skills.
          </p>
          <form onSubmit={handleSearchSubmit} className="mx-auto mt-8 flex max-w-xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by title, skill, or keyword…"
                className="h-12 w-full rounded-xl border border-surface-border bg-surface-card pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-400 shadow-card focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <Button type="submit" size="lg">Search Jobs</Button>
          </form>
        </div>
      </section>

      {/* TRENDING SKILLS */}
      {trendingSkills && trendingSkills.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 pb-10">
          <div className="mb-4 flex items-center gap-2 text-sm font-semibold text-ink-500">
            <Flame className="h-4 w-4 text-orange-500" /> Trending skills this week
          </div>
          <div className="flex flex-wrap gap-2">
            {trendingSkills.map((s) => (
              <button
                key={s.skill}
                onClick={() => { setSearchInput(s.skill); setSearch(s.skill); scrollToResults(); }}
                className="flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card px-3.5 py-1.5 text-xs font-semibold text-ink-700 transition-colors hover:border-brand-300 hover:text-brand-600"
              >
                {s.skill}
                <span className="text-ink-400">{s.jobCount}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* AI JOB RECOMMENDATIONS */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid items-center gap-10 rounded-3xl bg-brand-50 p-10 dark:bg-surface-card lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3 py-1 text-xs font-bold text-brand-700">
              <Zap className="h-3.5 w-3.5" /> AI Job Recommendations
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-ink-900">Jobs Picked for Your Skills</h2>
            <p className="mt-3 text-ink-500">
              {isFreelancer
                ? "Based on your profile's skills and history, here's what Nexora's engine thinks fits you best."
                : "Sign in as a freelancer and Nexora's engine will rank open jobs by your skill overlap, rate expectations, and category fit."}
            </p>
            {!isFreelancer && (
              <Button className="mt-6" icon={<ArrowRight className="h-4 w-4" />} onClick={() => openModal("signup")}>
                Get My Recommendations
              </Button>
            )}
          </div>
          <div className="space-y-3">
            {isFreelancer && loadingRecommended ? (
              Array.from({ length: 2 }).map((_, i) => <CardSkeleton key={i} />)
            ) : isFreelancer && recommendedData && recommendedData.length > 0 ? (
              recommendedData.map((job) => (
                <button
                  key={job.id}
                  onClick={() => handleViewJob(job.id)}
                  className="w-full rounded-2xl border border-surface-border bg-surface-card p-4 text-left shadow-card transition-transform hover:-translate-y-0.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <p className="font-bold text-ink-900">{job.title}</p>
                    <Badge tone="brand">{job.matchScore}% match</Badge>
                  </div>
                  <p className="mt-1 text-xs text-ink-500">{job.matchReason}</p>
                  <p className="mt-2 text-sm font-semibold text-ink-900">
                    {formatCurrency(job.budgetMin)}–{formatCurrency(job.budgetMax)}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-2xl border border-surface-border bg-surface-card p-6 text-center shadow-card">
                <p className="text-sm font-medium text-ink-500">Match Confidence</p>
                <p className="mt-1 text-4xl font-extrabold text-brand-600">96%</p>
                <p className="mt-2 text-xs text-ink-400">Average recommendation accuracy for active freelancers</p>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* CATEGORIES */}
      {topCategories.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="mb-6 flex items-end justify-between">
            <h2 className="text-2xl font-extrabold text-ink-900">Browse by Category</h2>
            <button onClick={() => navigate(ROUTES.CATEGORIES)} className="text-sm font-semibold text-brand-600 hover:underline">
              View All Categories →
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {topCategories.map((cat) => {
              const isActive = category === cat.slug;
              return (
                <button
                  key={cat.slug}
                  onClick={() => scrollToResults(isActive ? undefined : cat.slug)}
                  className={cn(
                    "rounded-xl border p-3 text-center text-xs font-semibold transition-all hover:-translate-y-0.5",
                    isActive ? "border-brand-500 bg-brand-50 text-brand-700" : "border-surface-border bg-surface-card text-ink-700 hover:border-brand-300"
                  )}
                >
                  {cat.label}
                  <div className="mt-1 text-[10px] font-normal text-ink-400">{cat.jobCount} job{cat.jobCount === 1 ? "" : "s"}</div>
                </button>
              );
            })}
          </div>
        </section>
      )}

      {/* JOB RESULTS (Latest + Featured, live from MongoDB) */}
      <section id="job-results" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-14">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-extrabold text-ink-900">
              {search || category ? "Search Results" : "Latest Jobs"}
            </h2>
            <p className="mt-1 text-sm text-ink-500">
              {jobsData ? `${jobsData.total} open job${jobsData.total === 1 ? "" : "s"}` : "Fresh postings from real Nexora clients"}
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {category && (
              <button onClick={() => setCategory(null)} className="flex items-center gap-1 rounded-full bg-brand-50 px-3 py-1.5 text-xs font-semibold text-brand-700">
                {categoriesData?.find((c) => c.slug === category)?.label} <X className="h-3 w-3" />
              </button>
            )}
            <Select value={sortBy} onChange={(e) => setSortBy(e.target.value as typeof sortBy)} className="!h-10 w-44">
              <option value="newest">Newest</option>
              <option value="budgetHigh">Budget: High to Low</option>
              <option value="budgetLow">Budget: Low to High</option>
            </Select>
          </div>
        </div>

        {loadingJobs ? (
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        ) : jobs.length === 0 ? (
          <EmptyState
            icon={Search}
            title="No jobs match your search"
            description="Try a different keyword, clear the category filter, or check back soon for new postings."
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
            {jobs.map((job) => (
              <button
                key={job.id}
                onClick={() => handleViewJob(job.id)}
                className="group flex flex-col rounded-2xl border border-surface-border bg-surface-card p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-pop"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-bold text-ink-900 group-hover:text-brand-600">{job.title}</p>
                  {(job.featured || job.urgent) && (
                    <Badge tone={job.urgent ? "danger" : "brand"}>{job.urgent ? "Urgent" : "Featured"}</Badge>
                  )}
                </div>
                <p className="mt-1.5 line-clamp-2 text-xs text-ink-500">{job.description}</p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {job.skills.slice(0, 3).map((tag) => (
                    <span key={tag} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-600">{tag}</span>
                  ))}
                </div>
                <div className="mt-4 flex items-center justify-between text-sm">
                  <span className="font-bold text-ink-900">
                    {formatCurrency(job.budgetMin)}–{formatCurrency(job.budgetMax)}
                    {job.priceType === "hourly" && <span className="font-normal text-ink-400">/hr</span>}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-ink-400">
                    <Clock className="h-3 w-3" /> {job.createdAt ? formatRelativeTime(job.createdAt) : ""}
                  </span>
                </div>
                {job.location && (
                  <div className="mt-2 flex items-center gap-1 text-xs text-ink-400">
                    <MapPin className="h-3 w-3" /> {job.location}
                  </div>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      {/* HOW NEXORA WORKS */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">How Nexora Works</h2>
          <p className="mt-2 text-ink-500">From profile to payout in four steps.</p>
        </div>
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step, idx) => (
            <div key={step.title} className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <span className="flex h-9 w-9 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">{idx + 1}</span>
              <p className="mt-4 font-semibold text-ink-900">{step.title}</p>
              <p className="mt-1.5 text-sm text-ink-500">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FREELANCER SUCCESS STORIES */}
      {successStories && successStories.length > 0 && (
        <section className="mx-auto max-w-7xl px-6 py-14">
          <h2 className="mb-10 text-center text-3xl font-extrabold text-ink-900">Freelancer Success Stories</h2>
          <div className="grid gap-5 sm:grid-cols-3">
            {successStories.map((t) => (
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
                    <div className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-100 text-xs font-bold text-brand-700">{t.reviewer.fullName.charAt(0)}</div>
                  )}
                  <div>
                    <p className="text-sm font-bold text-ink-900">{t.reviewer.fullName}</p>
                    <p className="text-xs text-ink-400">worked with {t.reviewee.fullName}</p>
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
          <h2 className="text-3xl font-extrabold sm:text-4xl">Ready to start earning?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Create your free profile and get matched with clients looking for exactly what you do.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-brand-700 hover:bg-white/90 font-bold"
              icon={<Award className="h-4 w-4" />}
              onClick={() => (isFreelancer ? navigate(ROUTES.FREELANCER_DASHBOARD) : openModal("signup"))}
            >
              {isFreelancer ? "Go to Dashboard" : "Create Free Profile"}
            </Button>
            <Button
              size="lg"
              className="border-2 border-white bg-transparent text-white hover:bg-white/10 font-bold"
              onClick={() => scrollToResults()}
            >
              Browse All Jobs
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
        defaultRole="freelancer"
      />
    </div>
  );
}
