import { createPortal } from "react-dom";
import { LogOut, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

interface LogoutConfirmModalProps {
  isOpen:    boolean;
  onCancel:  () => void;
  onConfirm: () => void;
  isLoading?: boolean;
}

export function LogoutConfirmModal({
  isOpen,
  onCancel,
  onConfirm,
  isLoading = false,
}: LogoutConfirmModalProps) {
  if (!isOpen) return null;

  return createPortal(
    /* ── Backdrop ── */
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="logout-modal-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      {/* Dimmed overlay */}
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Modal panel */}
      <div
        className={cn(
          "relative z-10 w-full max-w-sm rounded-2xl border border-surface-border",
          "bg-surface-card shadow-pop",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        {/* Close button */}
        <button
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-7">
          {/* Icon */}
          <div className="mb-5 flex h-13 w-13 items-center justify-center rounded-2xl bg-red-50 text-red-500">
            <LogOut className="h-6 w-6" />
          </div>

          {/* Title */}
          <h2
            id="logout-modal-title"
            className="mb-2 text-lg font-bold text-ink-900"
          >
            Logout Confirmation
          </h2>

          {/* Message */}
          <p className="mb-7 text-sm leading-relaxed text-ink-500">
            Are you sure you want to log out of your{" "}
            <span className="font-semibold text-ink-700">Nexora</span> account?
            Any unsaved changes will be lost.
          </p>

          {/* Actions */}
          <div className="flex gap-3">
            <Button
              variant="outline"
              size="md"
              fullWidth
              onClick={onCancel}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              size="md"
              fullWidth
              onClick={onConfirm}
              isLoading={isLoading}
              icon={!isLoading ? <LogOut className="h-4 w-4" /> : undefined}
              iconPosition="left"
            >
              {isLoading ? "Logging out…" : "Logout"}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
