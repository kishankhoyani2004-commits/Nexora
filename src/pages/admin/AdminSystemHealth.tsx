import { RefreshCw, History } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";
import { SERVER_NODES, COMPLAINTS } from "@/constants/mockData";
import { cn } from "@/utils/cn";

const statusStyles = {
  online: "text-emerald-400 bg-emerald-500/10",
  degraded: "text-amber-400 bg-amber-500/10",
  optimized: "text-sky-400 bg-sky-500/10",
};

const severityStyles = {
  low: "bg-sky-500/10 text-sky-400",
  medium: "bg-amber-500/10 text-amber-400",
  high: "bg-red-500/10 text-red-400",
};

const LOGS = [
  { time: "14:23:45", level: "INFO", text: "User auth successful for admin_rivera (IP: 192.168.1.104)" },
  { time: "14:24:02", level: "WARN", text: "Node US-East-1 reporting high memory usage (84%)" },
  { time: "14:24:15", level: "INFO", text: "Cache purge initiated on CDN edge nodes." },
  { time: "14:25:33", level: "CRIT", text: "SQL Injection attempt blocked on /api/v2/freelancers/search." },
  { time: "14:26:01", level: "INFO", text: "New incident report created (ID: #CMP-9442)." },
  { time: "14:27:50", level: "SYS", text: "AI Matching Engine re-indexing complete. Latency normalized." },
];

const levelColor: Record<string, string> = {
  INFO: "text-sky-400",
  WARN: "text-amber-400",
  CRIT: "text-red-400",
  SYS: "text-violet-400",
};

export default function AdminSystemHealth() {
  return (
    <AdminLayout title="System Health & Incident Management" breadcrumb="Dashboard · System Health">
      <div className="mb-4 flex justify-end gap-2">
        <button className="flex items-center gap-1.5 rounded-xl border border-dark-border px-3.5 py-2 text-sm font-semibold text-dark-text-dim">
          <History className="h-4 w-4" /> View History
        </button>
        <button className="flex items-center gap-1.5 rounded-xl bg-brand-600 px-3.5 py-2 text-sm font-semibold text-white">
          <RefreshCw className="h-4 w-4" /> Refresh Live Data
        </button>
      </div>

      <div className="grid gap-6 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Server Node Clusters</h2>
            <span className="rounded-full bg-dark-surface-2 px-3 py-1 text-xs font-semibold text-dark-text-dim">
              Operational: 99.98%
            </span>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {SERVER_NODES.map((node) => (
              <div
                key={node.id}
                className={cn(
                  "rounded-2xl border-l-4 border-dark-border bg-dark-surface p-5",
                  node.status === "online" && "border-l-emerald-500",
                  node.status === "degraded" && "border-l-amber-500",
                  node.status === "optimized" && "border-l-sky-500"
                )}
              >
                <div className="mb-3 flex items-center justify-between">
                  <p className="font-bold text-white">{node.name}</p>
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase", statusStyles[node.status])}>
                    {node.status}
                  </span>
                </div>
                <p className="mb-3 text-xs text-dark-text-dim">{node.location}</p>
                <div className="flex items-end justify-between">
                  <div>
                    <p className="text-2xl font-extrabold text-white">{node.uptime}</p>
                    <p className="text-[11px] text-dark-text-dim">UPTIME (24H)</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-sky-400">{node.ping}</p>
                    <p className="text-[11px] text-dark-text-dim">LIVE PING</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <h2 className="mb-3 mt-6 text-lg font-bold text-white">Recent Activity Logs</h2>
          <div className="space-y-1.5 rounded-2xl border border-dark-border bg-black/40 p-4 font-mono text-xs">
            {LOGS.map((log, i) => (
              <p key={i}>
                <span className="text-dark-text-dim">[{log.time}]</span>{" "}
                <span className={levelColor[log.level]}>{log.level}</span> <span className="text-dark-text-dim">{log.text}</span>
              </p>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-white">Complaints Queue</h2>
            <span className="rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white">
              {COMPLAINTS.length} NEW
            </span>
          </div>
          <div className="space-y-3">
            {COMPLAINTS.map((c) => (
              <div key={c.id} className="rounded-2xl border border-dark-border bg-dark-surface p-4">
                <div className="mb-2 flex items-center justify-between">
                  <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold uppercase", severityStyles[c.severity])}>
                    {c.severity} severity
                  </span>
                  <span className="text-[11px] text-dark-text-dim">{c.reportedAt}</span>
                </div>
                <p className="font-semibold text-white">{c.title}</p>
                <p className="mt-1 text-sm text-dark-text-dim">"{c.description}"</p>
                <button className="mt-3 rounded-lg bg-brand-600 px-3 py-1.5 text-xs font-semibold text-white">
                  Resolve
                </button>
              </div>
            ))}
          </div>
          <button className="mt-4 w-full rounded-xl border border-dark-border py-2.5 text-sm font-semibold text-dark-text-dim">
            View All Pending Tickets
          </button>
        </div>
      </div>
    </AdminLayout>
  );
}
