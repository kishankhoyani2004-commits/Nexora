import { Search } from "lucide-react";
import type { InputHTMLAttributes } from "react";
import { cn } from "@/utils/cn";

interface SearchBarProps extends InputHTMLAttributes<HTMLInputElement> {
  containerClassName?: string;
}

export function SearchBar({ className, containerClassName, ...props }: SearchBarProps) {
  return (
    <div className={cn("relative flex-1", containerClassName)}>
      <Search className="pointer-events-none absolute left-4 top-1/2 h-4.5 w-4.5 -translate-y-1/2 text-ink-400" />
      <input
        type="text"
        className={cn(
          "h-12 w-full rounded-2xl border border-surface-border bg-surface-card pl-11 pr-4 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
          className
        )}
        {...props}
      />
    </div>
  );
}
