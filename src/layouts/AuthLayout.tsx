import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

interface AuthLayoutProps {
  children: ReactNode;
  heroTitle: ReactNode;
  heroSubtitle: string;
  heroImage: string;
  stats?: { value: string; label: string }[];
}

export function AuthLayout({ children, heroTitle, heroSubtitle, heroImage, stats }: AuthLayoutProps) {
  return (
    <div className="grid min-h-screen bg-surface-app lg:grid-cols-2">
      <div className="hidden flex-col justify-center bg-gradient-to-br from-brand-50 to-brand-100 px-16 py-12 dark:from-surface-card dark:to-surface-card lg:flex">
        <Logo className="mb-10" />
        <h1 className="max-w-md text-4xl font-extrabold leading-tight text-ink-900">{heroTitle}</h1>
        <p className="mt-4 max-w-sm text-ink-500">{heroSubtitle}</p>
        <div className="mt-10 overflow-hidden rounded-2xl shadow-pop">
          <img src={heroImage} alt="" className="aspect-[4/3] w-full object-cover" />
        </div>
        {stats && (
          <div className="mt-10 flex gap-10">
            {stats.map((s) => (
              <div key={s.label}>
                <p className="text-2xl font-extrabold text-brand-600">{s.value}</p>
                <p className="text-xs uppercase tracking-wide text-ink-400">{s.label}</p>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="relative flex items-center justify-center bg-surface-app px-6 py-12">
        <ThemeToggle className="absolute right-6 top-6" />
        <div className="w-full max-w-md">{children}</div>
      </div>
    </div>
  );
}
