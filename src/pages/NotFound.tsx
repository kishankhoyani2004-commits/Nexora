import { Link } from "react-router-dom";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Logo } from "@/components/layout/Logo";
import { ROUTES } from "@/constants/routes";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-surface-app px-6 text-center">
      <Logo className="mb-10" />
      <span className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-100 text-brand-600">
        <Compass className="h-8 w-8" />
      </span>
      <h1 className="text-6xl font-extrabold text-ink-900">404</h1>
      <p className="mt-3 text-lg font-semibold text-ink-700">This page took a wrong turn.</p>
      <p className="mt-1 max-w-sm text-sm text-ink-500">
        The page you're looking for doesn't exist or may have been moved.
      </p>
      <Link to={ROUTES.HOME} className="mt-8">
        <Button>Back to Home</Button>
      </Link>
    </div>
  );
}
