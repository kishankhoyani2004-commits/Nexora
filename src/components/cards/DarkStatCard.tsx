import type { LucideIcon } from "lucide-react";
import { cn } from "@/utils/cn";

export function DarkStatCard({
  label,
  value,
  delta,
  icon: Icon,
  note,
}: {
  label: string;
  value: string;
  delta?: string;
  icon: LucideIcon;
  note?: string;
}) {
  return (
    <div className="rounded-2xl border border-dark-border bg-dark-surface p-5">
      <div className="mb-6 flex items-center justify-between">
        <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-surface-2 text-brand-400">
          <Icon className="h-5 w-5" />
        </span>
        {delta && (
          <span className={cn("text-xs font-semibold", delta.startsWith("-") ? "text-danger" : "text-emerald-400")}>
            {delta}
          </span>
        )}
      </div>
      <p className="text-xs uppercase tracking-wide text-dark-text-dim">{label}</p>
      <p className="mt-1 text-2xl font-extrabold text-white">{value}</p>
      {note && <p className="mt-1 text-xs text-dark-text-dim">{note}</p>}
    </div>
  );
}
