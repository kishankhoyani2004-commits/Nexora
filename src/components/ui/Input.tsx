import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/utils/cn";

interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  hint?: string;
  icon?: ReactNode;
  rightElement?: ReactNode;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, hint, icon, rightElement, id, ...props }, ref) => {
    const inputId = id || props.name;
    return (
      <div className="w-full">
        {label && (
          <label htmlFor={inputId} className="mb-1.5 block text-sm font-medium text-ink-700">
            {label}
          </label>
        )}
        <div className="relative">
          {icon && (
            <span className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-ink-400">
              {icon}
            </span>
          )}
          <input
            ref={ref}
            id={inputId}
            className={cn(
              "h-11 w-full rounded-xl border border-surface-border bg-surface-card px-3.5 text-sm text-ink-900 placeholder:text-ink-400 transition-colors focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100",
              icon && "pl-10",
              rightElement && "pr-10",
              error && "border-danger focus:border-danger focus:ring-red-100",
              className
            )}
            {...props}
          />
          {rightElement && (
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-ink-400">
              {rightElement}
            </span>
          )}
        </div>
        {error ? (
          <p className="mt-1.5 text-xs text-danger">{error}</p>
        ) : hint ? (
          <p className="mt-1.5 text-xs text-ink-400">{hint}</p>
        ) : null}
      </div>
    );
  }
);
Input.displayName = "Input";
