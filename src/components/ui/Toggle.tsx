import { cn } from "@/utils/cn";

export function Toggle({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
}) {
  return (
    <label className="inline-flex shrink-0 cursor-pointer items-center gap-2.5 select-none">
      {label && <span className="text-sm text-ink-700">{label}</span>}
      <button
        role="switch"
        type="button"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
        className={cn(
          "relative h-6 w-11 shrink-0 rounded-full transition-colors",
          checked ? "bg-brand-600" : "bg-surface-border"
        )}
      >
        <span
          className={cn(
            // `left-0` is required, not decorative: a native <button> defaults
            // to text-align:center, so this absolutely-positioned span's "auto"
            // left resolves to the button's horizontal center instead of its
            // edge — the translate-x below then compounds on top of that
            // centered start, pushing the knob outside the track when checked.
            // Pinning left-0 gives translate-x a fixed x=0 baseline to shift from.
            "absolute left-0 top-0.5 h-5 w-5 rounded-full bg-surface-card shadow transition-transform",
            checked ? "translate-x-[22px]" : "translate-x-0.5"
          )}
        />
      </button>
    </label>
  );
}
