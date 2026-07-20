import { Link } from "react-router-dom";
import { Logo } from "@/components/layout/Logo";
import { Button } from "@/components/ui/Button";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { ROUTES } from "@/constants/routes";

const LINKS = [
  { label: "Find Talent", href: "#categories" },
  { label: "Find Work", href: "#process" },
  { label: "Categories", href: "#categories" },
  { label: "Pricing", href: "#pricing" },
];

interface PublicNavbarProps {
  onLoginClick?: () => void;
}

export function PublicNavbar({ onLoginClick }: PublicNavbarProps) {
  return (
    <header className="sticky top-0 z-40 border-b border-surface-border/70 bg-surface-app/80 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center gap-8 px-6">
        <Logo />
        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <a key={link.label} href={link.href} className="text-sm font-medium text-ink-500 hover:text-ink-900">
              {link.label}
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
