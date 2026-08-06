import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Check, X, Clock, ChevronDown, Sparkles, ArrowRight } from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { Button } from "@/components/ui/Button";
import { LoginModal } from "@/components/auth/LoginModal";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/utils/cn";

const PLANS = [
  {
    name: "Free",
    price: "$0",
    period: "/forever",
    description: "Everything you need to hire or start freelancing today.",
    features: [
      "Unlimited job posting & browsing",
      "AI job & talent matching",
      "Secure escrow payments",
      "Built-in messaging & workspace",
      "Standard support",
    ],
    cta: "Get Started Free",
    available: true,
    highlighted: false,
  },
  {
    name: "Professional",
    price: "$49",
    period: "/month",
    description: "For growing teams that need consistent, priority hiring power.",
    features: [
      "Everything in Free",
      "Full AI proposal & job-description suite",
      "Featured listings in search results",
      "Priority support with faster SLA",
      "Advanced hiring analytics",
    ],
    cta: "Coming Soon",
    available: false,
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "Bespoke workflows and support for large-scale operations.",
    features: [
      "Everything in Professional",
      "Dedicated account manager",
      "API & systems integration",
      "Custom vetting workflows",
      "SLA-backed enterprise support",
    ],
    cta: "Coming Soon",
    available: false,
    highlighted: false,
  },
];

const COMPARISON_ROWS: { label: string; free: boolean | string; pro: boolean | string; enterprise: boolean | string }[] = [
  { label: "Job posting & browsing", free: true, pro: true, enterprise: true },
  { label: "AI job & talent matching", free: true, pro: true, enterprise: true },
  { label: "Secure escrow payments", free: true, pro: true, enterprise: true },
  { label: "Built-in workspace & messaging", free: true, pro: true, enterprise: true },
  { label: "Featured search listings", free: false, pro: true, enterprise: true },
  { label: "Advanced hiring analytics", free: false, pro: true, enterprise: true },
  { label: "Priority support SLA", free: false, pro: true, enterprise: true },
  { label: "Dedicated account manager", free: false, pro: false, enterprise: true },
  { label: "API & systems integration", free: false, pro: false, enterprise: true },
  { label: "Custom vetting workflows", free: false, pro: false, enterprise: true },
];

const FAQS = [
  { q: "Is the Free plan really free forever?", a: "Yes — posting jobs, browsing talent, AI matching, escrow-protected payments, and the built-in workspace are all free with no time limit. Nexora only ever charges a small service fee on completed contracts, never a subscription for the Free tier." },
  { q: "When will Professional and Enterprise launch?", a: "They're in active development. Everyone on the Free plan will get an in-app notice and early-access invite the moment they open — there's no waitlist to join separately." },
  { q: "Will upgrading change how my existing jobs or contracts work?", a: "No — Professional and Enterprise add extra capabilities on top of the same core hiring and payment flow. Nothing about how escrow, messaging, or contracts work will change." },
  { q: "What's the service fee on the Free plan?", a: "Freelancers pay a sliding-scale fee per client (20% on the first $500, 10% up to $10,000, 5% beyond that). Clients pay a small payment-processing fee shown transparently at checkout — never a hidden charge." },
];

