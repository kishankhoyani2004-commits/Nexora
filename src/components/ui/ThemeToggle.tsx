import { Moon, Sun } from "lucide-react";
import { useTheme } from "@/context/ThemeContext";
import { cn } from "@/utils/cn";

export function ThemeToggle({ className, dark }: { className?: string; dark?: boolean }) {
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className={cn(
        "relative flex h-10 w-10 items-center justify-center rounded-xl transition-colors",
        dark
          ? "text-dark-text-dim hover:bg-dark-surface-2"
          : "text-ink-500 hover:bg-surface-muted",
        className
      )}
    >
      <Sun className={cn("h-5 w-5 transition-all", isDark ? "scale-0 opacity-0" : "scale-100 opacity-100")} />
      <Moon
        className={cn(
          "absolute h-5 w-5 transition-all",
          isDark ? "scale-100 opacity-100" : "scale-0 opacity-0"
        )}
      />
    </button>
  );
}
