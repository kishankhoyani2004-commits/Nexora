import { createPortal } from "react-dom";
import { AlertTriangle, HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";

interface ConfirmDialogProps {
  isOpen: boolean;
  title?: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  isLoading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

// In-app replacement for the browser's native window.confirm() — every
// destructive/irreversible action in the app routes through useConfirm()
// (see ConfirmContext) instead, so confirmations always render as this
// themed modal rather than a Chrome/OS dialog.
export function ConfirmDialog({
  isOpen,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = true,
  isLoading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  if (!isOpen) return null;

  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-dialog-title"
      className="fixed inset-0 z-[100] flex items-center justify-center p-4"
    >
      <div
        className="absolute inset-0 bg-ink-900/50 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      <div
        className={cn(
          "relative z-10 w-full max-w-sm rounded-2xl border border-surface-border",
          "bg-surface-card shadow-pop",
          "animate-in fade-in zoom-in-95 duration-200"
        )}
      >
        <button
          onClick={onCancel}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition-colors hover:bg-surface-muted hover:text-ink-700"
        >
          <X className="h-4 w-4" />
        </button>

        <div className="p-7">
          <div
            className={cn(
              "mb-5 flex h-13 w-13 items-center justify-center rounded-2xl",
              danger ? "bg-red-50 text-red-500" : "bg-brand-50 text-brand-600"
            )}
          >
            {danger ? <AlertTriangle className="h-6 w-6" /> : <HelpCircle className="h-6 w-6" />}
          </div>

          <h2 id="confirm-dialog-title" className="mb-2 text-lg font-bold text-ink-900">
            {title || (danger ? "Are you sure?" : "Confirm")}
          </h2>

          <p className="mb-7 whitespace-pre-wrap text-sm leading-relaxed text-ink-500">
            {message}
          </p>

          <div className="flex gap-3">
            <Button variant="outline" size="md" fullWidth onClick={onCancel} disabled={isLoading}>
              {cancelLabel}
            </Button>
            <Button
              variant={danger ? "danger" : "primary"}
              size="md"
              fullWidth
              onClick={onConfirm}
              isLoading={isLoading}
            >
              {confirmLabel}
            </Button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
