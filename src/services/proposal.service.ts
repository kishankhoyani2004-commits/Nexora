import { apiClient } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse, Proposal, JobAttachment } from "@/types";

export const proposalService = {
  // ── Freelancer ─────────────────────────────────────────────────────────────
  /** All proposals submitted by the logged-in freelancer */
  listMine: () =>
    apiClient.get<ApiResponse<PaginatedResponse<Proposal>>>("/proposals/mine"),

  /** Upload a single proposal attachment; returns { filename, url, mimetype } */
  uploadAttachment: (file: File) => {
    const formData = new FormData();
    formData.append("file", file);
    return apiClient.post<ApiResponse<JobAttachment>>("/proposals/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    });
  },

  /** Submit a new proposal for a job */
  submit: (jobId: string, payload: { description: string; coverLetter?: string; bidAmount: number; estimatedDelivery?: string; milestones?: { name: string; amount: number }[]; attachments?: JobAttachment[] }) =>
    apiClient.post<ApiResponse<Proposal>>(`/jobs/${jobId}/proposals`, payload),

  /** Save a proposal as draft */
  saveDraft: (jobId: string, payload: Partial<Proposal>) =>
    apiClient.post<ApiResponse<Proposal>>(`/jobs/${jobId}/proposals/draft`, payload),

  /** Update bid amount or cover letter on a submitted proposal */
  update: (id: string, payload: { description?: string; bidAmount?: number; estimatedDelivery?: string; attachments?: JobAttachment[] }) =>
    apiClient.patch<ApiResponse<Proposal>>(`/proposals/${id}`, payload),

  /** Withdraw (delete) a submitted proposal */
  withdraw: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/proposals/${id}`),

  // ── Client ──────────────────────────────────────────────────────────────────
  /** All proposals received by the logged-in client across all their jobs */
  listReceived: () =>
    apiClient.get<ApiResponse<Proposal[]>>("/proposals/received"),

  /** All proposals for a specific job (client only) */
  listForJob: (jobId: string) =>
    apiClient.get<ApiResponse<Proposal[]>>(`/jobs/${jobId}/proposals`),

  /** Shortlist a freelancer's proposal */
  shortlist: (proposalId: string) =>
    apiClient.patch<ApiResponse<Proposal>>(`/proposals/${proposalId}/shortlist`),

  /** Reject a freelancer's proposal */
  reject: (proposalId: string) =>
    apiClient.patch<ApiResponse<Proposal>>(`/proposals/${proposalId}/reject`),
};
