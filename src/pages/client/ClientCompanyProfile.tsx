import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Building2, Camera, Briefcase, FolderKanban, CheckCircle2, Users,
  Globe, Phone, Mail, MapPin, X, Trash2, KeyRound,
} from "lucide-react";
import { FaLinkedin, FaInstagram, FaFacebook, FaXTwitter } from "react-icons/fa6";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Textarea } from "@/components/ui/Textarea";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { userService } from "@/services/user.service";
import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";
import { cn } from "@/utils/cn";

const COMPANY_SIZES = ["1-10", "11-50", "51-200", "201-500", "500+"];

interface ClientStats {
  totalJobs: number;
  activeProjects: number;
  completedProjects: number;
  totalHires: number;
  memberSince: string;
}

interface FormState {
  companyName: string;
  ownerName: string;
  phone: string;
  website: string;
  industry: string;
  companySize: string;
  country: string;
  state: string;
  city: string;
  address: string;
  gstId: string;
  bio: string; // Company Description
  linkedin: string;
  x: string;
  facebook: string;
  instagram: string;
}

function formStateFromUser(user: any): FormState {
  return {
    companyName: user?.companyName || "",
    ownerName: user?.ownerName || "",
    phone: user?.phone || "",
    website: user?.website || "",
    industry: user?.industry || "",
    companySize: user?.companySize || "",
    country: user?.country || "",
    state: user?.state || "",
    city: user?.city || "",
    address: user?.address || "",
    gstId: user?.gstId || "",
    bio: user?.bio || "",
    linkedin: user?.socialLinks?.linkedin || "",
    x: user?.socialLinks?.twitter || "",
    facebook: user?.socialLinks?.facebook || "",
    instagram: user?.socialLinks?.instagram || "",
  };
}

