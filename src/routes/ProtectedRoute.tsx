import type { ReactNode } from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { getRedirectPath } from "@/utils/getRedirectPath";
import type { UserRole } from "@/types";

interface ProtectedRouteProps {
  children:      ReactNode;
  allowedRoles?: UserRole[];
}

export function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { user, isAuthenticated, isLoading } = useAuth();

  // Still validating the stored token on first load — render nothing to avoid flicker
  if (isLoading) return null;

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // If this route restricts roles and the logged-in user's role isn't in the list,
  // send them to their own correct dashboard instead of a 403.
  if (allowedRoles && user?.role && !allowedRoles.includes(user.role)) {
    return <Navigate to={getRedirectPath(user.role)} replace />;
  }

  return <>{children}</>;
}
