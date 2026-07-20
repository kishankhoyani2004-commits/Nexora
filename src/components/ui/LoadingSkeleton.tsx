import { cn } from "@/utils/cn";

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-surface-muted", className)} />;
}

export function CardSkeleton() {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-6">
      <Skeleton className="mb-4 h-10 w-10 rounded-xl" />
      <Skeleton className="mb-2 h-4 w-24" />
      <Skeleton className="h-7 w-16" />
    </div>
  );
}
