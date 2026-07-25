import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";

export type ThemeMode = "light" | "dark" | "system";
type EffectiveTheme = "light" | "dark";

interface ThemeContextValue {
  /** The effective, rendered theme — always "light" or "dark", resolving "system" via the OS preference. */
  theme: EffectiveTheme;
  /** The user's raw selection, including "system". */
  mode: ThemeMode;
  toggleTheme: () => void;
  setMode: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue | undefined>(undefined);

function getSystemTheme(): EffectiveTheme {
  return window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => {
    const stored = localStorage.getItem("nexora_theme_mode");
    if (stored === "light" || stored === "dark" || stored === "system") return stored;
    // Back-compat with the previous light/dark-only storage key.
    const legacy = localStorage.getItem("nexora_theme");
    if (legacy === "light" || legacy === "dark") return legacy;
    return "system";
  });

  const [systemTheme, setSystemTheme] = useState<EffectiveTheme>(getSystemTheme);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => setSystemTheme(getSystemTheme());
    mq.addEventListener("change", handler);
    return () => mq.removeEventListener("change", handler);
  }, []);

  const theme: EffectiveTheme = mode === "system" ? systemTheme : mode;

  useEffect(() => {
    localStorage.setItem("nexora_theme_mode", mode);
    localStorage.setItem("nexora_theme", theme);
    document.documentElement.classList.toggle("dark", theme === "dark");
    document.documentElement.setAttribute("data-theme", theme);
  }, [mode, theme]);

  const value = useMemo(
    () => ({
      theme,
      mode,
      toggleTheme: () => setModeState((prev) => ((prev === "system" ? systemTheme : prev) === "dark" ? "light" : "dark")),
      setMode: (next: ThemeMode) => setModeState(next),
    }),
    [theme, mode, systemTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useTheme must be used within a ThemeProvider");
  return ctx;
}
