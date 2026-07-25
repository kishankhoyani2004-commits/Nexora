import { ROUTES } from "@/constants/routes";
import type { UserRole } from "@/types";

/**
 * Returns the correct post-login dashboard path for a given role.
 * Single source of truth used by Login, Signup, LoginModal, ProtectedRoute.
 */
export function getRedirectPath(role?: UserRole | string | null): string {
  if (role === "client")    return ROUTES.CLIENT_DASHBOARD;
  if (role === "admin")     return ROUTES.ADMIN_DASHBOARD;
  return ROUTES.FREELANCER_DASHBOARD;
}
