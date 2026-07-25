import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { CLIENT_NAV } from "@/constants/nav";
import { settingsService } from "@/services/settings.service";
import { cn } from "@/utils/cn";
import {
  Lock, Bell, Eye, LogOut, Mail, Trash2, AlertTriangle, Send,
  HelpCircle, Phone, Globe, Shield, Download, Clock, Laptop, MessageSquare, Code,
} from "lucide-react";

const TABS = ["Company", "Notifications", "Privacy", "Security", "Connected Accounts", "Support"] as const;

export default function ClientSettings() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const queryClient = useQueryClient();
  const [searchParams] = useSearchParams();

  const paramTab = searchParams.get("tab") as any;
  const initialTab = TABS.includes(paramTab) ? paramTab : "Company";
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab);

  // ── Form States ───────────────────────────────────────────────────────────
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPasswordForm, setShowPasswordForm] = useState(false);

  const [feedbackType, setFeedbackType] = useState<"contact" | "bug" | "feedback">("bug");
  const [feedbackSubject, setFeedbackSubject] = useState("");
  const [feedbackMessage, setFeedbackMessage] = useState("");

  // Notifications
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [jobAlerts, setJobAlerts] = useState(true);
  const [projectUpdates, setProjectUpdates] = useState(true);
  const [paymentUpdates, setPaymentUpdates] = useState(true);

  // Privacy
  const [profileVisibility, setProfileVisibility] = useState<"public" | "private" | "connections">("public");
  const [showEmail, setShowEmail] = useState(false);
  const [allowMessages, setAllowMessages] = useState(true);
  const [allowInvitations, setAllowInvitations] = useState(true);

  // ── Queries ───────────────────────────────────────────────────────────────
  const { data: settingsData } = useQuery({
    queryKey: ["settings"],
    queryFn: () => settingsService.getSettings(),
  });

  const { data: loginActivityData } = useQuery({
    queryKey: ["loginActivity"],
    queryFn: () => settingsService.getLoginActivity(),
    enabled: tab === "Security",
  });

  const { data: sessionsData } = useQuery({
    queryKey: ["activeSessions"],
    queryFn: () => settingsService.getActiveSessions(),
    enabled: tab === "Security",
  });

  // Sync the active tab with the `?tab=` query param — this component
  // doesn't remount when navigating between sidebar links that share this
  // same route path (only the query differs), so `tab` (seeded once at
  // first mount) needs to be re-synced on every URL change.
  useEffect(() => {
    const paramTab = searchParams.get("tab");
    if (paramTab && (TABS as readonly string[]).includes(paramTab)) {
      setTab(paramTab as (typeof TABS)[number]);
    }
  }, [searchParams]);

  // Load settings into form when data arrives
  useEffect(() => {
    if (settingsData?.data) {
      if (settingsData.data.notificationPreferences) {
        setEmailNotifications(settingsData.data.notificationPreferences.emailNotifications ?? true);
        setPushNotifications(settingsData.data.notificationPreferences.pushNotifications ?? false);
        setJobAlerts(settingsData.data.notificationPreferences.jobAlerts ?? true);
        setProjectUpdates(settingsData.data.notificationPreferences.projectUpdates ?? true);
        setPaymentUpdates(settingsData.data.notificationPreferences.paymentUpdates ?? true);
      }
      if (settingsData.data.privacySettings) {
        setProfileVisibility(settingsData.data.privacySettings.profileVisibility ?? "public");
        setShowEmail(settingsData.data.privacySettings.showEmail ?? false);
        setAllowMessages(settingsData.data.privacySettings.allowMessages ?? true);
        setAllowInvitations(settingsData.data.privacySettings.allowInvitations ?? true);
      }
    }
  }, [settingsData]);

  // ── Mutations ──────────────────────────────────────────────────────────────
  const updateNotificationsMutation = useMutation({
    mutationFn: () =>
      settingsService.updateNotifications({
        emailNotifications,
        pushNotifications,
        jobAlerts,
        projectUpdates,
        paymentUpdates,
      }),
    onSuccess: () => {
      notify("Notification preferences updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: any) =>
      notify(err.response?.data?.message || "Failed to update preferences.", "error"),
  });

  const updatePrivacyMutation = useMutation({
    mutationFn: () =>
      settingsService.updatePrivacy({
        profileVisibility,
        showEmail,
        allowMessages,
        allowInvitations,
      }),
    onSuccess: () => {
      notify("Privacy settings updated.", "success");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
    onError: (err: any) =>
      notify(err.response?.data?.message || "Failed to update settings.", "error"),
  });

  const changePasswordMutation = useMutation({
    mutationFn: () => settingsService.changePassword(currentPassword, newPassword),
    onSuccess: () => {
      notify("Password changed successfully.", "success");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
      setShowPasswordForm(false);
    },
    onError: (err: any) =>
      notify(err.response?.data?.message || "Failed to change password.", "error"),
  });

  const logoutAllDevicesMutation = useMutation({
    mutationFn: () => settingsService.logoutAllDevices(),
    onSuccess: () => {
      notify("Logged out from all devices.", "success");
      queryClient.invalidateQueries({ queryKey: ["activeSessions"] });
    },
    onError: (err: any) =>
      notify(err.response?.data?.message || "Failed to logout.", "error"),
  });

  const submitFeedbackMutation = useMutation({
    mutationFn: () =>
      settingsService.submitFeedback(feedbackType, feedbackSubject, feedbackMessage),
    onSuccess: () => {
      notify("Thank you for your feedback!", "success");
      setFeedbackType("bug");
      setFeedbackSubject("");
      setFeedbackMessage("");
    },
    onError: (err: any) =>
      notify(err.response?.data?.message || "Failed to submit feedback.", "error"),
  });

  const loginActivity = loginActivityData?.data || [];
  const sessions = sessionsData?.data || [];

  return (
    <DashboardLayout navItems={CLIENT_NAV} tagline="Freelance Marketplace">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-8 text-3xl font-extrabold text-ink-900">Settings</h1>

        <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
          {/* Tab Navigation */}
          <div className="space-y-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "w-full rounded-lg px-4 py-2.5 text-left text-sm font-semibold transition-all",
                  tab === t
                    ? "bg-brand-50 text-brand-700 shadow-sm"
                    : "text-ink-600 hover:bg-surface-muted"
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          <div className="space-y-6">
            {/* Company Profile Tab */}
            {tab === "Company" && (
              <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-ink-900">
                  <Globe className="h-5 w-5" />
                  Company Profile
                </h2>

                <div className="space-y-4">
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-sm font-semibold text-ink-700 mb-2">
                        Company Name
                      </label>
                      <Input
                        type="text"
                        defaultValue={user?.companyName || ""}
                        placeholder="Your company name"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink-700 mb-2">
                        Owner Name
                      </label>
                      <Input
                        type="text"
                        defaultValue={user?.ownerName || ""}
                        placeholder="Owner name"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink-700 mb-2">
                        Email
                      </label>
                      <Input
                        type="email"
                        defaultValue={user?.email || ""}
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink-700 mb-2">
                        Phone
                      </label>
                      <Input
                        type="tel"
                        defaultValue={user?.phone || ""}
                        placeholder="Phone number"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink-700 mb-2">
                        Industry
                      </label>
                      <Input
                        type="text"
                        defaultValue={user?.industry || ""}
                        placeholder="Industry"
                        readOnly
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-ink-700 mb-2">
                        Company Size
                      </label>
                      <Input
                        type="text"
                        defaultValue={user?.companySize || ""}
                        placeholder="Company size"
                        readOnly
                      />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="block text-sm font-semibold text-ink-700 mb-2">
                        Address
                      </label>
                      <Input
                        type="text"
                        defaultValue={user?.address || ""}
                        placeholder="Company address"
                        readOnly
                      />
                    </div>
                  </div>

                  <Link to="/client/profile">
                    <Button className="w-full sm:w-auto">
                      Edit Profile
                    </Button>
                  </Link>
                </div>
              </div>
            )}

            {/* Notifications Tab */}
            {tab === "Notifications" && (
              <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-ink-900">
                  <Bell className="h-5 w-5" />
                  Notification Preferences
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-surface-border p-4 hover:bg-surface-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold text-ink-900">Email Notifications</p>
                      <p className="text-sm text-ink-500">Receive updates via email</p>
                    </div>
                    <Toggle
                      checked={emailNotifications}
                      onChange={setEmailNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-surface-border p-4 hover:bg-surface-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold text-ink-900">Push Notifications</p>
                      <p className="text-sm text-ink-500">Receive browser notifications</p>
                    </div>
                    <Toggle
                      checked={pushNotifications}
                      onChange={setPushNotifications}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-surface-border p-4 hover:bg-surface-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold text-ink-900">Job Alerts</p>
                      <p className="text-sm text-ink-500">Notify me about new matching jobs</p>
                    </div>
                    <Toggle
                      checked={jobAlerts}
                      onChange={setJobAlerts}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-surface-border p-4 hover:bg-surface-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold text-ink-900">Project Updates</p>
                      <p className="text-sm text-ink-500">Updates on your projects</p>
                    </div>
                    <Toggle
                      checked={projectUpdates}
                      onChange={setProjectUpdates}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-surface-border p-4 hover:bg-surface-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold text-ink-900">Payment Updates</p>
                      <p className="text-sm text-ink-500">Payment and invoice notifications</p>
                    </div>
                    <Toggle
                      checked={paymentUpdates}
                      onChange={setPaymentUpdates}
                    />
                  </div>

                  <Button
                    onClick={() => updateNotificationsMutation.mutate()}
                    isLoading={updateNotificationsMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    Save Preferences
                  </Button>
                </div>
              </div>
            )}

            {/* Privacy Tab */}
            {tab === "Privacy" && (
              <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-ink-900">
                  <Eye className="h-5 w-5" />
                  Privacy Settings
                </h2>

                <div className="space-y-4">
                  <div className="border-b border-surface-border pb-4">
                    <label className="block text-sm font-semibold text-ink-700 mb-3">
                      Profile Visibility
                    </label>
                    <select
                      value={profileVisibility}
                      onChange={(e) =>
                        setProfileVisibility(
                          e.target.value as "public" | "private" | "connections"
                        )
                      }
                      className="w-full rounded-lg border border-surface-border bg-surface-app px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                    >
                      <option value="public">Public - Anyone can see</option>
                      <option value="connections">Connections Only</option>
                      <option value="private">Private - Hidden</option>
                    </select>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-surface-border p-4 hover:bg-surface-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold text-ink-900">Show Email Address</p>
                      <p className="text-sm text-ink-500">Display email on your profile</p>
                    </div>
                    <Toggle checked={showEmail} onChange={setShowEmail} />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-surface-border p-4 hover:bg-surface-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold text-ink-900">Allow Messages</p>
                      <p className="text-sm text-ink-500">Let clients send you messages</p>
                    </div>
                    <Toggle
                      checked={allowMessages}
                      onChange={setAllowMessages}
                    />
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-surface-border p-4 hover:bg-surface-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold text-ink-900">Allow Invitations</p>
                      <p className="text-sm text-ink-500">Receive job invitations</p>
                    </div>
                    <Toggle
                      checked={allowInvitations}
                      onChange={setAllowInvitations}
                    />
                  </div>

                  <Button
                    onClick={() => updatePrivacyMutation.mutate()}
                    isLoading={updatePrivacyMutation.isPending}
                    className="w-full sm:w-auto"
                  >
                    Save Settings
                  </Button>
                </div>
              </div>
            )}

            {/* Security Tab */}
            {tab === "Security" && (
              <div className="space-y-6">
                {/* Change Password */}
                <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink-900">
                    <Lock className="h-5 w-5" />
                    Change Password
                  </h3>

                  {!showPasswordForm ? (
                    <Button
                      onClick={() => setShowPasswordForm(true)}
                      variant="outline"
                    >
                      Change Password
                    </Button>
                  ) : (
                    <div className="space-y-4">
                      <Input
                        type="password"
                        placeholder="Current password"
                        value={currentPassword}
                        onChange={(e) => setCurrentPassword(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="New password"
                        value={newPassword}
                        onChange={(e) => setNewPassword(e.target.value)}
                      />
                      <Input
                        type="password"
                        placeholder="Confirm new password"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                      />

                      <div className="flex gap-2">
                        <Button
                          onClick={() => changePasswordMutation.mutate()}
                          isLoading={changePasswordMutation.isPending}
                          disabled={newPassword !== confirmPassword}
                        >
                          Save New Password
                        </Button>
                        <Button
                          variant="outline"
                          onClick={() => {
                            setShowPasswordForm(false);
                            setCurrentPassword("");
                            setNewPassword("");
                            setConfirmPassword("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </div>
                  )}
                </div>

                {/* Active Sessions */}
                <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink-900">
                    <Laptop className="h-5 w-5" />
                    Active Sessions
                  </h3>

                  {sessions.length === 0 ? (
                    <p className="text-sm text-ink-500">No active sessions</p>
                  ) : (
                    <div className="space-y-3">
                      {sessions.map((session: any) => (
                        <div
                          key={session.sessionId}
                          className="flex items-center justify-between rounded-lg border border-surface-border p-4"
                        >
                          <div>
                            <p className="font-semibold text-ink-900">
                              {session.device}
                            </p>
                            <p className="text-sm text-ink-500">
                              {session.ipAddress}
                            </p>
                          </div>
                          <span className="text-xs text-ink-400">
                            {new Date(session.lastActive).toLocaleDateString()}
                          </span>
                        </div>
                      ))}

                      <Button
                        onClick={() => logoutAllDevicesMutation.mutate()}
                        isLoading={logoutAllDevicesMutation.isPending}
                        variant="danger"
                        className="w-full"
                      >
                        <LogOut className="h-4 w-4 mr-2" />
                        Logout All Devices
                      </Button>
                    </div>
                  )}
                </div>

                {/* Login Activity */}
                <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink-900">
                    <Clock className="h-5 w-5" />
                    Login Activity
                  </h3>

                  {loginActivity.length === 0 ? (
                    <p className="text-sm text-ink-500">No login history</p>
                  ) : (
                    <div className="space-y-2 max-h-96 overflow-y-auto">
                      {loginActivity.map((activity: any, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between rounded-lg border border-surface-border p-4 text-sm"
                        >
                          <div>
                            <p className="font-semibold text-ink-900">
                              {activity.device}
                            </p>
                            <p className="text-ink-500">{activity.ipAddress}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            {activity.status === "success" && (
                              <Badge tone="success">Success</Badge>
                            )}
                            {activity.status === "failed" && (
                              <Badge tone="danger">Failed</Badge>
                            )}
                            <span className="text-xs text-ink-400">
                              {new Date(activity.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Connected Accounts Tab */}
            {tab === "Connected Accounts" && (
              <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                <h2 className="mb-6 flex items-center gap-2 text-xl font-bold text-ink-900">
                  <Shield className="h-5 w-5" />
                  Connected Accounts
                </h2>

                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg border border-surface-border p-4">
                    <div className="flex items-center gap-3">
                      <Mail className="h-5 w-5 text-red-500" />
                      <div>
                        <p className="font-semibold text-ink-900">Google</p>
                        <p className="text-sm text-ink-500">
                          {settingsData?.data?.connectedAccounts?.google
                            ? "Connected"
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      {settingsData?.data?.connectedAccounts?.google
                        ? "Connected"
                        : "Connect"}
                    </Button>
                  </div>

                  <div className="flex items-center justify-between rounded-lg border border-surface-border p-4">
                    <div className="flex items-center gap-3">
                      <Code className="h-5 w-5 text-ink-900" />
                      <div>
                        <p className="font-semibold text-ink-900">GitHub</p>
                        <p className="text-sm text-ink-500">
                          {settingsData?.data?.connectedAccounts?.github
                            ? "Connected"
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                    <Button variant="outline" size="sm" disabled>
                      {settingsData?.data?.connectedAccounts?.github
                        ? "Connected"
                        : "Connect"}
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Support Tab */}
            {tab === "Support" && (
              <div className="space-y-6">
                {/* Contact Support */}
                <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink-900">
                    <MessageSquare className="h-5 w-5" />
                    Send Feedback
                  </h3>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-semibold text-ink-700 mb-2">
                        Feedback Type
                      </label>
                      <select
                        value={feedbackType}
                        onChange={(e) => setFeedbackType(e.target.value as "contact" | "bug" | "feedback")}
                        className="w-full rounded-lg border border-surface-border bg-surface-app px-3 py-2 text-sm focus:border-brand-500 focus:outline-none"
                      >
                        <option value="bug">Report a Bug</option>
                        <option value="feature">Feature Request</option>
                        <option value="general">General Feedback</option>
                        <option value="support">Support Request</option>
                      </select>
                    </div>

                    <Input
                      type="text"
                      placeholder="Subject"
                      value={feedbackSubject}
                      onChange={(e) => setFeedbackSubject(e.target.value)}
                    />

                    <Textarea
                      placeholder="Tell us more..."
                      value={feedbackMessage}
                      onChange={(e) => setFeedbackMessage(e.target.value)}
                      rows={5}
                    />

                    <Button
                      onClick={() => submitFeedbackMutation.mutate()}
                      isLoading={submitFeedbackMutation.isPending}
                      disabled={!feedbackSubject || !feedbackMessage}
                      className="w-full sm:w-auto"
                    >
                      <Send className="h-4 w-4 mr-2" />
                      Send Feedback
                    </Button>
                  </div>
                </div>

                {/* Help Center */}
                <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-ink-900">
                    <HelpCircle className="h-5 w-5" />
                    Need Help?
                  </h3>

                  <div className="space-y-3">
                    <p className="text-sm text-ink-600">
                      Visit our Help Center for guides and FAQs
                    </p>
                    <Link to="/help">
                      <Button variant="outline" className="w-full sm:w-auto">
                        Open Help Center
                      </Button>
                    </Link>
                  </div>
                </div>

                {/* Delete Account */}
                <div className="rounded-2xl border-2 border-red-200 bg-red-50 p-6">
                  <h3 className="mb-4 flex items-center gap-2 text-lg font-bold text-red-900">
                    <AlertTriangle className="h-5 w-5" />
                    Danger Zone
                  </h3>

                  <p className="mb-4 text-sm text-red-700">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>

                  <Button variant="danger">
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete Account
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
