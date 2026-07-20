import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/constants/routes";
import type { UserRole } from "@/types";

interface ProtectedRouteProps {
  children: ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Still validating the stored token on first load — render nothing to avoid flicker
  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} replace />;
  }

  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    const fallback =
      user.role === "admin" ? ROUTES.ADMIN_DASHBOARD : ROUTES.FREELANCER_DASHBOARD;
    return <Navigate to={fallback} replace />;
  }

  return <>{children}</>;
}
