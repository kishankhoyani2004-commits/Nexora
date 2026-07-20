import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { LoginModal } from "@/components/auth/LoginModal";
import {
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Workflow,
  Layers,
  Zap,
  Code2,
  BarChart3,
  Palette,
  Video,
  PenTool,
  Star,
  Check,
  ChevronDown,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import HeroDashboard from "@/components/landing/HeroDashboard";
import {
  SiReact,
  SiTypescript,
  SiTailwindcss,
  SiNodedotjs,
  SiExpress,
  SiMongodb,
} from "react-icons/si";

const STATS = [
  { value: "500+", label: "Professionals" },
  { value: "120+", label: "Projects Completed" },
  { value: "50+", label: "Active Clients" },
  { value: "24/7", label: "AI Assistance" },
];

const TRUSTED_BY = [
  { name: "React", icon: SiReact },
  { name: "TypeScript", icon: SiTypescript },
  { name: "Tailwind CSS", icon: SiTailwindcss },
  { name: "Node.js", icon: SiNodedotjs },
  { name: "Express", icon: SiExpress },
  { name: "MongoDB", icon: SiMongodb },
];

const FAQS = [
  {
    q: "How does Nexora's AI matching actually work?",
    a: "Our engine analyzes skills, past project outcomes, communication style, and budget history to score compatibility between a job post and every eligible freelancer — surfacing only the top-fit candidates instead of a flat list of applicants.",
  },
  {
    q: "Is my payment protected if a freelancer doesn't deliver?",
    a: "Yes. All fixed-price and milestone-based work is held in escrow until you approve the deliverable, and our resolution team steps in for any disputed release.",
  },
  {
    q: "Can I switch between hiring and freelancing on the same account?",
    a: "Absolutely — many members do both. You can enable a Freelancer profile from Settings at any time without losing your Client history.",
  },
  {
    q: "What does the Professional plan actually unlock?",
    a: "Unlimited job postings, the full AI proposal and job-description suite, priority placement in search results, and dedicated support with a faster response SLA.",
  },
];

const CATEGORIES = [
  { label: "Web Development", icon: Code2, count: "2,500+" },
  { label: "AI & ML", icon: Sparkles, count: "1,200+" },
  { label: "Data Science", icon: BarChart3, count: "950+" },
  { label: "Cyber Security", icon: ShieldCheck, count: "800+" },
  { label: "UI/UX Design", icon: Palette, count: "1,400+" },
  { label: "Graphic Design", icon: Layers, count: "2,000+" },
  { label: "Video Editing", icon: Video, count: "1,100+" },
  { label: "Content Writing", icon: PenTool, count: "1,600+" },
];

const PROCESS_STEPS = [
  { title: "Register", description: "Create your profile and tell us about your company or freelance expertise." },
  { title: "Post a Job", description: "Use our AI assistant to generate a high-converting brief in seconds." },
  { title: "Hire", description: "Review smart-matched proposals and hand-pick the perfect fit for the role." },
  { title: "Collaborate", description: "Use integrated tools for messaging, files, and progress tracking." },
  { title: "Complete", description: "Approve milestones and release automated, secure payments." },
  { title: "Review", description: "Leave feedback to help strengthen the quality of the marketplace." },
];

const TALENT = [
  { name: "Sarah Jenkins", title: "Senior UI/UX Designer", tags: ["Figma", "Adobe XD"], rate: "$45/hr", rating: "4.9 (128 reviews)", img: "https://i.pravatar.cc/200?img=47" },
  { name: "Marcus Thorne", title: "Full Stack Developer", tags: ["React", "Node.js"], rate: "$60/hr", rating: "4.8 (96 reviews)", img: "https://i.pravatar.cc/200?img=14" },
  { name: "Elena Rodriguez", title: "Data Scientist & ML Engineer", tags: ["Python", "TensorFlow"], rate: "$70/hr", rating: "5.0 (142 reviews)", img: "https://i.pravatar.cc/200?img=32" },
];

const PLANS = [
  {
    name: "Starter",
    price: "$0",
    period: "/month",
    description: "Perfect for individuals and small off-project needs.",
    features: ["Standard Job Posting", "AI Job Match", "Secure Escrow"],
    cta: "Coming Soon",
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$49",
    period: "/month",
    description: "For growing companies needing consistent premium talent.",
    features: ["Unlimited Job Postings", "Full AI Proposal Suite", "Priority Talent Support", "Featured Listings"],
    cta: "Coming Soon",
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Bespoke solutions for large-scale operations.",
    features: ["Dedicated Account Manager", "API & Systems Integration", "Custom Vetting Workflows"],
    cta: "Coming Soon",
    highlighted: false,
  },
];

const TESTIMONIALS = [
  {
    quote: "Find the most suitable freelancers using AI-powered skill matching and smart recommendations.",
    name: "AI Talent Matching",
    title: "Smart Recruitment",
  },
  {
    quote: "Collaborate through real-time messaging, file sharing, milestone tracking, and project management.",
    name: "Project Collaboration",
    title: "Built-in Workspace",
  },
  {
    quote: "Verified freelancer profiles, transparent workflows, and secure project management from start to finish.",
    name: "Secure & Reliable",
    title: "Trusted Platform",
  },
];

export default function Landing() {
  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [modalTab, setModalTab] = useState<"signin" | "signup">("signin");
  const { isAuthenticated } = useAuth();

  const openModal = (tab: "signin" | "signup" = "signin") => {
    setModalTab(tab);
    setShowLoginModal(true);
  };

  useEffect(() => {
    // Only auto-show the modal for visitors who are not logged in
    if (!isAuthenticated) {
      setShowLoginModal(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="min-h-screen bg-surface-app">
      <PublicNavbar onLoginClick={() => openModal("signin")} />

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-16 lg:pt-24">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1.5 text-xs font-bold text-brand-700">
              <Sparkles className="h-3.5 w-3.5" /> Non-Human Talent Acquisition
            </span>
            <h1 className="mt-5 text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl">
              Hire Top Freelancers <br /> Powered by{" "}
              <span className="bg-gradient-to-r from-brand-500 to-brand-secondary bg-clip-text text-transparent">
                Artificial Intelligence
              </span>
            </h1>
            <p className="mt-5 max-w-lg text-base text-ink-500">
              Find world-class freelancers, generate AI-powered job descriptions, receive smart
              proposals, and manage projects from one intelligent platform.
            </p>
            <div className="mt-8 flex flex-wrap items-center gap-4">
              <Button
                size="lg"
                icon={<ArrowRight className="h-4 w-4" />}
                onClick={() => openModal("signup")}
              >
                Hire Talent
              </Button>
              <Button size="lg" variant="outline" onClick={() => openModal("signup")}>
                Become a Freelancer
              </Button>
            </div>
            <div className="mt-8 flex items-center gap-3">
              <div className="flex -space-x-2">
                {[12, 47, 32].map((id) => (
                  <img
                    key={id}
                    src={`https://i.pravatar.cc/60?img=${id}`}
                    alt=""
                    className="h-9 w-9 rounded-full ring-2 ring-surface-app"
                  />
                ))}
              </div>
              <p className="text-sm text-ink-500">
                <span className="font-bold text-ink-900">500+</span> professionals on the platform
              </p>
            </div>
          </div>
          <div className="relative">
            <div className="rounded-3xl border border-surface-border bg-surface-card p-3 shadow-pop">
              <HeroDashboard
              />
            </div>
          </div>
        </div>

        <div className="mt-16 border-y border-surface-border py-6">
          <p className="mb-4 text-center text-xs font-semibold uppercase tracking-wide text-ink-400">
            BUILT WITH MODERN TECHNOLOGIES
          </p>
          <div className="flex flex-wrap items-center justify-center gap-x-10 gap-y-3">
         {TRUSTED_BY.map(({ name, icon: Icon }) => (
  <div
    key={name}
    className="group flex items-center gap-2 text-gray-400 transition-all duration-300 hover:scale-110 hover:text-primary"
  >
    <Icon className="h-6 w-6 transition-transform duration-300 group-hover:rotate-6" />
    <span className="text-lg font-extrabold tracking-tight">
      {name}
    </span>
  </div>
))}
          </div>
        </div>

        <div className="mt-14 grid grid-cols-2 gap-4 sm:grid-cols-4">
          {STATS.map((stat) => (
            <div key={stat.label} className="rounded-2xl border border-surface-border bg-surface-card p-6 text-center shadow-card">
              <p className="text-2xl font-extrabold text-brand-600 sm:text-3xl">{stat.value}</p>
              <p className="mt-1 text-xs font-medium uppercase tracking-wide text-ink-400">{stat.label}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CATEGORIES */}
      <section id="categories" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">Explore Specialized Categories</h2>
          <p className="mt-2 text-ink-500">Access a curated network of professionals across specialized disciplines.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
          {CATEGORIES.map((cat) => (
            <div
              key={cat.label}
              className="group relative flex h-32 cursor-pointer flex-col justify-end overflow-hidden rounded-2xl bg-brand-600 p-4 text-white transition-all duration-300 hover:-translate-y-2 hover:bg-brand-500 hover:shadow-2xl">
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 dark:opacity-100 dark:from-zinc-900 dark:via-zinc-900/40" />
              <cat.icon className="absolute right-4 top-4 h-6 w-6 text-primary transition-all duration-300 group-hover:scale-125 group-hover:rotate-12" />
              <div className="relative">
  <span className="block text-base font-bold group-hover:text-primary transition-colors">{cat.label}</span>
  <span className="mt-1 block text-xs text-zinc-400 dark:text-zinc-500">
    {cat.count} Professionals
  </span>
</div>
            </div>
          ))}
        </div>
      </section>

      {/* ORCHESTRATE */}
      <section className="mx-auto max-w-7xl px-6 py-10">
        <div className="grid items-center gap-10 rounded-3xl bg-brand-50 p-10 dark:bg-surface-card lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-surface-card px-3 py-1 text-xs font-bold text-brand-700">
              <Workflow className="h-3.5 w-3.5" /> Workflow Orchestration
            </span>
            <h2 className="mt-4 text-3xl font-extrabold text-ink-900">Orchestrate Complexity with AI</h2>
            <p className="mt-3 text-ink-500">
              From brief to delivery, our engine manages the heavy lifting — automate milestone
              tracking, quality assurance, and payment triggers in one seamless flow.
            </p>
            <ul className="mt-5 space-y-2.5">
              {["Automated Milestone Generation", "Real-time Progress Syncing", "AI-Assisted Quality Vetting"].map(
                (item) => (
                  <li key={item} className="flex items-center gap-2.5 text-sm font-medium text-ink-700">
                    <Check className="h-4 w-4 rounded-full bg-brand-600 p-0.5 text-white" />
                    {item}
                  </li>
                )
              )}
            </ul>
          </div>
          <img
            src="https://images.unsplash.com/photo-1531482615713-2afd69097998?w=800&q=80"
            alt="Orchestration illustration"
            className="aspect-video w-full rounded-2xl object-cover shadow-card"
          />
        </div>
      </section>

      {/* MATCHING */}
      <section className="mx-auto grid max-w-7xl gap-8 px-6 py-16 lg:grid-cols-2">
        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
          <p className="text-sm font-medium text-ink-500">Match Confidence</p>
          <p className="mt-1 text-4xl font-extrabold text-brand-600">98.4%</p>
          <div className="mt-5 space-y-3">
            {[
              { label: "Skill Coverage", value: 96 },
              { label: "Historical Velocity", value: 89 },
              { label: "AI Sentiment Analysis", value: 94 },
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
        <div>
          <span className="inline-flex items-center gap-1.5 rounded-full bg-brand-100 px-3 py-1 text-xs font-bold text-brand-700">
            <Zap className="h-3.5 w-3.5" /> Smart Matching
          </span>
          <h2 className="mt-4 text-2xl font-extrabold text-ink-900">Beyond Keywords: Finding the Perfect Fit</h2>
          <p className="mt-3 text-ink-500">
            Our proprietary matching engine analyzes millions of data points to find the perfect
            cultural and technical fit for your specific project needs.
          </p>
        </div>
      </section>

      {/* FEATURED TALENT */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-8 flex items-end justify-between">
          <h2 className="text-3xl font-extrabold text-ink-900">Featured Premium Talent</h2>
            <button className="text-sm font-semibold text-brand-600 hover:underline">
              View All Talent →
              </button>
        </div>
        <div className="grid gap-5 sm:grid-cols-3">
          {TALENT.map((person) => (
            <div key={person.name} className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
              <div className="flex items-center gap-3">
                <img src={person.img} alt={person.name} className="h-14 w-14 rounded-full object-cover" />
                <div>
                  <p className="font-bold text-ink-900">{person.name}</p>
                  <p className="text-sm text-ink-500">{person.title}</p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {person.tags.map((tag) => (
                  <span key={tag} className="rounded-full bg-surface-muted px-2.5 py-1 text-xs font-medium text-ink-600">
                    {tag}
                  </span>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between text-sm">
                <span className="font-bold text-ink-900">{person.rate}</span>
                <span className="flex items-center gap-1 text-ink-500">
                  <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" /> {person.rating}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PROCESS */}
      <section id="process" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">Streamlined Process</h2>
          <p className="mt-2 text-ink-500">From launch to completion in six simple steps.</p>
        </div>
        <div className="grid grid-cols-2 gap-6 sm:grid-cols-3">
          {PROCESS_STEPS.map((step, idx) => (
            <div key={step.title} className="flex gap-3">
              <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-brand-600 text-sm font-bold text-white">
                {idx + 1}
              </span>
              <div>
                <p className="font-semibold text-ink-900">{step.title}</p>
                <p className="mt-0.5 text-sm text-ink-500">{step.description}</p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section id="pricing" className="mx-auto max-w-7xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">Future Premium Plans</h2>
          <p className="mt-2 text-ink-500">Planned subscription plans for future versions of Nexora.</p>
        </div>
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={`relative rounded-3xl border p-8 ${
                plan.highlighted
                  ? "border-brand-600 bg-zinc-900 text-white shadow-pop"
                  : "border-surface-border bg-surface-card shadow-card"
              }`}
            >
              {plan.highlighted && (
                <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">
                  COMING SOON
                </span>
              )}
              <h3 className={`font-bold ${plan.highlighted ? "text-white" : "text-ink-900"}`}>{plan.name}</h3>
              <p className="mt-3 text-4xl font-extrabold">
                {plan.price}
                <span className="text-base font-medium opacity-60">{plan.period}</span>
              </p>
              <p className={`mt-2 text-sm ${plan.highlighted ? "text-white/70" : "text-ink-500"}`}>{plan.description}</p>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className="h-4 w-4 text-brand-400" /> {f}
                  </li>
                ))}
              </ul>
              <Button
                fullWidth
                className="mt-8"
                variant={plan.highlighted ? "primary" : "outline"}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* TESTIMONIALS */}
      <section className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="mb-10 text-center text-3xl font-extrabold text-ink-900">What Our Clients Say</h2>
        <div className="grid gap-5 sm:grid-cols-3">
          {TESTIMONIALS.map((t) => (
            <div key={t.name} className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
              <p className="text-sm italic text-ink-700">"{t.quote}"</p>
              <p className="mt-4 text-sm font-bold text-ink-900">{t.name}</p>
              <p className="text-xs text-ink-400">{t.title}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-6 py-16">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">Frequently Asked Questions</h2>
          <p className="mt-2 text-ink-500">Everything you need to know before getting started.</p>
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
                  <ChevronDown className={`h-5 w-5 shrink-0 text-ink-400 transition-transform ${isOpen ? "rotate-180" : ""}`} />
                </button>
                {isOpen && <p className="px-6 pb-5 text-sm leading-relaxed text-ink-500">{faq.a}</p>}
              </div>
            );
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-16">
        <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-secondary px-10 py-14 text-center text-white">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Ready to build the future?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Join thousands of businesses hiring world-class freelancers through Nexora's AI platform.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-brand-700 hover:bg-white/90"
              onClick={() => openModal("signup")}
            >
              Get Started
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <LoginModal isOpen={showLoginModal} onClose={() => setShowLoginModal(false)} defaultTab={modalTab} />
    </div>
  );
}
