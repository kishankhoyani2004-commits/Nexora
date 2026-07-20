import { cn } from "@/utils/cn";

interface LogoProps {
  className?: string;
  dark?: boolean;
  /** When provided the logo becomes a button that fires this handler instead of navigating */
  onClick?: () => void;
}

export function Logo({ className, dark, onClick }: LogoProps) {
  const inner = (
    <>
      <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-600 text-white font-black text-lg">
        X
      </span>
      <span className={cn("text-xl font-extrabold tracking-tight", dark ? "text-white" : "text-ink-900")}>
        Nexora
      </span>
    </>
  );

  if (onClick) {
    return (
      <button
        type="button"
        onClick={onClick}
        className={cn("inline-flex items-center gap-2 shrink-0 cursor-pointer", className)}
        aria-label="Refresh dashboard"
      >
        {inner}
      </button>
    );
  }

  // Default: plain div (no navigation) — the sidebar will provide the onClick
  return (
    <div className={cn("inline-flex items-center gap-2 shrink-0", className)}>
      {inner}
    </div>
  );
}
