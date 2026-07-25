import { useState, useRef } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Link2, Paperclip, Send, X, Loader2, Plus } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { useNotification } from "@/context/NotificationContext";
import { workspaceService } from "@/services/workspace.service";

interface SubmitProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId: string;
  projectTitle: string;
}

export function SubmitProjectModal({ isOpen, onClose, projectId, projectTitle }: SubmitProjectModalProps) {
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [notes, setNotes] = useState("");
  const [linkInput, setLinkInput] = useState("");
  const [links, setLinks] = useState<string[]>([]);
  const [files, setFiles] = useState<File[]>([]);

  const reset = () => {
    setNotes("");
    setLinkInput("");
    setLinks([]);
    setFiles([]);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const addLink = () => {
    const trimmed = linkInput.trim();
    if (trimmed && !links.includes(trimmed)) {
      setLinks([...links, trimmed]);
      setLinkInput("");
    }
  };

  const removeLink = (link: string) => setLinks(links.filter((l) => l !== link));

  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(e.target.files || []);
    setFiles([...files, ...selected]);
    e.target.value = "";
  };

  const removeFile = (index: number) => setFiles(files.filter((_, i) => i !== index));

  const submitMutation = useMutation({
    mutationFn: () => {
      const formData = new FormData();
      formData.append("notes", notes);
      formData.append("links", JSON.stringify(links));
      files.forEach((f) => formData.append("files", f));
      return workspaceService.submitProject(projectId, formData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      queryClient.invalidateQueries({ queryKey: ["freelancerDashboardStats"] });
      queryClient.invalidateQueries({ queryKey: ["mySubmissions"] });
      notify("Project submitted for client review.", "success");
      handleClose();
    },
    onError: (err: any) => {
      notify(err.response?.data?.message || "Failed to submit project.", "error");
    },
  });

  const hasContent = notes.trim() || links.length > 0 || files.length > 0;

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title={`Submit "${projectTitle}" for Review`}>
      <div className="space-y-4">
        <p className="text-sm text-ink-500">
          Attach your final deliverables, share any relevant links, and leave a note for the client. They'll be
          notified immediately to review your submission.
        </p>

        {/* Notes */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-700">Notes for the client</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={4}
            placeholder="Summarize what was delivered, how to review it, and anything the client should know..."
            className="w-full resize-none rounded-xl border border-surface-border bg-surface-card px-3.5 py-2.5 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
          />
        </div>

        {/* Links */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-700">
            Links <span className="font-normal text-ink-400">(live site, repo, design file...)</span>
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                type="url"
                value={linkInput}
                onChange={(e) => setLinkInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addLink(); } }}
                placeholder="https://..."
                className="h-10 w-full rounded-xl border border-surface-border bg-surface-card pl-10 pr-3 text-sm text-ink-900 placeholder:text-ink-400 focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-100"
              />
            </div>
            <Button type="button" variant="outline" size="sm" icon={<Plus className="h-4 w-4" />} onClick={addLink}>
              Add
            </Button>
          </div>
          {links.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {links.map((link) => (
                <div key={link} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-muted px-3 py-1.5">
                  <span className="truncate text-xs text-ink-700">{link}</span>
                  <button onClick={() => removeLink(link)} className="shrink-0 text-ink-400 hover:text-red-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Files */}
        <div>
          <label className="mb-2 block text-sm font-semibold text-ink-700">Deliverable files</label>
          <input ref={fileInputRef} type="file" multiple hidden onChange={handleFilesSelected} />
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-surface-border bg-surface-muted/40 py-4 text-sm font-semibold text-ink-500 hover:border-brand-400 hover:text-brand-600 transition-colors"
          >
            <Paperclip className="h-4 w-4" />
            Click to attach files
          </button>
          {files.length > 0 && (
            <div className="mt-2 space-y-1.5">
              {files.map((file, idx) => (
                <div key={`${file.name}-${idx}`} className="flex items-center justify-between rounded-lg border border-surface-border bg-surface-muted px-3 py-1.5">
                  <span className="truncate text-xs text-ink-700">{file.name}</span>
                  <button onClick={() => removeFile(idx)} className="shrink-0 text-ink-400 hover:text-red-600">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="outline" onClick={handleClose}>Cancel</Button>
          <Button
            icon={submitMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            iconPosition="left"
            disabled={!hasContent || submitMutation.isPending}
            onClick={() => submitMutation.mutate()}
          >
            Submit for Review
          </Button>
        </div>
      </div>
    </Modal>
  );
}
