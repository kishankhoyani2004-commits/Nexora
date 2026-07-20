import type { ReactNode } from "react";
import { X } from "lucide-react";
import { createPortal } from "react-dom";
import { cn } from "@/utils/cn";

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ isOpen, onClose, title, children, className }: ModalProps) {
  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm" onClick={onClose} />
      <div
        className={cn(
          "relative z-10 w-full max-w-lg rounded-2xl bg-surface-card p-6 shadow-pop animate-in fade-in zoom-in-95",
          className
        )}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-4 flex items-center justify-between">
          {title && <h2 className="text-lg font-bold text-ink-900">{title}</h2>}
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="ml-auto rounded-lg p-1.5 text-ink-400 hover:bg-surface-muted hover:text-ink-900"
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
