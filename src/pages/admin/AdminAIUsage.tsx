import { Target, Repeat } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { LineChart, Line, ResponsiveContainer, Tooltip } from "recharts";

const PROPOSAL_DATA = Array.from({ length: 20 }, (_, i) => ({
  t: i,
  v: 40 + Math.round(30 * Math.sin(i / 2)) + Math.round(Math.random() * 10),
}));

const TOKEN_USAGE = [
  { label: "Proposal Assistant", value: "64.2M", pct: 85, color: "bg-brand-500" },
  { label: "Job Desc Generator", value: "21.8M", pct: 45, color: "bg-violet-400" },
  { label: "Smart Search", value: "12.5M", pct: 25, color: "bg-sky-400" },
];

const ERROR_RATES = [
  { name: "Neural Matching V2", uptime: "99.998%", response: "142ms", error: "0.002%", status: "Healthy" },
  { name: "Vector Embeddings Hub", uptime: "99.95%", response: "89ms", error: "0.01%", status: "Healthy" },
  { name: "Semantic Parser (BETA)", uptime: "98.42%", response: "512ms", error: "1.45%", status: "Degraded" },
  { name: "Contextual Search Index", uptime: "99.991%", response: "210ms", error: "0.008%", status: "Healthy" },
];

export default function AdminAIUsage() {
  return (
    <AdminLayout title="AI Usage Statistics & Analytics" breadcrumb="Admin · AI Usage">
      <div className="grid gap-6 xl:grid-cols-3">
        <div className="rounded-2xl border border-dark-border bg-dark-surface p-6 xl:col-span-2">
          <div className="mb-2 flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-white">Proposal Generations per Minute</h2>
              <p className="text-sm text-dark-text-dim">Live streaming data from Edge nodes</p>
            </div>
            <div className="text-right">
              <p className="text-2xl font-extrabold text-white">1,429</p>
              <p className="text-xs font-semibold text-emerald-400">↑ 12% vs last hour</p>
            </div>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={PROPOSAL_DATA}>
              <Tooltip contentStyle={{ background: "#1b1a29", border: "none", borderRadius: 12 }} />
              <Line type="monotone" dataKey="v" stroke="#a5a1ff" strokeWidth={2.5} dot={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>

        <div className="rounded-2xl border border-dark-border bg-dark-surface p-6">
          <h2 className="mb-1 text-lg font-bold text-white">Token Consumption</h2>
          <p className="mb-5 text-sm text-dark-text-dim">By core platform feature</p>
          <div className="space-y-4">
            {TOKEN_USAGE.map((row) => (
              <div key={row.label}>
                <div className="mb-1.5 flex justify-between text-sm">
                  <span className="text-dark-text-dim">{row.label}</span>
                  <span className="font-semibold text-white">{row.value}</span>
                </div>
                <div className="h-1.5 rounded-full bg-dark-surface-2">
                  <div className={`h-full rounded-full ${row.color}`} style={{ width: `${row.pct}%` }} />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-6 flex justify-between border-t border-dark-border pt-4 text-sm">
            <span className="text-dark-text-dim">Daily quota: 150M</span>
            <span className="font-semibold text-white">65% Utilized</span>
          </div>
        </div>
      </div>

      <div className="mt-6 grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
        <div className="rounded-2xl border border-dark-border bg-dark-surface p-6 text-center">
          <Target className="mx-auto mb-3 h-8 w-8 text-brand-400" />
          <p className="text-xs uppercase tracking-wide text-dark-text-dim">Match Accuracy</p>
          <p className="mt-1 text-3xl font-extrabold text-white">94.8%</p>
          <p className="mt-1 text-xs font-semibold text-emerald-400">+2.4% this week</p>
        </div>
        <div className="rounded-2xl border border-dark-border bg-dark-surface p-6 text-center">
          <Repeat className="mx-auto mb-3 h-8 w-8 text-brand-400" />
          <p className="text-xs uppercase tracking-wide text-dark-text-dim">AI-to-Human Conv.</p>
          <p className="mt-1 text-3xl font-extrabold text-white">32.1%</p>
          <p className="mt-1 text-xs text-dark-text-dim">Interaction leads to hire</p>
        </div>
        <div className="rounded-2xl border border-dark-border bg-dark-surface p-6 sm:col-span-2 xl:col-span-1">
          <p className="mb-2 text-xs uppercase tracking-wide text-dark-text-dim">API Latency Heatmap</p>
          <div className="grid grid-cols-10 gap-1">
            {Array.from({ length: 40 }).map((_, i) => (
              <span
                key={i}
                className="h-3 w-3 rounded-sm"
                style={{
                  background: ["#0f9d6b", "#0f9d6b", "#d97b0d", "#e0403f"][Math.floor(Math.random() * 4)],
                }}
              />
            ))}
          </div>
          <p className="mt-2 text-xs text-dark-text-dim">Last 24 hours (Nodes 001–072)</p>
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-dark-border bg-dark-surface p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-white">Error Rates per Service</h2>
          <a href="#" className="text-sm font-semibold text-brand-400">View Detailed Logs</a>
        </div>
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="text-xs uppercase tracking-wide text-dark-text-dim">
              <th className="pb-3">Service Name</th>
              <th className="pb-3">Uptime</th>
              <th className="pb-3">Avg. Response</th>
              <th className="pb-3">Error Rate</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {ERROR_RATES.map((row) => (
              <tr key={row.name} className="border-t border-dark-border">
                <td className="py-3 font-semibold text-white">{row.name}</td>
                <td className="py-3 text-dark-text-dim">{row.uptime}</td>
                <td className="py-3 text-dark-text-dim">{row.response}</td>
                <td className={`py-3 font-semibold ${row.status === "Degraded" ? "text-amber-400" : "text-emerald-400"}`}>
                  {row.error}
                </td>
                <td className="py-3">
                  <span
                    className={`rounded-full px-2.5 py-1 text-xs font-semibold ${
                      row.status === "Degraded" ? "bg-amber-500/10 text-amber-400" : "bg-emerald-500/10 text-emerald-400"
                    }`}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AdminLayout>
  );
}
