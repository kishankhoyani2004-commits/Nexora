import { apiClient } from "@/lib/axios";
import type { ApiResponse, FreelancerProfile } from "@/types";

export const profileService = {
  getFreelancerProfile: (id: string) =>
    apiClient.get<ApiResponse<FreelancerProfile>>(`/profiles/freelancers/${id}`),
  updateFreelancerProfile: (id: string, payload: Partial<FreelancerProfile>) =>
    apiClient.patch<ApiResponse<FreelancerProfile>>(`/profiles/freelancers/${id}`, payload),
};
