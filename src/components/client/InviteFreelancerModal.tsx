import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Briefcase, Loader2, Send, Inbox } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { cn } from "@/utils/cn";
import { formatCurrency } from "@/utils/formatters";
import { useAuth } from "@/context/AuthContext";
import { useNotification } from "@/context/NotificationContext";
import { jobService } from "@/services/job.service";
import { invitationService } from "@/services/invitation.service";

interface InviteFreelancerModalProps {
  isOpen: boolean;
  onClose: () => void;
  freelancerId: string;
  freelancerName: string;
}

export function InviteFreelancerModal({
  isOpen, onClose, freelancerId, freelancerName,
}: InviteFreelancerModalProps) {
  const { user } = useAuth();
  const { notify } = useNotification();
  const [selectedJobId, setSelectedJobId] = useState<string>("");
  const [message, setMessage] = useState("");

  const clientId = user?.id || user?._id;

  const { data: jobsRes, isLoading: jobsLoading } = useQuery({
    queryKey: ["clientOpenJobs", clientId],
    queryFn: () => jobService.list({ client: clientId, status: "open", limit: 50 }),
    enabled: isOpen && !!clientId,
  });

  const openJobs = jobsRes?.data.data?.items ?? [];

  const inviteMutation = useMutation({
    mutationFn: () => invitationService.create({ freelancerId, jobId: selectedJobId, message }),
    onSuccess: () => {
      notify(`Invitation sent to ${freelancerName}.`, "success");
      setSelectedJobId("");
      setMessage("");
      onClose();
    },
    onError: (err: any) => {
      notify(err.response?.data?.message || "Failed to send invitation.", "error");
    },
  });

  const handleClose = () => {
    setSelectedJobId("");
    setMessage("");
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Invite ${freelancerName} to Apply`}>
      <div className="space-y-4">
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-700">
            Select one of your open jobs
          </label>

          {jobsLoading ? (
            <div className="flex h-24 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
            </div>
          ) : openJobs.length === 0 ? (
            <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-surface-border bg-surface-muted/40 py-8 text-center">
              <Inbox className="h-6 w-6 text-ink-300" />
              <p className="text-sm text-ink-500">You don't have any open jobs to invite to.</p>
            </div>
          ) : (
            <div className="max-h-56 space-y-2 overflow-y-auto pr-1">
              {openJobs.map((job) => (
                <button
                  key={job.id}
                  type="button"
                  onClick={() => setSelectedJobId(job.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-xl border p-3 text-left transition-colors",
                    selectedJobId === job.id
                      ? "border-brand-500 bg-brand-50"
                      : "border-surface-border bg-surface-card hover:border-brand-300"
                  )}
                >
                  <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-100 text-brand-600">
                    <Briefcase className="h-4 w-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{job.title}</p>
                    <p className="text-xs text-ink-500">
                      {formatCurrency(job.budgetMin)}
                      {job.budgetMax ? ` – ${formatCurrency(job.budgetMax)}` : ""}
                      {job.priceType === "hourly" ? "/hr" : ""}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-700">
            Message <span className="font-normal text-ink-400">(optional)</span>
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
            placeholder={`Hi ${freelancerName}, I'd love for you to apply to this role...`}
            className="w-full resize-none rounded-xl border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            icon={<Send className="h-4 w-4" />}
            iconPosition="left"
            disabled={!selectedJobId}
            isLoading={inviteMutation.isPending}
            onClick={() => inviteMutation.mutate()}
          >
            Send Invitation
          </Button>
        </div>
      </div>
    </Modal>
  );
}
