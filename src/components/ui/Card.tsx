import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/utils/cn";

export function Card({
  className,
  children,
  padding = "md",
  ...props
}: HTMLAttributes<HTMLDivElement> & { children: ReactNode; padding?: "none" | "sm" | "md" | "lg" }) {
  const paddingMap = { none: "", sm: "p-4", md: "p-6", lg: "p-8" };
  return (
    <div
      className={cn(
        "rounded-2xl border border-surface-border bg-surface-card shadow-card",
        paddingMap[padding],
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
