import { CheckCircle2, XCircle, Info, X } from "lucide-react";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/utils/cn";

const iconMap = { success: CheckCircle2, error: XCircle, info: Info };
const toneMap = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
  info: "border-brand-200 bg-brand-50 text-brand-800",
};

export function ToastContainer() {
  const { toasts, dismiss } = useNotification();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-[100] flex w-full max-w-sm flex-col gap-2.5">
      {toasts.map((toast) => {
        const Icon = iconMap[toast.type];
        return (
          <div
            key={toast.id}
            className={cn(
              "flex items-start gap-3 rounded-2xl border p-4 shadow-pop animate-in slide-in-from-bottom-4",
              toneMap[toast.type]
            )}
            role="status"
          >
            <Icon className="mt-0.5 h-5 w-5 shrink-0" />
            <p className="flex-1 text-sm font-medium">{toast.message}</p>
            <button onClick={() => dismiss(toast.id)} aria-label="Dismiss notification">
              <X className="h-4 w-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
