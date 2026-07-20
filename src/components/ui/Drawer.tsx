import type { ReactNode } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

interface DrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  side?: "left" | "right";
}

export function Drawer({ isOpen, onClose, title, children, side = "right" }: DrawerProps) {
  if (!isOpen) return null;
  return createPortal(
    <div className="fixed inset-0 z-50 flex">
      <div className="absolute inset-0 bg-ink-900/40" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 h-full w-full max-w-sm overflow-y-auto bg-surface-card p-6 shadow-pop",
          side === "right" ? "ml-auto" : "mr-auto"
        )}
      >
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-lg font-bold text-ink-900">{title}</h2>}
          <button
            onClick={onClose}
            aria-label="Close drawer"
            className="ml-auto rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        {children}
      </div>
    </div>,
    document.body
  );
}
