import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { Check } from "lucide-react";
import { cn } from "@/utils/cn";

interface CheckboxProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, label, id, ...props }, ref) => {
    const checkboxId = id || props.name;
    return (
      <label htmlFor={checkboxId} className="inline-flex cursor-pointer items-start gap-2.5 select-none">
        <span className="relative mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center">
          <input
            ref={ref}
            type="checkbox"
            id={checkboxId}
            className={cn(
              "peer h-5 w-5 shrink-0 cursor-pointer appearance-none rounded-md border border-surface-border bg-surface-card checked:border-brand-600 checked:bg-brand-600",
              className
            )}
            {...props}
          />
          <Check className="pointer-events-none absolute h-3.5 w-3.5 text-white opacity-0 peer-checked:opacity-100" />
        </span>
        {label && <span className="text-sm text-ink-700">{label}</span>}
      </label>
    );
  }
);
Checkbox.displayName = "Checkbox";
