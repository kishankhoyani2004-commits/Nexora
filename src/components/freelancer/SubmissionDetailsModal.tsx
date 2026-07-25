import { Link2, Paperclip, FileText, Download, ExternalLink, Loader2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { Modal } from "@/components/ui/Modal";
import { Badge } from "@/components/ui/Badge";
import { workspaceService } from "@/services/workspace.service";
import { formatRelativeTime } from "@/utils/formatters";
import type { ProjectSubmissionStatus } from "@/types";

const STATUS_BADGE: Record<ProjectSubmissionStatus, { tone: "brand" | "success" | "warning"; label: string }> = {
  pending: { tone: "brand", label: "Waiting for Client Approval" },
  approved: { tone: "success", label: "Approved" },
  revision_requested: { tone: "warning", label: "Revision Requested" },
};

interface SubmissionDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

export function SubmissionDetailsModal({ isOpen, onClose, projectId, projectTitle }: SubmissionDetailsModalProps) {
  const { data: res, isLoading } = useQuery({
    queryKey: ["submission", projectId],
    queryFn: () => workspaceService.getSubmission(projectId),
    enabled: isOpen,
  });

  const submission = res?.data.data ?? null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Submission — "${projectTitle}"`}>
      {isLoading ? (
        <div className="flex h-32 items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
        </div>
      ) : !submission ? (
        <p className="py-6 text-center text-sm text-ink-500">No submission has been sent for this project yet.</p>
      ) : (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Badge tone={STATUS_BADGE[submission.status].tone}>{STATUS_BADGE[submission.status].label}</Badge>
            <span className="text-xs text-ink-400">
              Submitted {formatRelativeTime(submission.createdAt)}
              {submission.reviewedAt ? ` · Reviewed ${formatRelativeTime(submission.reviewedAt)}` : ""}
            </span>
          </div>

          {submission.status === "revision_requested" && submission.clientFeedback && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="mb-1 text-xs font-bold uppercase tracking-wide text-amber-700">Client's Feedback</p>
              <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-wrap">{submission.clientFeedback}</p>
            </div>
          )}

          {submission.notes && (
            <div className="rounded-lg border border-surface-border bg-surface-muted p-4">
              <p className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-ink-400">
                <FileText className="h-3.5 w-3.5" /> Your Notes
              </p>
              <p className="text-sm text-ink-900 leading-relaxed whitespace-pre-wrap">{submission.notes}</p>
            </div>
          )}

          {submission.links.length > 0 && (
            <div>
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

          {submission.files.length > 0 && (
            <div>
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
        </div>
      )}
    </Modal>
  );
}
