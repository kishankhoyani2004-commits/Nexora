import { useState } from "react";
import { Download, UserPlus, Pencil, Mail, Ban, Users, UserPlus2, ShieldAlert } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { DarkStatCard } from "@/components/cards/DarkStatCard";
import { SignupTrendsChart } from "@/components/charts/SignupTrendsChart";
import { ADMIN_USERS, SIGNUP_TRENDS_DATA } from "@/constants/mockData";
import { Avatar } from "@/components/ui/Avatar";
import { formatCurrency } from "@/utils/formatters";
import { cn } from "@/utils/cn";

const TABS = ["All Users", "Freelancers", "Clients", "Admins"] as const;

const statusStyles = {
  active: "text-emerald-400",
  pending: "text-amber-400",
  banned: "text-red-400",
};

export default function AdminUsers() {
  const [tab, setTab] = useState<(typeof TABS)[number]>("All Users");

  const filtered = ADMIN_USERS.filter((u) => {
    if (tab === "All Users") return true;
    if (tab === "Freelancers") return u.role === "freelancer";
    if (tab === "Clients") return u.role === "client";
    return u.role === "admin";
  });

  return (
    <AdminLayout title="User Management" breadcrumb="Admin · Users">
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-3">
        <DarkStatCard label="Total Users" value="124,842" delta="+12% from last month" icon={Users} />
        <DarkStatCard label="New Signups Today" value="452" note="Active peak hour" icon={UserPlus2} />
        <DarkStatCard label="Verification Backlog" value="28" note="Needs urgent review" icon={ShieldAlert} />
      </div>

      <div className="rounded-2xl border border-dark-border bg-dark-surface p-6">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex gap-1 rounded-xl bg-dark-surface-2 p-1">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  "rounded-lg px-4 py-2 text-sm font-semibold transition-colors",
                  tab === t ? "bg-brand-600 text-white" : "text-dark-text-dim"
                )}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex gap-2">
            <button className="flex items-center gap-1.5 rounded-xl border border-dark-border px-3.5 py-2 text-sm font-semibold text-dark-text-dim">
              <Download className="h-4 w-4" /> Export Data
            </button>
            <button className="flex items-center gap-1.5 rounded-xl bg-white px-3.5 py-2 text-sm font-semibold text-dark-bg">
              <UserPlus className="h-4 w-4" /> Create User
            </button>
          </div>
        </div>

        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-dark-text-dim">
              <th className="pb-3">Avatar / Name</th>
              <th className="pb-3">Role</th>
              <th className="pb-3">Status</th>
              <th className="pb-3">Last Active</th>
              <th className="pb-3">Earnings / Spend</th>
              <th className="pb-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((u) => (
              <tr key={u.id} className="border-t border-dark-border">
                <td className="py-4">
                  <div className="flex items-center gap-3">
                    <Avatar src={u.avatarUrl} name={u.name} size="sm" />
                    <div>
                      <p className={cn("font-semibold text-white", u.status === "banned" && "line-through opacity-60")}>
                        {u.name}
                      </p>
                      <p className="text-xs text-dark-text-dim">{u.email}</p>
                    </div>
                  </div>
                </td>
                <td className="py-4 capitalize text-dark-text-dim">{u.role}</td>
                <td className={cn("py-4 font-semibold capitalize", statusStyles[u.status])}>{u.status}</td>
                <td className="py-4 text-dark-text-dim">{u.lastActive}</td>
                <td className="py-4">
                  <p className="font-semibold text-white">{formatCurrency(u.amount)}</p>
                  <p className="text-xs text-dark-text-dim">{u.amountLabel}</p>
                </td>
                <td className="py-4">
                  <div className="flex gap-2 text-dark-text-dim">
                    <button aria-label="Edit user" className="hover:text-white"><Pencil className="h-4 w-4" /></button>
                    <button aria-label="Email user" className="hover:text-white"><Mail className="h-4 w-4" /></button>
                    <button aria-label="Ban user" className="hover:text-red-400"><Ban className="h-4 w-4" /></button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-4 text-xs text-dark-text-dim">Showing 1 - {filtered.length} of 124,842 users</p>
      </div>

      <div className="mt-6 rounded-2xl border border-dark-border bg-dark-surface p-6">
        <h2 className="mb-1 text-lg font-bold text-white">Signup Trends (Last 24h)</h2>
        <SignupTrendsChart data={SIGNUP_TRENDS_DATA} />
      </div>
    </AdminLayout>
  );
}
