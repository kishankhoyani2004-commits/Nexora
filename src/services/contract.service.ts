import { apiClient } from "@/lib/axios";
import type { ApiResponse, Contract } from "@/types";

export const contractService = {
  create: (proposalId: string) =>
    apiClient.post<ApiResponse<Contract>>("/contracts", { proposalId }),
  list: () =>
    apiClient.get<ApiResponse<Contract[]>>("/contracts"),
  getById: (id: string) =>
    apiClient.get<ApiResponse<Contract>>(`/contracts/${id}`),
  updateStatus: (id: string, payload: { status?: string; escrowStatus?: string }) =>
    apiClient.patch<ApiResponse<Contract>>(`/contracts/${id}`, payload),
};
