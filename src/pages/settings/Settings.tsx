import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { Button } from "@/components/ui/Button";
import { Toggle } from "@/components/ui/Toggle";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { CLIENT_NAV, FREELANCER_NAV, ADMIN_NAV } from "@/constants/nav";
import { cn } from "@/utils/cn";
import { useQuery } from "@tanstack/react-query";
import { apiClient } from "@/lib/axios";
import { userService } from "@/services/user.service";

const TABS = ["Profile", "Notifications", "Security", "Billing", "Earnings"] as const;

export default function Settings() {
  const { user, updateUser } = useAuth();
  const { notify } = useNotification();
  const [searchParams] = useSearchParams();

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form states
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [title, setTitle] = useState("");
  const [location, setLocation] = useState("");
  const [hourlyRate, setHourlyRate] = useState<number>(0);
  const [bio, setBio] = useState("");
  const [skills, setSkills] = useState("");

  const [updatingProfile, setUpdatingProfile] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Support query param ?tab=Earnings to open the correct tab automatically
  const paramTab = searchParams.get("tab") as any;
  const initialTab = TABS.includes(paramTab) ? paramTab : "Profile";

  const [tab, setTab] = useState<(typeof TABS)[number]>(initialTab);
  const [emailNotifs, setEmailNotifs] = useState(true);
  const [pushNotifs, setPushNotifs] = useState(false);

  // Synchronize user fields
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

  // Query transaction history from payments API
  const { data: txResponse } = useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      const res = await apiClient.get("/payments/history");
      return res.data;
    },
    enabled: tab === "Earnings",
  });

  const transactions = txResponse?.data || [];

  // Calculate stats from payments/escrow history
  const totalEarned = transactions
    .filter((tx: any) => tx.status === "completed")
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  const pendingEscrow = transactions
    .filter((tx: any) => tx.status === "pending")
    .reduce((sum: number, tx: any) => sum + tx.amount, 0);

  // Handlers
  const handleSaveChanges = async () => {
    if (!user) return;
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
        notify("Profile updated successfully", "success");
      }
    } catch (err: any) {
      notify(err.message || "Failed to update profile.", "error");
    } finally {
      setUpdatingProfile(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

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
      notify(err.message || "Failed to upload photo.", "error");
    } finally {
      setUploadingAvatar(false);
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
                tab === t ? "bg-brand-50 text-brand-700" : "text-ink-500 hover:bg-surface-muted"
              )}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
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
                />
                <Input
                  label="Email"
                  value={email}
                  disabled
                  type="email"
                />
                <Input
                  label="Title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
                <Input
                  label="Location"
                  value={location}
                  onChange={(e) => setLocation(e.target.value)}
                />
                <Input
                  label="Hourly Rate (₹/hr)"
                  type="number"
                  value={hourlyRate}
                  onChange={(e) => setHourlyRate(Number(e.target.value))}
                />
                <Input
                  label="Skills (Comma separated, e.g. React, Python, AI)"
                  value={skills}
                  onChange={(e) => setSkills(e.target.value)}
                />
                <div className="sm:col-span-2">
                  <Textarea
                    label="Bio / About"
                    value={bio}
                    rows={4}
                    onChange={(e) => setBio(e.target.value)}
                  />
                </div>
              </div>
              <Button
                onClick={handleSaveChanges}
                isLoading={updatingProfile}
              >
                Save Changes
              </Button>
            </div>
          )}

          {tab === "Notifications" && (
            <div className="space-y-5">
              <div className="flex items-center justify-between rounded-xl bg-surface-muted p-4">
                <div>
                  <p className="font-semibold text-ink-900">Email Notifications</p>
                  <p className="text-sm text-ink-500">Get proposal and payment updates by email.</p>
                </div>
                <Toggle checked={emailNotifs} onChange={setEmailNotifs} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-surface-muted p-4">
                <div>
                  <p className="font-semibold text-ink-900">Push Notifications</p>
                  <p className="text-sm text-ink-500">Get real-time alerts on your device.</p>
                </div>
                <Toggle checked={pushNotifs} onChange={setPushNotifs} />
              </div>
            </div>
          )}

          {tab === "Security" && (
            <div className="space-y-4">
              <Input label="Current Password" type="password" />
              <Input label="New Password" type="password" />
              <Input label="Confirm New Password" type="password" />
              <Button onClick={() => notify("Password updated", "success")}>Update Password</Button>
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
                              <Badge tone={tx.status === "completed" ? "success" : "warning"}>
                                {tx.status}
                              </Badge>
                            </td>
                            <td className="py-2.5">
                              {tx.date ? new Date(tx.date).toLocaleDateString() : "N/A"}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
