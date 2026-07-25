import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export const applicationService = {
  // Get all applications for client's jobs (all statuses)
  getPendingApplications: () =>
    apiClient.get<ApiResponse<any[]>>("/applications"),

  // Accept an application (creates contract + earning)
  acceptApplication: (applicationId: string) =>
    apiClient.post<ApiResponse<any>>(`/applications/${applicationId}/accept`),

  // Reject an application
  rejectApplication: (applicationId: string) =>
    apiClient.post<ApiResponse<any>>(`/applications/${applicationId}/reject`),

  // Withdraw an application (freelancer action)
  withdrawApplication: (applicationId: string) =>
    apiClient.post<ApiResponse<any>>(`/applications/${applicationId}/withdraw`),
};
