import { useParams, Link } from "react-router-dom";
import { ShieldCheck, MapPin, Clock, Layers, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { FREELANCER_NAV } from "@/constants/nav";
import { formatCurrency } from "@/utils/formatters";
import { useQuery } from "@tanstack/react-query";
import { jobService } from "@/services/job.service";
import { EmptyState } from "@/components/ui/EmptyState";

export default function JobDetails() {
  const { id } = useParams();

  // Load details from MongoDB via React Query
  const { data: response, isLoading } = useQuery({
    queryKey: ["job", id],
    queryFn: async () => {
      const res = await jobService.getById(id!);
      return res.data;
    },
    enabled: !!id,
  });

  const job = response?.data;

  if (isLoading) {
    return (
      <DashboardLayout navItems={FREELANCER_NAV} tagline="Freelance Hub" searchPlaceholder="Search for jobs...">
        <div className="flex h-64 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      </DashboardLayout>
    );
  }

  if (!job) {
    return (
      <DashboardLayout navItems={FREELANCER_NAV} tagline="Freelance Hub" searchPlaceholder="Search for jobs...">
        <EmptyState icon={ShieldCheck} title="Job not found" description="The job briefing you requested does not exist or has been deleted." />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout navItems={FREELANCER_NAV} tagline="Freelance Hub" searchPlaceholder="Search for jobs...">
      <div className="mx-auto grid max-w-5xl gap-6 lg:grid-cols-3">
        <div className="rounded-3xl border border-surface-border bg-surface-card p-8 shadow-card lg:col-span-2">
          <Badge tone="brand" className="mb-3 gap-1.5">
            <ShieldCheck className="h-3.5 w-3.5" /> VERIFIED JOB
          </Badge>
          <h1 className="text-2xl font-extrabold text-ink-900">{job.title}</h1>
          <p className="mt-1 text-sm text-ink-500">{job.client?.fullName || "Client"} · {job.category}</p>
          <div className="mt-4 flex flex-wrap gap-4 text-sm text-ink-500">
            <span className="flex items-center gap-1.5">
              <MapPin className="h-4 w-4" /> Remote (Global)
            </span>
            <span className="flex items-center gap-1.5">
              <Clock className="h-4 w-4" /> {job.duration}
            </span>
            <span className="flex items-center gap-1.5 capitalize">
              <Layers className="h-4 w-4" /> {job.experienceLevel}
            </span>
          </div>

          <div className="my-6 h-px bg-surface-border" />

          <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-ink-400">Project Description</h2>
          <p className="text-sm leading-relaxed text-ink-700">{job.description}</p>

          <h2 className="mb-2 mt-6 text-sm font-bold uppercase tracking-wide text-ink-400">Required Skills</h2>
          <div className="flex flex-wrap gap-2">
            {(job.skills || []).map((skill) => (
              <Badge key={skill} tone="brand">
                {skill}
              </Badge>
            ))}
          </div>
        </div>

        <div className="space-y-5">
          <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
            <p className="text-xs font-bold uppercase tracking-wide text-ink-400">Budget</p>
            <p className="mt-1 text-2xl font-extrabold text-brand-600">
              {job.priceType === "hourly"
                ? `${formatCurrency(job.budgetMin)}/hr`
                : `${formatCurrency(job.budgetMin)} - ${formatCurrency(job.budgetMax)}`}
            </p>
            <p className="mt-4 text-xs text-ink-400">Escrow Protected System</p>
            <div className="mt-6 flex flex-col gap-3">
              <Link to={`/proposals/submit/${job.id}`} className="block w-full">
                <Button fullWidth>
                  Apply Now
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
