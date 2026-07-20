import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

interface StatCardProps {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  tone?: "brand" | "success" | "warning" | "danger" | "info";
}

const toneStyles = {
  brand: "bg-brand-100 text-brand-600",
  success: "bg-emerald-100 text-emerald-600",
  warning: "bg-amber-100 text-amber-600",
  danger: "bg-red-100 text-red-600",
  info: "bg-sky-100 text-sky-600",
};

export function StatCard({ label, value, delta, icon: Icon, tone = "brand" }: StatCardProps) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
      <div className="mb-8 flex items-start justify-between">
        <span className={cn("flex h-10 w-10 items-center justify-center rounded-xl", toneStyles[tone])}>
          <Icon className="h-5 w-5" />
        </span>
        {delta && (
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-600">
            {delta}
          </span>
        )}
      </div>
      <p className="text-sm text-ink-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-ink-900">{value}</p>
    </div>
  );
}
