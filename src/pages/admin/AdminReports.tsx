import { Download, FileBarChart } from "lucide-react";
import { AdminLayout } from "@/layouts/AdminLayout";

const REPORTS = [
  { name: "Monthly Revenue Summary", period: "June 2026", size: "2.1 MB" },
  { name: "Freelancer Verification Audit", period: "Q2 2026", size: "4.8 MB" },
  { name: "AI Usage & Cost Breakdown", period: "June 2026", size: "1.4 MB" },
  { name: "Platform Health Digest", period: "Weekly · Jun 24-30", size: "860 KB" },
];

export default function AdminReports() {
  return (
    <AdminLayout title="Reports" breadcrumb="Admin · Reports">
      <div className="rounded-2xl border border-dark-border bg-dark-surface p-6">
        <div className="space-y-3">
          {REPORTS.map((report) => (
            <div
              key={report.name}
              className="flex items-center gap-4 rounded-xl border border-dark-border p-4"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-dark-surface-2 text-brand-400">
                <FileBarChart className="h-5 w-5" />
              </span>
              <div className="flex-1">
                <p className="font-semibold text-white">{report.name}</p>
                <p className="text-xs text-dark-text-dim">{report.period} · {report.size}</p>
              </div>
              <button className="flex items-center gap-1.5 rounded-xl border border-dark-border px-3.5 py-2 text-sm font-semibold text-dark-text-dim hover:text-white">
                <Download className="h-4 w-4" /> Download
              </button>
            </div>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
}
