import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import {
  Search, LayoutGrid, TrendingUp, Briefcase, Users, ArrowRight,
  Code2, Smartphone, Sparkles, BarChart3, Palette, Layers, PenTool, Cloud,
  ShieldCheck, Link2, DollarSign, Headset,
} from "lucide-react";
import { PublicNavbar } from "@/components/layout/PublicNavbar";
import { Footer } from "@/components/layout/Footer";
import { EmptyState } from "@/components/ui/EmptyState";
import { CardSkeleton } from "@/components/ui/LoadingSkeleton";
import { Button } from "@/components/ui/Button";
import { ROUTES } from "@/constants/routes";
import { publicService } from "@/services/public.service";
import { cn } from "@/utils/cn";

const CATEGORY_ICONS: Record<string, React.ComponentType<{ className?: string }>> = {
  Code2, Smartphone, Sparkles, BarChart3, Palette, Layers, PenTool, Cloud,
  ShieldCheck, Link2, DollarSign, Headset,
};

export default function Categories() {
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: categories, isLoading } = useQuery({
    queryKey: ["public", "categories"],
    queryFn: async () => (await publicService.listCategories()).data.data,
    staleTime: 5 * 60_000,
  });

  const filtered = useMemo(() => {
    if (!categories) return [];
    if (!search.trim()) return categories;
    const q = search.trim().toLowerCase();
    return categories.filter((c) => c.label.toLowerCase().includes(q));
  }, [categories, search]);

  const mostInDemand = useMemo(
    () => [...(categories ?? [])].sort((a, b) => b.jobCount - a.jobCount).slice(0, 4),
    [categories]
  );

  const totalJobs = useMemo(() => (categories ?? []).reduce((sum, c) => sum + c.jobCount, 0), [categories]);
  const totalFreelancers = useMemo(() => (categories ?? []).reduce((sum, c) => sum + c.freelancerCount, 0), [categories]);

  const goToCategory = (slug: string) => navigate(`${ROUTES.FIND_WORK}?category=${slug}`);

  return (
    <div className="min-h-screen bg-surface-app">
      <PublicNavbar />

      {/* HERO + SEARCH */}
      <section className="mx-auto max-w-7xl px-6 pb-14 pt-16 lg:pt-24">
        <div className="mx-auto max-w-3xl text-center">
          <h1 className="text-4xl font-extrabold leading-[1.08] tracking-tight text-ink-900 sm:text-5xl">
            Explore Work by{" "}
            <span className="bg-gradient-to-r from-brand-500 to-brand-secondary bg-clip-text text-transparent">
              Specialty
            </span>
          </h1>
          <p className="mx-auto mt-5 max-w-lg text-base text-ink-500">
            {totalJobs > 0
              ? `Browse ${totalJobs.toLocaleString()}+ open jobs and ${totalFreelancers.toLocaleString()}+ freelancers across every discipline on Nexora.`
              : "Browse open jobs and freelancers across every discipline on Nexora."}
          </p>
          <div className="mx-auto mt-8 max-w-xl">
            <div className="relative">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search categories…"
                className="h-12 w-full rounded-xl border border-surface-border bg-surface-card pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-400 shadow-card focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
          </div>
        </div>
      </section>

      {isLoading ? (
        <section className="mx-auto max-w-7xl px-6 py-10">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {Array.from({ length: 8 }).map((_, i) => <CardSkeleton key={i} />)}
          </div>
        </section>
      ) : !categories || categories.length === 0 ? (
        <section className="mx-auto max-w-7xl px-6 py-10">
          <EmptyState icon={LayoutGrid} title="No categories available yet" description="Check back once jobs start getting posted." />
        </section>
      ) : (
        <>
          {/* MOST IN-DEMAND CATEGORIES */}
          {!search && mostInDemand.length > 0 && (
            <section className="mx-auto max-w-7xl px-6 py-10">
              <div className="mb-6 flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-brand-600" />
                <h2 className="text-2xl font-extrabold text-ink-900">Most In-Demand Categories</h2>
              </div>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {mostInDemand.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.icon] ?? Sparkles;
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => goToCategory(cat.slug)}
                      className="group relative flex h-36 flex-col justify-end overflow-hidden rounded-2xl bg-brand-600 p-5 text-left text-white transition-all duration-300 hover:-translate-y-2 hover:shadow-2xl"
                    >
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/10 to-transparent opacity-70 transition-opacity duration-300 group-hover:opacity-90" />
                      <Icon className="absolute right-4 top-4 h-6 w-6 transition-transform duration-300 group-hover:scale-125 group-hover:rotate-12" />
                      <div className="relative">
                        <span className="block text-lg font-bold">{cat.label}</span>
                        <span className="mt-1 block text-xs text-white/80">
                          {cat.jobCount} open job{cat.jobCount === 1 ? "" : "s"} · {cat.freelancerCount} freelancer{cat.freelancerCount === 1 ? "" : "s"}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </section>
          )}

          {/* ALL CATEGORIES */}
          <section className="mx-auto max-w-7xl px-6 py-10">
            <div className="mb-6 flex items-end justify-between">
              <h2 className="text-2xl font-extrabold text-ink-900">{search ? "Search Results" : "All Categories"}</h2>
              <span className="text-sm text-ink-400">{filtered.length} categor{filtered.length === 1 ? "y" : "ies"}</span>
            </div>

            {filtered.length === 0 ? (
              <EmptyState
                icon={Search}
                title="No categories match your search"
                description="Try a different keyword."
                action={<Button variant="outline" onClick={() => setSearch("")}>Clear Search</Button>}
              />
            ) : (
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {filtered.map((cat) => {
                  const Icon = CATEGORY_ICONS[cat.icon] ?? Sparkles;
                  return (
                    <button
                      key={cat.slug}
                      onClick={() => goToCategory(cat.slug)}
                      className={cn(
                        "group flex items-center gap-4 rounded-2xl border border-surface-border bg-surface-card p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-1 hover:border-brand-300 hover:shadow-pop"
                      )}
                    >
                      <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-brand-50 text-brand-600 transition-colors group-hover:bg-brand-100">
                        <Icon className="h-5.5 w-5.5" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-ink-900">{cat.label}</p>
                        <div className="mt-1 flex items-center gap-3 text-xs text-ink-500">
                          <span className="flex items-center gap-1"><Briefcase className="h-3 w-3" /> {cat.jobCount} job{cat.jobCount === 1 ? "" : "s"}</span>
                          <span className="flex items-center gap-1"><Users className="h-3 w-3" /> {cat.freelancerCount} freelancer{cat.freelancerCount === 1 ? "" : "s"}</span>
                        </div>
                      </div>
                      <ArrowRight className="h-4 w-4 shrink-0 text-ink-300 transition-all duration-200 group-hover:translate-x-0.5 group-hover:text-brand-500" />
                    </button>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {/* CTA */}
      <section className="mx-auto max-w-7xl px-6 pb-16 pt-10">
        <div className="rounded-3xl bg-gradient-to-br from-brand-500 to-brand-secondary px-10 py-14 text-center text-white shadow-2xl">
          <h2 className="text-3xl font-extrabold sm:text-4xl">Don't see your exact niche?</h2>
          <p className="mx-auto mt-3 max-w-xl text-white/80">
            Post a job with your own description and skills — Nexora's search and AI matching work
            across every category, not just the ones listed here.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-4">
            <Button
              size="lg"
              variant="secondary"
              className="bg-white text-brand-700 hover:bg-white/90 font-bold"
              onClick={() => navigate(ROUTES.FIND_TALENT)}
            >
              Find Talent
            </Button>
            <Button
              size="lg"
              className="border-2 border-white bg-transparent text-white hover:bg-white/10 font-bold"
              onClick={() => navigate(ROUTES.FIND_WORK)}
            >
              Find Work
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
