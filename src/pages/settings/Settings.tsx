import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { Trash2, AlertTriangle, Loader2 } from "lucide-react";
import { SiGithub, SiGoogle } from "react-icons/si";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Select } from "@/components/ui/Select";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { useTheme, type ThemeMode } from "@/context/ThemeContext";
import { CLIENT_NAV, FREELANCER_NAV, ADMIN_NAV } from "@/constants/nav";
import { cn } from "@/utils/cn";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { userService } from "@/services/user.service";
import { settingsService } from "@/services/settings.service";
import { connectGoogleAccount, connectGithubAccount } from "@/services/auth.service";

const TABS = [
  "Profile", "Notifications", "Privacy",
  "Connected Accounts", "Preferences", "Billing", "Earnings", "Danger Zone",
] as const;

export default function Settings() {
  const { user, updateUser, logout } = useAuth();
  const { notify } = useNotification();
  const { mode, setMode } = useTheme();
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Profile ────────────────────────────────────────────────────────────
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");
  const [profileErrors, setProfileErrors] = useState<Record<string, string>>({});

  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  const paramTab = searchParams.get("tab") as any;
  const initialTab = TABS.includes(paramTab) ? paramTab : "Profile";
  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab);

  // ── Notifications ─────────────────────────────────────────────────────
  const [notifPrefs, setNotifPrefs] = useState({
    emailNotifications: true,
    pushNotifications: false,
    emailDigest: "weekly" as "daily" | "weekly" | "monthly" | "never",
    jobAlerts: true,
    proposalUpdates: true,
    projectUpdates: true,
    paymentUpdates: true,
    messageNotifications: true,
    reviewNotifications: true,
  });
  const [savingNotifs, setSavingNotifs] = useState(false);

  // ── Privacy ───────────────────────────────────────────────────────────
  const [privacy, setPrivacy] = useState({
    profileVisibility: "public" as "public" | "private" | "connections",
    showEmail: false,
    showPhone: false,
    allowMessages: true,
    allowInvitations: true,
    showActivityStatus: true,
  });
  const [savingPrivacy, setSavingPrivacy] = useState(false);

  // ── Connected Accounts ───────────────────────────────────────────────
  const [connecting, setConnecting] = useState<"google" | "github" | null>(null);
  const [disconnecting, setDisconnecting] = useState<"google" | "github" | null>(null);

  // ── Preferences ───────────────────────────────────────────────────────
  const [language, setLanguage] = useState("en");
  const [savingPreferences, setSavingPreferences] = useState(false);

  // ── Danger Zone ───────────────────────────────────────────────────────
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [cancellingDeletion, setCancellingDeletion] = useState(false);

  // Sync the active tab with the `?tab=` query param. Settings and Security
  // both route to this same component/path (only the query differs), so
  // React Router never remounts it between them — without this effect,
  // `tab` state (seeded once from the URL at first mount) never updates on
  // a later navigation, making every "Account" sidebar link show whichever
  // tab happened to load first.
  useEffect(() => {
    const paramTab = searchParams.get("tab");
    if (paramTab && (TABS as readonly string[]).includes(paramTab)) {
      setTab(paramTab as (typeof TABS)[number]);
    }
  }, [searchParams]);

  // Sync user fields into the Profile form
  useEffect(() => {
    if (user) {
      setFullName(user.fullName || "");
      setEmail(user.email || "");
      setTitle(user.title || "");
      setLocation(user.location || "");
      setHourlyRate(user.hourlyRate || 0);
      setBio(user.bio || "");
      setSkills(user.skills ? user.skills.join(", ") : "");
    }
  }, [user]);

  const navItems = user?.role === "admin" ? ADMIN_NAV : user?.role === "client" ? CLIENT_NAV : FREELANCER_NAV;

  // ── Settings bundle (notifications, privacy, connected accounts, prefs) ──
  const { data: settingsResponse, isLoading: loadingSettings } = useQuery({
    queryKey: ["settings"],
    queryFn: async () => (await settingsService.getSettings()).data,
  });

  useEffect(() => {
    if (!settingsResponse) return;
    if (settingsResponse.notificationPreferences && Object.keys(settingsResponse.notificationPreferences).length) {
      setNotifPrefs((prev) => ({ ...prev, ...settingsResponse.notificationPreferences }));
    }
    if (settingsResponse.privacySettings && Object.keys(settingsResponse.privacySettings).length) {
      setPrivacy((prev) => ({ ...prev, ...settingsResponse.privacySettings }));
    }
    if (settingsResponse.preferences?.language) {
      setLanguage(settingsResponse.preferences.language);
    }
    // Only adopt the server's saved theme mode once, so it doesn't fight
    // with a change the user just made locally in this same session.
  }, [settingsResponse]);

  const connectedAccounts = settingsResponse?.connectedAccounts || {};
  const deletionScheduled = settingsResponse?.accountDeletionScheduled;

  // ── Transactions (Billing / Earnings) ────────────────────────────────
  const { data: txResponse } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await apiClient.get("/payments/history");
      return res.data;
    },
    enabled: tab === "Earnings",
  });

  const transactions = txResponse?.data || [];

  const totalEarned = transactions
    .filter((tx: any) => tx.status === "completed")
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  const pendingEscrow = transactions
    .filter((tx: any) => tx.status === "pending")
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  // ── Handlers: Profile ─────────────────────────────────────────────────
  const validateProfile = () => {
    const e: Record<string, string> = {};
    if (!fullName.trim()) e.fullName = "Full name is required.";
    if (hourlyRate < 0) e.hourlyRate = "Hourly rate cannot be negative.";
    setProfileErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSaveChanges = async () => {
    if (!user) return;
    if (!validateProfile()) return;
    try {
      setUpdatingProfile(true);
      const skillsArray = skills.split(",").map((s) => s.trim()).filter(Boolean);
      const res = await userService.updateProfile(user.id || user._id || "", {
        fullName,
        title,
        location,
        hourlyRate: Number(hourlyRate),
        bio,
        skills: skillsArray,
      });
      const updatedUser = (res.data as any).user || res.data.data;
      if (updatedUser) {
        updateUser(updatedUser);
        notify("Profile updated successfully.", "success");
      }
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || "Failed to update profile.", "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (!file.type.startsWith("image/")) {
      notify("Please select an image file.", "error");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      notify("Image must be smaller than 5MB.", "error");
      return;
    }

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploadingAvatar(true);
      const res = await userService.uploadAvatar(user.id || user._id || "", formData);
      const newAvatarUrl = (res.data as any).avatar || res.data.data?.avatarUrl || (res.data as any).avatarUrl;
      if (newAvatarUrl) {
        updateUser({ ...user, avatar: newAvatarUrl });
        notify("Profile photo updated successfully.", "success");
      }
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || "Failed to upload photo.", "error");
    } finally {
      setUploadingAvatar(false);
    }
  };

  // ── Handlers: Notifications ──────────────────────────────────────────
  const handleSaveNotifications = async () => {
    try {
      setSavingNotifs(true);
      await settingsService.updateNotifications(notifPrefs);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      notify("Notification preferences saved.", "success");
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to save notification preferences.", "error");
    } finally {
      setSavingNotifs(false);
    }
  };

  // ── Handlers: Privacy ─────────────────────────────────────────────────
  const handleSavePrivacy = async () => {
    try {
      setSavingPrivacy(true);
      await settingsService.updatePrivacy(privacy);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      notify("Privacy settings saved.", "success");
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to save privacy settings.", "error");
    } finally {
      setSavingPrivacy(false);
    }
  };

  // ── Handlers: Connected Accounts ─────────────────────────────────────
  const handleConnect = async (provider: "google" | "github") => {
    try {
      setConnecting(provider);
      const account = provider === "google" ? await connectGoogleAccount() : await connectGithubAccount();
      await settingsService.connectOAuth(provider, account.uid);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      notify(`${provider === "google" ? "Google" : "GitHub"} account connected.`, "success");
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || `Failed to connect ${provider}.`, "error");
    } finally {
      setConnecting(null);
    }
  };

  const handleDisconnect = async (provider: "google" | "github") => {
    try {
      setDisconnecting(provider);
      await settingsService.disconnectOAuth(provider);
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      notify(`${provider === "google" ? "Google" : "GitHub"} account disconnected.`, "success");
    } catch (err: any) {
      notify(err.response?.data?.message || `Failed to disconnect ${provider}.`, "error");
    } finally {
      setDisconnecting(null);
    }
  };

  // ── Handlers: Preferences ─────────────────────────────────────────────
  const handleThemeChange = async (next: ThemeMode) => {
    setMode(next);
    try {
      setSavingPreferences(true);
      await settingsService.updatePreferences({ theme: next });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch {
      notify("Theme applied locally, but failed to save to your account.", "error");
    } finally {
      setSavingPreferences(false);
    }
  };

  const handleLanguageChange = async (next: string) => {
    setLanguage(next);
    try {
      setSavingPreferences(true);
      await settingsService.updatePreferences({ language: next });
      queryClient.invalidateQueries({ queryKey: ["settings"] });
      notify("Language preference saved.", "success");
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to save language preference.", "error");
    } finally {
      setSavingPreferences(false);
    }
  };

  // ── Handlers: Danger Zone ─────────────────────────────────────────────
  const handleScheduleDeletion = async () => {
    if (deleteConfirmText.trim().toUpperCase() !== "DELETE") {
      notify('Type "DELETE" to confirm.', "error");
      return;
    }
    if (user?.provider === "local" && !deletePassword) {
      notify("Please enter your password to confirm.", "error");
      return;
    }
    try {
      setDeleting(true);
      const res = await settingsService.scheduleAccountDeletion(deletePassword);
      notify(res.message || "Account deletion scheduled.", "success");
      setDeleteModalOpen(false);
      setDeletePassword("");
      setDeleteConfirmText("");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to schedule account deletion.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const handleCancelDeletion = async () => {
    try {
      setCancellingDeletion(true);
      await settingsService.cancelAccountDeletion();
      notify("Account deletion cancelled.", "success");
      queryClient.invalidateQueries({ queryKey: ["settings"] });
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to cancel account deletion.", "error");
    } finally {
      setCancellingDeletion(false);
    }
  };

  return (
    <DashboardLayout navItems={navItems} tagline="Freelance Hub" searchPlaceholder="Search settings...">
      <h1 className="mb-6 text-2xl font-extrabold text-ink-900">Settings</h1>

      <div className="grid gap-6 lg:grid-cols-[220px_1fr]">
        <div className="flex gap-1 overflow-x-auto lg:flex-col">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={cn(
                "whitespace-nowrap rounded-xl px-4 py-2.5 text-left text-sm font-semibold transition-colors",
                tab === t
                  ? t === "Danger Zone"
                    ? "bg-red-50 text-danger"
                    : "bg-brand-50 text-brand-700"
                  : "text-ink-500 hover:bg-surface-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
          {loadingSettings && tab !== "Profile" && tab !== "Billing" && tab !== "Earnings" ? (
            <div className="flex h-48 items-center justify-center">
              <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
            </div>
          ) : (
            <>
              {tab === "Profile" && (
                <div className="space-y-5">
                  <div className="flex items-center gap-4">
                    <Avatar src={user?.avatar || user?.avatarUrl} name={user?.fullName || "User"} size="xl" />
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={handleAvatarChange}
                      accept="image/*"
                      className="hidden"
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      isLoading={uploadingAvatar}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Change Photo
                    </Button>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Input
                      label="Full Name"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      error={profileErrors.fullName}
                    />
                    <Input label="Email" value={email} disabled type="email" hint="Email address cannot be changed." />
                    <Input label="Title" value={title} onChange={(e) => setTitle(e.target.value)} />
                    <Input label="Location" value={location} onChange={(e) => setLocation(e.target.value)} />
                    <Input
                      label="Hourly Rate (₹/hr)"
                      type="number"
                      min={0}
                      value={hourlyRate || ""}
                      onChange={(e) => setHourlyRate(e.target.value === "" ? 0 : Number(e.target.value))}
                      error={profileErrors.hourlyRate}
                    />
                    <Input
                      label="Skills (comma separated, e.g. React, Python, AI)"
                      value={skills}
                      onChange={(e) => setSkills(e.target.value)}
                    />
                    <div className="sm:col-span-2">
                      <Textarea label="Bio / About" value={bio} rows={4} onChange={(e) => setBio(e.target.value)} />
                    </div>
                  </div>
                  <Button onClick={handleSaveChanges} isLoading={updatingProfile}>
                    Save Changes
                  </Button>
                </div>
              )}

              {tab === "Notifications" && (
                <div className="space-y-6">
                  <div>
                    <h3 className="mb-3 text-sm font-bold text-ink-900">Email Preferences</h3>
                    <Select
                      label="Email Digest Frequency"
                      value={notifPrefs.emailDigest}
                      onChange={(e) => setNotifPrefs({ ...notifPrefs, emailDigest: e.target.value as any })}
                    >
                      <option value="daily">Daily</option>
                      <option value="weekly">Weekly</option>
                      <option value="monthly">Monthly</option>
                      <option value="never">Never</option>
                    </Select>
                  </div>

                  <div className="h-px bg-surface-border" />

                  <div className="space-y-3">
                    <h3 className="text-sm font-bold text-ink-900">Notification Settings</h3>
                    {[
                      { key: "emailNotifications", title: "Email Notifications", desc: "Get proposal and payment updates by email." },
                      { key: "pushNotifications", title: "Push Notifications", desc: "Get real-time alerts on your device." },
                      { key: "jobAlerts", title: "Job Alerts", desc: "Be notified when new jobs match your skills." },
                      { key: "proposalUpdates", title: "Proposal Updates", desc: "Status changes on proposals you've submitted." },
                      { key: "projectUpdates", title: "Project Updates", desc: "Milestone and progress updates on active projects." },
                      { key: "paymentUpdates", title: "Payment Updates", desc: "Escrow releases, payouts, and invoices." },
                      { key: "messageNotifications", title: "Message Notifications", desc: "New messages from clients or freelancers." },
                      { key: "reviewNotifications", title: "Review Notifications", desc: "When you receive a new review." },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between rounded-xl bg-surface-muted p-4">
                        <div>
                          <p className="font-semibold text-ink-900">{item.title}</p>
                          <p className="text-sm text-ink-500">{item.desc}</p>
                        </div>
                        <Toggle
                          checked={(notifPrefs as any)[item.key]}
                          onChange={(v) => setNotifPrefs({ ...notifPrefs, [item.key]: v })}
                        />
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleSaveNotifications} isLoading={savingNotifs}>
                    Save Notification Settings
                  </Button>
                </div>
              )}

              {tab === "Privacy" && (
                <div className="space-y-6">
                  <Select
                    label="Profile Visibility"
                    value={privacy.profileVisibility}
                    onChange={(e) => setPrivacy({ ...privacy, profileVisibility: e.target.value as any })}
                  >
                    <option value="public">Public — visible to everyone</option>
                    <option value="connections">Connections — visible to people you've worked with</option>
                    <option value="private">Private — hidden from search</option>
                  </Select>

                  <div className="space-y-3">
                    {[
                      { key: "showEmail", title: "Show Email on Profile", desc: "Let others see your email address." },
                      { key: "showPhone", title: "Show Phone on Profile", desc: "Let others see your phone number." },
                      { key: "allowMessages", title: "Allow Direct Messages", desc: "Let other users message you first." },
                      { key: "allowInvitations", title: "Allow Job Invitations", desc: "Let clients invite you to jobs directly." },
                      { key: "showActivityStatus", title: "Show Activity Status", desc: "Display your online/last-seen status." },
                    ].map((item) => (
                      <div key={item.key} className="flex items-center justify-between rounded-xl bg-surface-muted p-4">
                        <div>
                          <p className="font-semibold text-ink-900">{item.title}</p>
                          <p className="text-sm text-ink-500">{item.desc}</p>
                        </div>
                        <Toggle
                          checked={(privacy as any)[item.key]}
                          onChange={(v) => setPrivacy({ ...privacy, [item.key]: v })}
                        />
                      </div>
                    ))}
                  </div>

                  <Button onClick={handleSavePrivacy} isLoading={savingPrivacy}>
                    Save Privacy Settings
                  </Button>
                </div>
              )}

              {tab === "Connected Accounts" && (
                <div className="space-y-4">
                  <p className="text-sm text-ink-500">
                    Link your Google or GitHub account for faster sign-in and account recovery.
                  </p>

                  <div className="flex items-center justify-between rounded-xl border border-surface-border p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
                        <SiGoogle className="h-4 w-4 text-ink-700" />
                      </span>
                      <div>
                        <p className="font-semibold text-ink-900">Google</p>
                        <p className="text-xs text-ink-400">
                          {user?.provider === "google" || connectedAccounts.google
                            ? "Connected"
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                    {user?.provider === "google" ? (
                      <Badge tone="success">Primary sign-in</Badge>
                    ) : connectedAccounts.google ? (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={disconnecting === "google"}
                        onClick={() => handleDisconnect("google")}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button size="sm" isLoading={connecting === "google"} onClick={() => handleConnect("google")}>
                        Connect
                      </Button>
                    )}
                  </div>

                  <div className="flex items-center justify-between rounded-xl border border-surface-border p-4">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 items-center justify-center rounded-full bg-surface-muted">
                        <SiGithub className="h-5 w-5 text-ink-700" />
                      </span>
                      <div>
                        <p className="font-semibold text-ink-900">GitHub</p>
                        <p className="text-xs text-ink-400">
                          {user?.provider === "github" || connectedAccounts.github
                            ? "Connected"
                            : "Not connected"}
                        </p>
                      </div>
                    </div>
                    {user?.provider === "github" ? (
                      <Badge tone="success">Primary sign-in</Badge>
                    ) : connectedAccounts.github ? (
                      <Button
                        size="sm"
                        variant="outline"
                        isLoading={disconnecting === "github"}
                        onClick={() => handleDisconnect("github")}
                      >
                        Disconnect
                      </Button>
                    ) : (
                      <Button size="sm" isLoading={connecting === "github"} onClick={() => handleConnect("github")}>
                        Connect
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {tab === "Preferences" && (
                <div className="space-y-6">
                  <div>
                    <p className="mb-2 text-sm font-medium text-ink-700">Theme</p>
                    <div className="grid grid-cols-3 gap-2 rounded-xl bg-surface-muted p-1">
                      {(["light", "dark", "system"] as ThemeMode[]).map((m) => (
                        <button
                          key={m}
                          onClick={() => handleThemeChange(m)}
                          disabled={savingPreferences}
                          className={cn(
                            "rounded-lg py-2 text-sm font-semibold capitalize transition-colors disabled:opacity-50",
                            mode === m ? "bg-surface-card text-brand-600 shadow-sm" : "text-ink-500"
                          )}
                        >
                          {m}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Select
                    label="Language"
                    value={language}
                    onChange={(e) => handleLanguageChange(e.target.value)}
                    disabled={savingPreferences}
                  >
                    <option value="en">English</option>
                    <option value="es">Español (coming soon)</option>
                    <option value="fr">Français (coming soon)</option>
                    <option value="hi">हिन्दी (coming soon)</option>
                    <option value="de">Deutsch (coming soon)</option>
                  </Select>
                  <p className="text-xs text-ink-400">
                    Nexora currently runs in English — your selection is saved and will apply automatically once
                    additional languages ship.
                  </p>
                </div>
              )}

              {tab === "Billing" && (
                <div className="space-y-4">
                  <p className="text-sm text-ink-500">Manage your payment methods and billing history.</p>
                  <div className="flex items-center justify-between rounded-xl border border-surface-border p-4">
                    <span className="text-sm font-semibold text-ink-900">Visa ending in 4242</span>
                    <Button size="sm" variant="outline">
                      Update
                    </Button>
                  </div>
                </div>
              )}

              {tab === "Earnings" && (
                <div className="space-y-6">
                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="rounded-xl border border-surface-border bg-surface-muted p-4 text-center">
                      <p className="text-xs uppercase font-semibold text-ink-400">
                        {user?.role === "client" ? "Total Spent" : "Total Earned"}
                      </p>
                      <p className="text-xl font-bold text-ink-900">${totalEarned.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-surface-border bg-surface-muted p-4 text-center">
                      <p className="text-xs uppercase font-semibold text-ink-400">In Escrow</p>
                      <p className="text-xl font-bold text-brand-600">${pendingEscrow.toLocaleString()}</p>
                    </div>
                    <div className="rounded-xl border border-surface-border bg-surface-muted p-4 text-center">
                      <p className="text-xs uppercase font-semibold text-ink-400">
                        {user?.role === "client" ? "Total Refunded" : "Available to Withdraw"}
                      </p>
                      <p className="text-xl font-bold text-success">
                        {user?.role === "client" ? "$0.00" : `$${totalEarned.toLocaleString()}`}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h3 className="text-sm font-bold text-ink-900 mb-3">Transaction Ledger</h3>
                    {transactions.length === 0 ? (
                      <p className="text-sm text-ink-400">No payment logs recorded yet.</p>
                    ) : (
                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-sm text-ink-700">
                          <thead>
                            <tr className="border-b border-surface-border text-xs uppercase text-ink-400">
                              <th className="pb-2">Description</th>
                              <th className="pb-2">Amount</th>
                              <th className="pb-2">Status</th>
                              <th className="pb-2">Date</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border">
                            {transactions.map((tx: any) => (
                              <tr key={tx.id || tx._id} className="py-2.5">
                                <td className="py-2.5 font-semibold text-ink-900">{tx.projectTitle}</td>
                                <td className="py-2.5 font-bold">${tx.amount.toLocaleString()}</td>
                                <td className="py-2.5 capitalize">
                                  <Badge tone={tx.status === "completed" ? "success" : "warning"}>{tx.status}</Badge>
                                </td>
                                <td className="py-2.5">{tx.date ? new Date(tx.date).toLocaleDateString() : "N/A"}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === "Danger Zone" && (
                <div className="space-y-5">
                  {deletionScheduled?.scheduled ? (
                    <div className="rounded-xl border border-amber-300 bg-amber-50 p-5">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-warning" />
                        <div className="flex-1">
                          <p className="font-bold text-ink-900">Account deletion scheduled</p>
                          <p className="mt-1 text-sm text-ink-700">
                            Your account will be permanently deleted on{" "}
                            {deletionScheduled.scheduledFor
                              ? new Date(deletionScheduled.scheduledFor).toLocaleDateString()
                              : "the scheduled date"}
                            . You can cancel this at any time before then.
                          </p>
                          <Button
                            size="sm"
                            variant="outline"
                            className="mt-3"
                            isLoading={cancellingDeletion}
                            onClick={handleCancelDeletion}
                          >
                            Cancel Deletion
                          </Button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="rounded-xl border border-red-200 bg-red-50 p-5">
                      <div className="flex items-start gap-3">
                        <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-danger" />
                        <div>
                          <p className="font-bold text-ink-900">Delete Account</p>
                          <p className="mt-1 text-sm text-ink-700">
                            Deleting your account schedules permanent removal of your profile, proposals, contracts, and
                            messages in 30 days. You can cancel any time before then.
                          </p>
                          <Button size="sm" variant="danger" className="mt-3" icon={<Trash2 className="h-4 w-4" />} iconPosition="left" onClick={() => setDeleteModalOpen(true)}>
                            Delete My Account
                          </Button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      <Modal isOpen={deleteModalOpen} onClose={() => setDeleteModalOpen(false)} title="Delete your account?">
        <div className="space-y-4">
          <p className="text-sm text-ink-700">
            This schedules your account for permanent deletion in 30 days. Type <span className="font-bold">DELETE</span> to confirm.
          </p>
          <Input
            label='Type "DELETE" to confirm'
            value={deleteConfirmText}
            onChange={(e) => setDeleteConfirmText(e.target.value)}
            placeholder="DELETE"
          />
          {user?.provider === "local" && (
            <Input
              label="Password"
              type="password"
              value={deletePassword}
              onChange={(e) => setDeletePassword(e.target.value)}
              placeholder="Enter your password"
            />
          )}
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setDeleteModalOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={deleting} onClick={handleScheduleDeletion}>
              Confirm Deletion
            </Button>
          </div>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
