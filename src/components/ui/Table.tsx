import type { ReactNode } from "react";
import { cn } from "@/utils/cn";

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-x-auto">
      <table className={cn("w-full min-w-[640px] border-collapse text-left text-sm", className)}>
        {children}
      </table>
    </div>
  );
}

export function TableHead({ children }: { children: ReactNode }) {
  return (
    <thead>
      <tr className="border-b border-surface-border text-xs font-semibold uppercase tracking-wide text-ink-400">
        {children}
      </tr>
    </thead>
  );
}

export function Th({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn("py-3 pr-4 font-semibold", className)}>{children}</th>;
}

export function Td({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn("py-4 pr-4 align-middle", className)}>{children}</td>;
}

export function Tr({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn("border-b border-surface-border last:border-0", className)}>{children}</tr>;
}
