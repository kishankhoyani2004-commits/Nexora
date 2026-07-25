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
  brand: "bg-brand-50 text-brand-600 border-brand-100 dark:bg-brand-950/30 dark:text-brand-400 dark:border-brand-900/50",
  success: "bg-emerald-50 text-emerald-600 border-emerald-100 dark:bg-emerald-950/30 dark:text-emerald-400 dark:border-emerald-900/50",
  warning: "bg-amber-50 text-amber-600 border-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:border-amber-900/50",
  danger: "bg-red-50 text-red-600 border-red-100 dark:bg-red-950/30 dark:text-red-400 dark:border-red-900/50",
  info: "bg-sky-50 text-sky-600 border-sky-100 dark:bg-sky-950/30 dark:text-sky-400 dark:border-sky-900/50",
};

export function StatCard({ label, value, delta, icon: Icon, tone = "brand" }: StatCardProps) {
  return (
    <div className="group flex flex-col justify-between h-full w-full rounded-2xl border border-surface-border bg-surface-card p-5 shadow-sm hover:shadow-md hover:border-brand-300 dark:hover:border-brand-800 transition-all duration-300">
      <div>
        {/* Icon in top row */}
        <div className="mb-4 flex items-center justify-between">
          <span className={cn(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border shadow-sm transition-transform duration-300 group-hover:scale-105",
            toneStyles[tone]
          )}>
            <Icon className="h-5.5 w-5.5 stroke-[1.75]" />
          </span>
        </div>

        {/* Delta badge in its own line below the icon */}
        <div className="mb-3.5 min-h-[24px] flex items-center">
          {delta ? (
            <span className="whitespace-nowrap rounded-full bg-emerald-50 dark:bg-emerald-950/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30">
              {delta}
            </span>
          ) : (
            <span className="opacity-0 select-none whitespace-nowrap rounded-full px-2.5 py-0.5 text-[11px] font-bold">
              &nbsp;
            </span>
          )}
        </div>

        <p className="text-xs font-bold text-ink-400 uppercase tracking-wider">{label}</p>
      </div>
      <p className="mt-3 text-3xl font-black text-ink-900 tracking-tight leading-none truncate">{value}</p>
    </div>
  );
}
