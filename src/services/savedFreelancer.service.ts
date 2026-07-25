import { apiClient } from "@/lib/axios";
import type { ApiResponse, SavedFreelancerItem } from "@/types";

export const savedFreelancerService = {
  /** Returns saved freelancer objects with full profile details */
  list: (params?: { search?: string; sortBy?: string }) =>
    apiClient.get<ApiResponse<{ items: SavedFreelancerItem[]; total: number }>>(
      "/saved-freelancers",
      { params }
    ),

  /** Returns just the freelancer ID strings — lightweight, for UI toggle state */
  getIds: () =>
    apiClient.get<ApiResponse<string[]>>("/saved-freelancers/ids"),

  save: (freelancerId: string) =>
    apiClient.post<ApiResponse<SavedFreelancerItem>>(`/saved-freelancers/${freelancerId}`),

  unsave: (freelancerId: string) =>
    apiClient.delete<ApiResponse<null>>(`/saved-freelancers/${freelancerId}`),
};
