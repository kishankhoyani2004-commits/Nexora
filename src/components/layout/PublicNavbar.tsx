import { Link } from "react-router-dom";
import { Users, Briefcase, LayoutGrid, Tag } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ROUTES } from "@/constants/routes";

const LINKS = [
  { label: "Find Talent", href: "#hero", icon: Users },
  { label: "Find Work", href: "#process", icon: Briefcase },
  { label: "Categories", href: "#categories", icon: LayoutGrid },
  { label: "Pricing", href: "#pricing", icon: Tag },
];

interface PublicNavbarProps {
  onLoginClick?: () => void;
}

export function PublicNavbar({ onLoginClick }: PublicNavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-border/70 bg-surface-app/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6">
        <Logo />
        <nav className="hidden items-center gap-1 md:flex">
          {LINKS.map((link) => (
            <a
              key={link.label}
              href={link.href}
              className="group relative flex items-center gap-1.5 rounded-full px-3.5 py-2 text-sm font-semibold text-ink-500 transition-colors duration-200 hover:text-brand-600"
            >
              <link.icon className="h-3.5 w-3.5 text-ink-400 transition-colors duration-200 group-hover:text-brand-500" />
              {link.label}
              <span className="pointer-events-none absolute inset-x-3 -bottom-0.5 h-0.5 scale-x-0 rounded-full bg-gradient-to-r from-brand-500 to-brand-secondary transition-transform duration-200 group-hover:scale-x-100" />
            </a>
          ))}
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          {onLoginClick ? (
            <button
              onClick={onLoginClick}
              className="text-sm font-semibold text-ink-700 hover:text-ink-900 cursor-pointer"
            >
              Login
            </button>
          ) : (
            <Link to={ROUTES.LOGIN} className="text-sm font-semibold text-ink-700 hover:text-ink-900">
              Login
            </Link>
          )}
          <Link to={ROUTES.SIGNUP}>
            <Button size="sm">Sign Up</Button>
          </Link>
        </div>
      </div>
    </header>
  );
}