export default function Pricing() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [openFaq, setOpenFaq] = useState<number | null>(0);

  const handleFreeCta = () => {
    if (isAuthenticated) navigate(ROUTES.HOME);
    else setShowLoginModal(true);
  };

  return (
    <div className="min-h-screen bg-surface-app">
      <PublicNavbar />

      {/* HERO */}
      <section className="mx-auto max-w-7xl px-6 pb-14 pt-16 text-center lg:pt-24">
        <h1 className="mx-auto max-w-2xl text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl">
          Simple pricing,{" "}
          <span className="bg-gradient-to-r from-brand-500 to-brand-secondary bg-clip-text text-transparent">
            built to grow with you
          </span>
        </h1>
        <p className="mx-auto mt-5 max-w-lg text-base text-ink-500">
          Start free with everything you need to hire and get hired. Professional and Enterprise
          tiers are on the way for teams that want more.
        </p>
      </section>

      {/* PLANS */}
      <section className="mx-auto max-w-7xl px-6 pb-14">
        <div className="grid gap-6 lg:grid-cols-3">
          {PLANS.map((plan) => (
            <div
              key={plan.name}
              className={cn(
                "relative rounded-3xl border p-8",
                plan.highlighted
                  ? "border-brand-600 bg-zinc-900 text-white shadow-pop"
                  : "border-surface-border bg-surface-card shadow-card"
              )}
            >
              {!plan.available && (
                <span className="absolute -top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-brand-500 px-3 py-1 text-xs font-bold text-white">
                  <Clock className="h-3 w-3" /> COMING SOON
                </span>
              )}
              <h3 className={cn("font-bold", plan.highlighted ? "text-white" : "text-ink-900")}>{plan.name}</h3>
              <p className="mt-3 text-4xl font-extrabold">
                {plan.price}
                <span className="text-base font-medium opacity-60">{plan.period}</span>
              </p>
              <p className={cn("mt-2 text-sm", plan.highlighted ? "text-white/70" : "text-ink-500")}>{plan.description}</p>
              <ul className="mt-6 space-y-2.5">
                {plan.features.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-sm">
                    <Check className={cn("h-4 w-4 shrink-0", plan.highlighted ? "text-brand-400" : "text-brand-600")} /> {f}
                  </li>
                ))}
              </ul>
              <Button
                fullWidth
                className="mt-8"
                variant={plan.highlighted ? "primary" : plan.available ? "primary" : "outline"}
                disabled={!plan.available}
                onClick={plan.available ? handleFreeCta : undefined}
              >
                {plan.cta}
              </Button>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURE COMPARISON */}
      <section className="mx-auto max-w-7xl px-6 py-14">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">Compare Plans</h2>
          <p className="mt-2 text-ink-500">A full breakdown of what's included at every tier.</p>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-surface-border bg-surface-card shadow-card">
          <table className="w-full min-w-[560px] text-left text-sm">
            <thead>
              <tr className="border-b border-surface-border">
                <th className="px-6 py-4 font-semibold text-ink-500">Feature</th>
                <th className="px-6 py-4 text-center font-bold text-ink-900">Free</th>
                <th className="px-6 py-4 text-center font-bold text-ink-900">Professional</th>
                <th className="px-6 py-4 text-center font-bold text-ink-900">Enterprise</th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON_ROWS.map((row, idx) => (
                <tr key={row.label} className={idx % 2 === 1 ? "bg-surface-muted/40" : ""}>
                  <td className="px-6 py-3.5 text-ink-700">{row.label}</td>
                  {[row.free, row.pro, row.enterprise].map((val, i) => (
                    <td key={i} className="px-6 py-3.5 text-center">
                      {val === true ? (
                        <Check className="mx-auto h-4 w-4 text-success" />
                      ) : val === false ? (
                        <X className="mx-auto h-4 w-4 text-ink-300" />
                      ) : (
                        <span className="text-xs text-ink-400">{val}</span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* FAQ */}
      <section className="mx-auto max-w-4xl px-6 py-14">
        <div className="mb-10 text-center">
          <h2 className="text-3xl font-extrabold text-ink-900">Pricing FAQ</h2>
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
          <h2 className="text-3xl font-extrabold sm:text-4xl">Start free — no credit card needed</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Join Nexora today and get access to every core feature at no cost, for as long as you need.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-brand-700 hover:bg-white/90 font-bold"
              icon={<Sparkles className="h-4 w-4" />}
              onClick={handleFreeCta}
            >
              Get Started Free
            </Button>
            <Button
              size="lg"
              className="border-2 border-white bg-transparent text-white hover:bg-white/10 font-bold"
              icon={<ArrowRight className="h-4 w-4" />}
              onClick={() => navigate(ROUTES.FIND_TALENT)}
            >
              Explore the Platform
            </Button>
          </div>
        </div>
      </section>

      <Footer />
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        defaultTab="signup"
      />
    </div>
  );
}
