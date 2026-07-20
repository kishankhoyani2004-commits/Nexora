import { apiClient } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse, Proposal } from "@/types";

export const proposalService = {
  listForJob: (jobId: string) =>
    apiClient.get<ApiResponse<Proposal[]>>(`/jobs/${jobId}/proposals`),
  listMine: () => apiClient.get<ApiResponse<PaginatedResponse<Proposal>>>("/proposals/mine"),
  listReceived: () => apiClient.get<ApiResponse<Proposal[]>>("/proposals/received"),
  submit: (jobId: string, payload: Partial<Proposal>) =>
    apiClient.post<ApiResponse<Proposal>>(`/jobs/${jobId}/proposals`, payload),
  saveDraft: (jobId: string, payload: Partial<Proposal>) =>
    apiClient.post<ApiResponse<Proposal>>(`/jobs/${jobId}/proposals/draft`, payload),
  update: (id: string, payload: Partial<Proposal>) =>
    apiClient.patch<ApiResponse<Proposal>>(`/proposals/${id}`, payload),
  withdraw: (id: string) => apiClient.delete<ApiResponse<null>>(`/proposals/${id}`),
};
