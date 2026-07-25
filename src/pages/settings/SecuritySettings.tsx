import { useState } from "react";
import { Lock, Shield, Monitor, Smartphone, LogOut, CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/Input";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { CLIENT_NAV, FREELANCER_NAV, ADMIN_NAV } from "@/constants/nav";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { settingsService } from "@/services/settings.service";

// A standalone page (separate route from /settings) so that "Security"
// isn't just another tab silently sharing state with "Profile Settings" —
// see the /settings tab-sync bug this replaced.
export default function SecuritySettings() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();

  const navItems = user?.role === "admin" ? ADMIN_NAV : user?.role === "client" ? CLIENT_NAV : FREELANCER_NAV;

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordErrors, setPasswordErrors] = useState<Record<string, string>>({});
  const [changingPassword, setChangingPassword] = useState(false);

  const [loggingOutSessionId, setLoggingOutSessionId] = useState<string | null>(null);
  const [loggingOutAll, setLoggingOutAll] = useState(false);

  const { data: settingsResponse } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await settingsService.getSettings()).data,
  });
  const twoFactorEnabled = settingsResponse?.twoFactorEnabled || false;

  const { data: sessionsResponse, isLoading: loadingSessions } = useQuery({
    queryKey: ["settings", "sessions"],
    queryFn: async () => (await settingsService.getActiveSessions()).data,
  });
  const sessions = sessionsResponse || [];

  const { data: loginActivityResponse, isLoading: loadingLoginActivity } = useQuery({
    queryKey: ["settings", "login-activity"],
    queryFn: async () => (await settingsService.getLoginActivity()).data,
  });
  const loginActivity = loginActivityResponse || [];

  const validatePassword = () => {
    const e: Record<string, string> = {};
    if (!currentPassword) e.currentPassword = "Current password is required.";
    if (!newPassword) e.newPassword = "New password is required.";
    else if (newPassword.length < 6) e.newPassword = "New password must be at least 6 characters.";
    if (newPassword && currentPassword && newPassword === currentPassword)
      e.newPassword = "New password must be different from the current password.";
    if (confirmPassword !== newPassword) e.confirmPassword = "Passwords do not match.";
    setPasswordErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    try {
      setChangingPassword(true);
      await settingsService.changePassword(currentPassword, newPassword);
      notify("Password changed successfully.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setPasswordErrors({});
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to change password.", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  const handleLogoutSession = async (sessionId: string) => {
    try {
      setLoggingOutSessionId(sessionId);
      await settingsService.logoutSession(sessionId);
      queryClient.invalidateQueries({ queryKey: ["settings", "sessions"] });
      notify("Session terminated.", "success");
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to terminate session.", "error");
    } finally {
      setLoggingOutSessionId(null);
    }
  };

  const handleLogoutAllDevices = async () => {
    try {
      setLoggingOutAll(true);
      await settingsService.logoutAllDevices();
      queryClient.invalidateQueries({ queryKey: ["settings", "sessions"] });
      notify("Logged out from all devices.", "success");
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to log out all devices.", "error");
    } finally {
      setLoggingOutAll(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems} tagline="Freelance Hub" searchPlaceholder="Search settings...">
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Security</h1>

      <div className="max-w-2xl space-y-8 rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
        {/* Change Password — OAuth-only accounts can't set a local password */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900">
            <Lock className="h-4 w-4" /> Change Password
          </h3>
          {user?.provider !== "local" ? (
            <p className="rounded-xl bg-surface-muted p-4 text-sm text-ink-500">
              You signed in with {user?.provider === "google" ? "Google" : user?.provider === "github" ? "GitHub" : "a third-party provider"}, so there's no password to change here.
            </p>
          ) : (
            <div className="space-y-4">
              <Input
                label="Current Password"
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                error={passwordErrors.currentPassword}
              />
              <Input
                label="New Password"
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                error={passwordErrors.newPassword}
                hint="At least 6 characters."
              />
              <Input
                label="Confirm New Password"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                error={passwordErrors.confirmPassword}
              />
              <Button onClick={handleChangePassword} isLoading={changingPassword}>
                Update Password
              </Button>
            </div>
          )}
        </div>

        <div className="h-px bg-surface-border" />

        {/* Two-Factor Authentication status */}
        <div>
          <h3 className="mb-3 flex items-center gap-2 text-sm font-bold text-ink-900">
            <Shield className="h-4 w-4" /> Two-Factor Authentication
          </h3>
          <div className="flex items-center justify-between rounded-xl bg-surface-muted p-4">
            <div>
              <p className="font-semibold text-ink-900">Authenticator App</p>
              <p className="text-sm text-ink-500">Extra layer of protection on top of your password.</p>
            </div>
            <Badge tone={twoFactorEnabled ? "success" : "neutral"}>
              {twoFactorEnabled ? "Enabled" : "Coming Soon"}
            </Badge>
          </div>
        </div>

        <div className="h-px bg-surface-border" />

        {/* Active sessions */}
        <div>
          <div className="mb-3 flex items-center justify-between">
            <h3 className="flex items-center gap-2 text-sm font-bold text-ink-900">
              <Monitor className="h-4 w-4" /> Active Sessions
            </h3>
            {sessions.length > 0 && (
              <button
                onClick={handleLogoutAllDevices}
                disabled={loggingOutAll}
                className="flex items-center gap-1 text-xs font-semibold text-danger hover:underline disabled:opacity-50"
              >
                {loggingOutAll ? <Loader2 className="h-3 w-3 animate-spin" /> : <LogOut className="h-3 w-3" />}
                Log out all devices
              </button>
            )}
          </div>
          {loadingSessions ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            </div>
          ) : sessions.length === 0 ? (
            <p className="text-sm text-ink-400">No other active sessions.</p>
          ) : (
            <div className="space-y-2">
              {sessions.map((s: any) => (
                <div key={s.sessionId} className="flex items-center justify-between rounded-xl border border-surface-border p-3">
                  <div className="flex items-center gap-3">
                    <Smartphone className="h-4 w-4 text-ink-400" />
                    <div>
                      <p className="text-sm font-semibold text-ink-900">{s.device || "Unknown device"}</p>
                      <p className="text-xs text-ink-400">
                        {s.ipAddress ? `${s.ipAddress} · ` : ""}
                        Last active {s.lastActive ? new Date(s.lastActive).toLocaleString() : "N/A"}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => handleLogoutSession(s.sessionId)}
                    disabled={loggingOutSessionId === s.sessionId}
                    className="text-xs font-semibold text-danger hover:underline disabled:opacity-50"
                  >
                    {loggingOutSessionId === s.sessionId ? "Logging out…" : "Log out"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="h-px bg-surface-border" />

        {/* Login activity */}
        <div>
          <h3 className="mb-3 text-sm font-bold text-ink-900">Recent Login Activity</h3>
          {loadingLoginActivity ? (
            <div className="flex h-20 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            </div>
          ) : loginActivity.length === 0 ? (
            <p className="text-sm text-ink-400">No login activity recorded yet.</p>
          ) : (
            <div className="space-y-2">
              {loginActivity.slice(0, 10).map((entry: any, idx: number) => (
                <div key={idx} className="flex items-center justify-between rounded-xl border border-surface-border p-3 text-sm">
                  <div className="flex items-center gap-2.5">
                    {entry.status === "success" ? (
                      <CheckCircle2 className="h-4 w-4 text-success" />
                    ) : (
                      <XCircle className="h-4 w-4 text-danger" />
                    )}
                    <div>
                      <p className="font-medium text-ink-900">
                        {entry.status === "success" ? "Successful login" : "Failed login attempt"}
                        {entry.reason ? ` — ${entry.reason}` : ""}
                      </p>
                      <p className="text-xs text-ink-400">
                        {entry.device || "Unknown device"}{entry.ipAddress ? ` · ${entry.ipAddress}` : ""}
                      </p>
                    </div>
                  </div>
                  <span className="text-xs text-ink-400">
                    {entry.timestamp ? new Date(entry.timestamp).toLocaleString() : ""}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
