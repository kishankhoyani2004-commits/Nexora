import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";
import type { SavedJobItem } from "@/types";

export const savedJobService = {
  /** Returns saved job objects with full job details */
  list: (sortBy?: string) =>
    apiClient.get<ApiResponse<{ items: SavedJobItem[]; total: number }>>(
      "/saved-jobs",
      { params: sortBy ? { sortBy } : undefined }
    ),

  /** Returns just the job ID strings — lightweight, for UI toggle state */
  getIds: () =>
    apiClient.get<ApiResponse<string[]>>("/saved-jobs/ids"),

  save: (jobId: string) =>
    apiClient.post<ApiResponse<SavedJobItem>>(`/saved-jobs/${jobId}`),

  unsave: (jobId: string) =>
    apiClient.delete<ApiResponse<null>>(`/saved-jobs/${jobId}`),
};
