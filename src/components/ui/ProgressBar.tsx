import { cn } from "@/utils/cn";

export function ProgressBar({
  value,
  className,
  trackClassName,
  barClassName,
}: {
  value: number;
  className?: string;
  trackClassName?: string;
  barClassName?: string;
}) {
  return (
    <div className={cn("h-2 w-full overflow-hidden rounded-full bg-surface-muted", trackClassName, className)}>
      <div
        className={cn("h-full rounded-full bg-brand-600 transition-all duration-500", barClassName)}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
