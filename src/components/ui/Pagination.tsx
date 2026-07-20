import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/utils/cn";

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, onPageChange }: PaginationProps) {
  const pages = new Set<number>([1, totalPages, currentPage, currentPage - 1, currentPage + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= totalPages).sort((a, b) => a - b);

  const items: (number | "ellipsis")[] = [];
  sorted.forEach((page, idx) => {
    if (idx > 0 && page - sorted[idx - 1] > 1) items.push("ellipsis");
    items.push(page);
  });

  const btnBase =
    "flex h-10 w-10 items-center justify-center rounded-xl border border-surface-border text-sm font-semibold text-ink-700 hover:border-brand-400 disabled:opacity-40 disabled:hover:border-surface-border";

  return (
    <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
      <button
        className={btnBase}
        disabled={currentPage === 1}
        onClick={() => onPageChange(currentPage - 1)}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>
      {items.map((item, idx) =>
        item === "ellipsis" ? (
          <span key={`ellipsis-${idx}`} className="px-1 text-ink-400">
            …
          </span>
        ) : (
          <button
            key={item}
            onClick={() => onPageChange(item)}
            className={cn(
              btnBase,
              item === currentPage && "border-brand-600 bg-brand-600 text-white hover:border-brand-600"
            )}
            aria-current={item === currentPage ? "page" : undefined}
          >
            {item}
          </button>
        )
      )}
      <button
        className={btnBase}
        disabled={currentPage === totalPages}
        onClick={() => onPageChange(currentPage + 1)}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  );
}
