import { DollarSign, Users, Cpu, Zap, Sparkles, Plus } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { DarkStatCard } from "@/components/cards/DarkStatCard";
import { RevenueUsageChart } from "@/components/charts/RevenueUsageChart";
import { REVENUE_AI_USAGE_DATA, ADMIN_USERS } from "@/constants/mockData";
import { formatCurrency } from "@/utils/formatters";

export default function AdminAnalytics() {
  return (
    <AdminLayout title="Platform Overview" breadcrumb="Admin · Analytics">
      <div className="mb-6 grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-4">
        <DarkStatCard label="Total Revenue" value="₹33.6M" delta="+12%" icon={DollarSign} />
        <DarkStatCard label="Active Users" value="85,240" delta="+5%" icon={Users} />
        <DarkStatCard label="AI Processing Load" value="24%" note="Load distributed" icon={Cpu} />
        <DarkStatCard label="System Health" value="99.9%" note="Average Uptime / 30 Days" icon={Zap} />
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-dark-border bg-dark-surface p-6 xl:col-span-2">
          <h2 className="text-lg font-bold text-white">Revenue x AI Usage</h2>
          <p className="mb-4 text-sm text-dark-text-dim">Correlation between token expenditure and GMV</p>
          <RevenueUsageChart data={REVENUE_AI_USAGE_DATA} />
        </div>

        <div className="rounded-2xl border border-dark-border bg-dark-surface p-6">
          <h2 className="text-lg font-bold text-white">User Distribution</h2>
          <p className="mb-6 text-sm text-dark-text-dim">Role allocation across platform</p>
          <div className="relative mx-auto flex h-40 w-40 items-center justify-center rounded-full border-[14px] border-brand-500" style={{ borderRightColor: "#c084fc", borderBottomColor: "#c084fc" }}>
            <div className="text-center">
              <p className="text-2xl font-extrabold text-white">85k</p>
              <p className="text-xs text-dark-text-dim">TOTAL USERS</p>
            </div>
          </div>
          <div className="mt-6 flex justify-between text-sm">
            <span className="flex items-center gap-2 text-dark-text-dim">
              <span className="h-2.5 w-2.5 rounded-full bg-brand-500" /> Freelancers <b className="text-white">62%</b>
            </span>
            <span className="flex items-center gap-2 text-dark-text-dim">
              <span className="h-2.5 w-2.5 rounded-full bg-violet-400" /> Clients <b className="text-white">38%</b>
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-dark-border bg-dark-surface p-6 xl:col-span-2">
          <div className="mb-4 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Pending Approvals</h2>
              <p className="text-sm text-dark-text-dim">New freelancer application review queue</p>
            </div>
            <a href="#" className="text-sm font-semibold text-brand-400">View All (14)</a>
          </div>
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-dark-text-dim">
                <th className="pb-3">Freelancer</th>
                <th className="pb-3">Specialization</th>
                <th className="pb-3">Score</th>
                <th className="pb-3">Action</th>
              </tr>
            </thead>
            <tbody>
              {ADMIN_USERS.filter((u) => u.role === "freelancer").map((u) => (
                <tr key={u.id} className="border-t border-dark-border">
                  <td className="py-3">
                    <p className="font-semibold text-white">{u.name}</p>
                    <p className="text-xs text-dark-text-dim">{u.email}</p>
                  </td>
                  <td className="py-3 text-dark-text-dim">AI Modeling</td>
                  <td className="py-3 font-bold text-amber-400">98/100</td>
                  <td className="py-3">
                    <span className="mr-2 rounded-full bg-emerald-500/10 px-2.5 py-1 text-xs text-emerald-400">Approve</span>
                    <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-xs text-red-400">Reject</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="rounded-2xl border border-brand-800 bg-gradient-to-b from-brand-900/40 to-dark-surface p-6">
          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-brand-400">
            <Sparkles className="h-3.5 w-3.5" /> AI Intelligence Unit
          </p>
          <h2 className="mb-4 text-lg font-bold text-white">Optimization Suggestions</h2>
          <div className="mb-3 rounded-xl bg-dark-surface-2 p-3">
            <p className="text-xs font-semibold text-emerald-400">Efficiency Peak</p>
            <p className="mt-1 text-sm text-dark-text-dim">
              Switching 'Code Review' to Llama 3-70B decreased token cost by 14% without quality drop.
            </p>
          </div>
          <div className="rounded-xl bg-dark-surface-2 p-3">
            <p className="text-xs font-semibold text-amber-400">Scale Warning</p>
            <p className="mt-1 text-sm text-dark-text-dim">
              Prediction: user growth in 'Client Management' will hit server limits in 12 days.
            </p>
          </div>
          <button className="mt-4 flex items-center gap-1.5 text-sm font-semibold text-brand-400">
            <Plus className="h-4 w-4" /> Add a suggestion rule
          </button>
        </div>
      </div>
      <p className="mt-6 text-xs text-dark-text-dim">
        Revenue figures shown: {formatCurrency(4200000, { compact: true })} across the selected period.
      </p>
    </AdminLayout>
  );
}
