import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Paperclip, Loader2, Download, FileText, Image as ImageIcon, FileArchive, ChevronRight, Inbox } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { CLIENT_NAV } from "@/constants/nav";
import { workspaceService } from "@/services/workspace.service";
import { formatRelativeTime } from "@/utils/formatters";
import type { MyFileItem } from "@/types";

function fileIcon(mimetype?: string) {
  if (!mimetype) return FileText;
  if (mimetype.startsWith("image/")) return ImageIcon;
  if (mimetype.includes("zip") || mimetype.includes("rar") || mimetype.includes("7z")) return FileArchive;
  return FileText;
}

export default function ClientProjectFiles() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["myFiles"],
    queryFn: () => workspaceService.listMyFiles(),
  });

  const items: MyFileItem[] = res?.data.data ?? [];

  const filtered = items.filter(({ file, contract }) =>
    file.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    contract?.title?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout navItems={CLIENT_NAV} tagline="Freelance Marketplace" searchPlaceholder="Search talents or projects...">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <Paperclip className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-extrabold text-ink-900">Project Files</h1>
          </div>
          <p className="mt-2 text-base text-ink-500">
            Every file shared inside your project workspaces, across all your contracts.
          </p>
        </div>

        {/* Search */}
        <div className="mb-6">
          <input
            type="text"
            placeholder="Search by file name or contract..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full max-w-sm rounded-lg border border-surface-border bg-surface-card px-4 py-2 text-sm placeholder-ink-400 focus:border-brand-500 focus:outline-none"
          />
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-surface-border bg-surface-muted/40 py-20 text-center">
            <Inbox className="h-12 w-12 text-ink-300" />
            <p className="text-base font-semibold text-ink-900">No files yet</p>
            <p className="max-w-sm text-sm text-ink-500">
              {searchQuery ? "Try a different search term." : "Files uploaded inside a project's workspace will appear here."}
            </p>
          </div>
        ) : (
          <div className="overflow-hidden rounded-2xl border border-surface-border bg-surface-card shadow-card">
            <div className="divide-y divide-surface-border">
              {filtered.map(({ file, contract }) => {
                const Icon = fileIcon(file.mimetype);
                const uploader = typeof file.uploadedBy === "object" ? file.uploadedBy : null;
                return (
                  <div key={file.id} className="flex items-center gap-4 p-4 hover:bg-surface-muted/50 transition-colors">
                    <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-surface-muted text-brand-600">
                      <Icon className="h-5 w-5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-bold text-ink-900">{file.name}</p>
                      <p className="truncate text-xs text-ink-500">
                        {contract?.title || "—"}
                        {uploader?.fullName ? ` · Uploaded by ${uploader.fullName}` : ""}
                      </p>
                    </div>
                    <div className="hidden shrink-0 text-right sm:block">
                      <p className="text-xs font-semibold text-ink-700">{file.size}</p>
                      <p className="text-[11px] text-ink-400">{formatRelativeTime(file.createdAt || file.updatedAt)}</p>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      {contract?.id && (
                        <button
                          title="Open Workspace"
                          onClick={() => navigate(`/workspace/${contract.id}?tab=Files`)}
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border text-ink-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                        >
                          <ChevronRight className="h-4 w-4" />
                        </button>
                      )}
                      {file.url && (
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          download
                          title="Download"
                          className="flex h-9 w-9 items-center justify-center rounded-xl border border-surface-border text-ink-600 hover:border-brand-400 hover:text-brand-600 transition-colors"
                        >
                          <Download className="h-4 w-4" />
                        </a>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