export default function ClientCompanyProfile() {
  const { user, updateUser, logout } = useAuth();
  const { notify } = useNotification();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [isEditing, setIsEditing] = useState(false);
  const [form, setForm] = useState<FormState>(() => formStateFromUser(user));
  const [saving, setSaving] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  // Reset the form whenever the underlying user data changes (e.g. after a
  // save) or when edit mode is (re)entered, so Cancel always reverts cleanly.
  useEffect(() => {
    setForm(formStateFromUser(user));
  }, [user, isEditing]);

  // ── Dashboard Preview stats ─────────────────────────────────────────────────
  const { data: statsRes, isLoading: loadingStats } = useQuery({
    queryKey: ["client-profile-stats"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<ClientStats>>("/dashboard/client/stats");
      return res.data;
    },
  });
  const stats = statsRes?.data;

  const myId = user?.id || user?._id || "";

  // ── Save / Cancel ────────────────────────────────────────────────────────────
  const handleSave = async () => {
    if (!user) return;
    try {
      setSaving(true);
      const res = await userService.updateProfile(myId, {
        companyName: form.companyName,
        ownerName: form.ownerName,
        phone: form.phone,
        website: form.website,
        industry: form.industry,
        companySize: form.companySize,
        country: form.country,
        state: form.state,
        city: form.city,
        address: form.address,
        gstId: form.gstId,
        bio: form.bio,
        socialLinks: {
          linkedin: form.linkedin,
          twitter: form.x,
          facebook: form.facebook,
          instagram: form.instagram,
        },
      } as any);
      const updatedUser = (res.data as any).user || res.data.data;
      if (updatedUser) {
        updateUser(updatedUser);
        notify("Company profile updated successfully.", "success");
        setIsEditing(false);
      }
    } catch (err: any) {
      notify(err.response?.data?.message || err.message || "Failed to save changes.", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleCancel = () => {
    setForm(formStateFromUser(user));
    setIsEditing(false);
  };

  // ── Logo upload ──────────────────────────────────────────────────────────────
  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    const formData = new FormData();
    formData.append("avatar", file);

    try {
      setUploadingLogo(true);
      const res = await userService.uploadAvatar(myId, formData);
      const newAvatarUrl = (res.data as any).avatar || res.data.data?.avatarUrl || (res.data as any).avatarUrl;
      if (newAvatarUrl) {
        updateUser({ ...user, avatar: newAvatarUrl });
        notify("Company logo updated successfully.", "success");
      }
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to upload logo.", "error");
    } finally {
      setUploadingLogo(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  // ── Change Password modal ───────────────────────────────────────────────────
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [changingPassword, setChangingPassword] = useState(false);

  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      notify("New password and confirmation do not match.", "error");
      return;
    }
    if (newPassword.length < 6) {
      notify("New password must be at least 6 characters.", "error");
      return;
    }
    try {
      setChangingPassword(true);
      await userService.changePassword(currentPassword, newPassword);
      notify("Password changed successfully.", "success");
      setShowPasswordModal(false);
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to change password.", "error");
    } finally {
      setChangingPassword(false);
    }
  };

  // ── Delete Account modal ─────────────────────────────────────────────────────
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletePassword, setDeletePassword] = useState("");
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== "DELETE") {
      notify('Type "DELETE" to confirm.', "error");
      return;
    }
    try {
      setDeleting(true);
      await userService.deleteAccount(deletePassword || undefined);
      notify("Account deleted. We're sorry to see you go.", "success");
      await logout();
      navigate("/");
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to delete account.", "error");
    } finally {
      setDeleting(false);
    }
  };

  const set = <K extends keyof FormState>(key: K) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((prev) => ({ ...prev, [key]: e.target.value }));

  return (
    <DashboardLayout tagline="Client Portal" searchPlaceholder="Search...">
      <div className="mx-auto max-w-5xl space-y-6">
        {/* ── Header ── */}
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-ink-900">Company Profile</h1>
            <p className="text-sm text-ink-500">Manage your company details and account settings.</p>
          </div>
          <div className="flex gap-2">
            {isEditing ? (
              <>
                <Button variant="outline" onClick={handleCancel} disabled={saving}>
                  Cancel Changes
                </Button>
                <Button onClick={handleSave} isLoading={saving}>
                  Save Changes
                </Button>
              </>
            ) : (
              <Button onClick={() => setIsEditing(true)}>Edit Profile</Button>
            )}
          </div>
        </div>

        {/* ── Dashboard Preview ── */}
        <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
          <div className="flex flex-wrap items-center gap-4 mb-5">
            <div className="relative">
              <Avatar src={user?.avatar || user?.avatarUrl} name={user?.companyName || user?.fullName || "Company"} size="xl" />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingLogo}
                className="absolute -bottom-1 -right-1 flex h-7 w-7 items-center justify-center rounded-full bg-brand-600 text-white shadow-sm hover:bg-brand-700 transition-colors disabled:opacity-50"
                aria-label="Change company logo"
                title="Change company logo"
              >
                <Camera className="h-3.5 w-3.5" />
              </button>
              <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
            </div>
            <div>
              <p className="text-lg font-extrabold text-ink-900">{user?.companyName || user?.fullName || "Your Company"}</p>
              <p className="text-xs text-ink-400">Member since {stats?.memberSince ? new Date(stats.memberSince).toLocaleDateString([], { month: "long", year: "numeric" }) : (user?.createdAt ? new Date(user.createdAt).toLocaleDateString([], { month: "long", year: "numeric" }) : "—")}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
            {[
              { label: "Jobs Posted", value: stats?.totalJobs, icon: Briefcase },
              { label: "Active Projects", value: stats?.activeProjects, icon: FolderKanban },
              { label: "Completed Projects", value: stats?.completedProjects, icon: CheckCircle2 },
              { label: "Total Hires", value: stats?.totalHires, icon: Users },
            ].map((s) => (
              <div key={s.label} className="rounded-2xl bg-surface-muted p-4 text-center">
                <s.icon className="h-4 w-4 text-brand-600 mx-auto mb-1.5" />
                <p className="text-xl font-extrabold text-ink-900">{loadingStats ? "…" : s.value ?? 0}</p>
                <p className="text-[10px] font-semibold uppercase tracking-wider text-ink-400 mt-0.5">{s.label}</p>
              </div>
            ))}
          </div>
        </div>

        {/* ── Company Details ── */}
        <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-5">
          <h2 className="text-lg font-bold text-ink-900 flex items-center gap-2">
            <Building2 className="h-5 w-5 text-brand-600" /> Company Details
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="Company Name" value={form.companyName} onChange={set("companyName")} disabled={!isEditing} placeholder="Acme Inc." />
            <Input label="Owner Name" value={form.ownerName} onChange={set("ownerName")} disabled={!isEditing} placeholder="Full name of the account owner" />
            <Input label="Email" value={user?.email || ""} disabled icon={<Mail className="h-4 w-4" />} hint="Email cannot be changed here." />
            <Input label="Phone Number" value={form.phone} onChange={set("phone")} disabled={!isEditing} icon={<Phone className="h-4 w-4" />} placeholder="+1 555 123 4567" />
            <Input label="Website" value={form.website} onChange={set("website")} disabled={!isEditing} icon={<Globe className="h-4 w-4" />} placeholder="https://yourcompany.com" />
            <Input label="Industry" value={form.industry} onChange={set("industry")} disabled={!isEditing} placeholder="e.g. Software, Retail, Healthcare" />

            <div className="w-full">
              <label className="mb-1.5 block text-sm font-medium text-ink-700">Company Size</label>
              <select
                value={form.companySize}
                onChange={(e) => setForm((p) => ({ ...p, companySize: e.target.value }))}
                disabled={!isEditing}
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-card px-3.5 text-sm text-ink-900 outline-none focus:border-brand-500 focus:ring-2 focus:ring-brand-100 disabled:opacity-60"
              >
                <option value="">Select size</option>
                {COMPANY_SIZES.map((s) => (
                  <option key={s} value={s}>{s} employees</option>
                ))}
              </select>
            </div>

            <Input label="GST / Tax ID (optional)" value={form.gstId} onChange={set("gstId")} disabled={!isEditing} placeholder="Optional" />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Country" value={form.country} onChange={set("country")} disabled={!isEditing} icon={<MapPin className="h-4 w-4" />} />
            <Input label="State" value={form.state} onChange={set("state")} disabled={!isEditing} />
            <Input label="City" value={form.city} onChange={set("city")} disabled={!isEditing} />
          </div>

          <Input label="Address" value={form.address} onChange={set("address")} disabled={!isEditing} placeholder="Street address" />

          <Textarea label="Company Description" value={form.bio} onChange={set("bio")} disabled={!isEditing} rows={4} placeholder="Tell freelancers about your company..." />
        </div>

        {/* ── Social Links ── */}
        <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-4">
          <h2 className="text-lg font-bold text-ink-900">Social Links</h2>
          <div className="grid gap-4 sm:grid-cols-2">
            <Input label="LinkedIn" value={form.linkedin} onChange={set("linkedin")} disabled={!isEditing} icon={<FaLinkedin className="h-4 w-4" />} placeholder="https://linkedin.com/company/..." />
            <Input label="X (Twitter)" value={form.x} onChange={set("x")} disabled={!isEditing} icon={<FaXTwitter className="h-3.5 w-3.5" />} placeholder="https://x.com/..." />
            <Input label="Facebook" value={form.facebook} onChange={set("facebook")} disabled={!isEditing} icon={<FaFacebook className="h-4 w-4" />} placeholder="https://facebook.com/..." />
            <Input label="Instagram" value={form.instagram} onChange={set("instagram")} disabled={!isEditing} icon={<FaInstagram className="h-4 w-4" />} placeholder="https://instagram.com/..." />
          </div>
        </div>

        {/* ── Security ── */}
        <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
          <h2 className="mb-1 text-lg font-bold text-ink-900 flex items-center gap-2">
            <KeyRound className="h-5 w-5 text-brand-600" /> Security
          </h2>
          <p className="text-sm text-ink-500 mb-4">Change your account password.</p>
          <Button variant="outline" onClick={() => setShowPasswordModal(true)}>Change Password</Button>
        </div>

        {/* ── Danger Zone ── */}
        <div className="rounded-3xl border border-danger/30 bg-danger/5 p-6 shadow-card">
          <h2 className="mb-1 text-lg font-bold text-danger flex items-center gap-2">
            <Trash2 className="h-5 w-5" /> Danger Zone
          </h2>
          <p className="text-sm text-ink-500 mb-4">
            Permanently delete your account and lose access to all jobs, contracts, and messages. This cannot be undone.
          </p>
          <Button variant="danger" onClick={() => setShowDeleteModal(true)}>Delete Account</Button>
        </div>
      </div>

      {/* ── Change Password Modal ── */}
      {showPasswordModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-3xl border border-surface-border bg-surface-card p-6 shadow-2xl space-y-4">
              <button
                onClick={() => setShowPasswordModal(false)}
                className="absolute right-4 top-4 text-ink-400 hover:text-ink-900 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <h3 className="text-lg font-bold text-ink-900">Change Password</h3>
              <form onSubmit={handleChangePassword} className="space-y-4">
                <Input label="Current Password" type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                <Input label="New Password" type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required minLength={6} />
                <Input label="Confirm New Password" type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required minLength={6} />
                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" onClick={() => setShowPasswordModal(false)}>Cancel</Button>
                  <Button type="submit" isLoading={changingPassword}>Update Password</Button>
                </div>
              </form>
            </div>
          </div>,
          document.body
        )}

      {/* ── Delete Account Modal ── */}
      {showDeleteModal &&
        createPortal(
          <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
            <div className="relative w-full max-w-md rounded-3xl border border-surface-border bg-surface-card p-6 shadow-2xl space-y-4">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="absolute right-4 top-4 text-ink-400 hover:text-ink-900 transition-colors"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-danger/10 text-danger">
                <Trash2 className="h-6 w-6" />
              </div>
              <h3 className="text-lg font-bold text-ink-900">Delete Your Account?</h3>
              <p className="text-sm text-ink-500">
                This permanently deletes your account. Jobs, contracts, and messages tied to it may become
                inaccessible. This action cannot be undone.
              </p>
              <div className="space-y-3">
                {user?.provider === "local" && (
                  <Input
                    label="Confirm Your Password"
                    type="password"
                    value={deletePassword}
                    onChange={(e) => setDeletePassword(e.target.value)}
                    required
                  />
                )}
                <Input
                  label='Type "DELETE" to confirm'
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="DELETE"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button variant="outline" onClick={() => setShowDeleteModal(false)} disabled={deleting}>Cancel</Button>
                <Button variant="danger" onClick={handleDeleteAccount} isLoading={deleting}>
                  Delete Account
                </Button>
              </div>
            </div>
          </div>,
          document.body
        )}
    </DashboardLayout>
  );
}
