import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  ClipboardCheck, Loader2, Inbox, Download, Link2, FileText,
  CheckCircle2, RotateCcw, ExternalLink, Paperclip,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { CLIENT_NAV } from "@/constants/nav";
import { useNotification } from "@/context/NotificationContext";
import { workspaceService } from "@/services/workspace.service";
import { connectSocket } from "@/lib/socket";
import { formatCurrency, formatRelativeTime } from "@/utils/formatters";
import type { SubmittedProjectItem } from "@/types";

export default function SubmittedProjects() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotification();

  const [revisionTarget, setRevisionTarget] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");

  const { data: res, isLoading } = useQuery({
    queryKey: ["submittedProjects"],
    queryFn: () => workspaceService.listSubmittedProjects(),
  });

  const items: SubmittedProjectItem[] = res?.data.data ?? [];

  // Real-time: freelancers submitting/resubmitting pushes a notification —
  // refresh this list the moment one arrives, no manual reload needed.
  useEffect(() => {
    const socket = connectSocket();
    const onNew = () => queryClient.invalidateQueries({ queryKey: ["submittedProjects"] });
    socket.on("notification:new", onNew);
    return () => { socket.off("notification:new", onNew); };
  }, [queryClient]);

  const reviewMutation = useMutation({
    mutationFn: ({ contractId, action, feedback }: { contractId: string; action: "approve" | "request_revision"; feedback?: string }) =>
      workspaceService.reviewSubmission(contractId, action, feedback),
    onSuccess: (_, { action }) => {
      queryClient.invalidateQueries({ queryKey: ["submittedProjects"] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["clientDashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["freelancerDashboardStats"] });
      notify(
        action === "approve"
          ? "Project approved — payment released to the freelancer."
          : "Revision requested. The freelancer has been notified.",
        action === "approve" ? "success" : "info"
      );
      setRevisionTarget(null);
      setFeedback("");
    },
    onError: (err: any) => notify(err.response?.data?.message || "Failed to submit your review.", "error"),
  });

  return (
    <DashboardLayout navItems={CLIENT_NAV} tagline="Freelance Marketplace">
      <div className="mx-auto max-w-5xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-1 flex items-center gap-2.5">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white">
              <ClipboardCheck className="h-5 w-5" />
            </span>
            <h1 className="text-3xl font-extrabold text-ink-900">Submitted Projects</h1>
          </div>
          <p className="mt-2 text-base text-ink-500">
            Review completed work from your freelancers. Approve to release payment, or request a revision.
          </p>
        </div>

        {isLoading ? (
          <div className="flex h-64 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
          </div>
        ) : items.length === 0 ? (
          <div className="flex flex-col items-center gap-3 rounded-2xl border-2 border-dashed border-surface-border bg-surface-muted/40 py-20 text-center">
            <Inbox className="h-12 w-12 text-ink-300" />
            <p className="text-base font-semibold text-ink-900">No submissions awaiting review</p>
            <p className="max-w-sm text-sm text-ink-500">
              When a freelancer submits a completed project, it will show up here for your review.
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {items.map(({ contract, submission }) => {
              const freelancer = contract.freelancer as any;
              const job = contract.job as any;
              const isRevisionOpen = revisionTarget === contract.id;
              const isApproving = reviewMutation.isPending && reviewMutation.variables?.contractId === contract.id && reviewMutation.variables?.action === "approve";
              const isRequestingRevision = reviewMutation.isPending && reviewMutation.variables?.contractId === contract.id && reviewMutation.variables?.action === "request_revision";

              return (
                <div key={contract.id} className="rounded-2xl border border-surface-border bg-surface-card p-6 shadow-card">
                  {/* Header */}
                  <div className="mb-4 flex items-start justify-between gap-4">
                    <div className="flex flex-1 min-w-0 gap-4">
                      <Avatar src={freelancer?.avatar} name={freelancer?.fullName || "Freelancer"} size="md" />
                      <div className="min-w-0 flex-1">
                        <h3 className="text-lg font-bold text-ink-900">{contract.title}</h3>
                        <p className="text-sm text-ink-500">
                          Submitted by <span className="font-semibold text-ink-700">{freelancer?.fullName}</span>
                          {job?.title ? <> for <span className="font-semibold text-ink-700">{job.title}</span></> : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2 shrink-0">
                      <Badge tone="brand">Submitted for Review</Badge>
                      <span className="text-xs text-ink-400">
                        {submission ? formatRelativeTime(submission.updatedAt) : formatRelativeTime(contract.updatedAt)}
                      </span>
                    </div>
                  </div>

                  {/* Budget */}
                  <div className="mb-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2.5">
                    <span className="text-sm font-semibold text-emerald-700">Payout on approval:</span>
                    <span className="text-sm font-extrabold text-emerald-700">{formatCurrency(contract.budget)}</span>
                  </div>

                  {!submission ? (
                    <p className="text-sm text-ink-400 italic">No submission details found.</p>
                  ) : (
                    <>
                      {/* Notes */}
                      {submission.notes && (
                        <div className="mb-4 rounded-lg border border-surface-border bg-surface-muted p-4">
                          <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">
                            <FileText className="h-3.5 w-3.5" /> Freelancer's Notes
                          </p>
                          <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-wrap">{submission.notes}</p>
                        </div>
                      )}

                      {/* Links */}
                      {submission.links.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">
                            <Link2 className="h-3.5 w-3.5" /> Links
                          </p>
                          <div className="space-y-1.5">
                            {submission.links.map((link) => (
                              <a
                                key={link}
                                href={link}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs font-semibold text-brand-600 hover:bg-brand-50 transition-colors"
                              >
                                <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                                <span className="truncate">{link}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Files */}
                      {submission.files.length > 0 && (
                        <div className="mb-4">
                          <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">
                            <Paperclip className="h-3.5 w-3.5" /> Deliverable Files
                          </p>
                          <div className="grid gap-2 sm:grid-cols-2">
                            {submission.files.map((file, idx) => (
                              <a
                                key={`${file.name}-${idx}`}
                                href={file.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                download
                                className="flex items-center justify-between gap-2 rounded-lg border border-surface-border bg-surface-card px-3 py-2 text-xs font-semibold text-ink-700 hover:border-brand-400 hover:text-brand-600 transition-colors"
                              >
                                <span className="truncate">{file.name}</span>
                                <Download className="h-3.5 w-3.5 shrink-0" />
                              </a>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  {/* Revision feedback input */}
                  {isRevisionOpen && (
                    <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                      <label className="mb-2 block text-xs font-bold uppercase tracking-wide text-amber-700">
                        What needs to change?
                      </label>
                      <textarea
                        value={feedback}
                        onChange={(e) => setFeedback(e.target.value)}
                        rows={3}
                        placeholder="Describe the changes you'd like before approving..."
                        className="w-full resize-none rounded-lg border border-amber-300 bg-white px-3 py-2 text-sm text-ink-900 placeholder:text-ink-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-100"
                      />
                      <div className="mt-3 flex justify-end gap-2">
                        <Button variant="outline" size="sm" onClick={() => { setRevisionTarget(null); setFeedback(""); }}>
                          Cancel
                        </Button>
                        <Button
                          size="sm"
                          variant="danger"
                          isLoading={isRequestingRevision}
                          disabled={!feedback.trim()}
                          onClick={() => reviewMutation.mutate({ contractId: contract.id, action: "request_revision", feedback })}
                        >
                          Send Revision Request
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  {!isRevisionOpen && (
                    <div className="flex gap-3 pt-1 border-t border-surface-border mt-1 pt-4">
                      <button
                        onClick={() => reviewMutation.mutate({ contractId: contract.id, action: "approve" })}
                        disabled={reviewMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-emerald-700 transition-colors disabled:opacity-50"
                      >
                        {isApproving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                        Approve Project & Release Payment
                      </button>
                      <button
                        onClick={() => setRevisionTarget(contract.id)}
                        disabled={reviewMutation.isPending}
                        className="flex-1 flex items-center justify-center gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2.5 text-sm font-bold text-amber-700 hover:bg-amber-100 transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Request Revision
                      </button>
                      <button
                        onClick={() => navigate(`/workspace/${contract.id}`)}
                        className="flex items-center justify-center rounded-lg border border-surface-border px-4 py-2.5 text-sm font-bold text-ink-700 hover:bg-surface-muted transition-colors"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
