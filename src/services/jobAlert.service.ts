import { apiClient } from "@/lib/axios";
import type { ApiResponse, JobAlert } from "@/types";

export interface CreateAlertPayload {
  name:             string;
  keywords?:        string[];
  skills?:          string[];
  category?:        string;
  budgetMin?:       number;
  budgetMax?:       number;
  experienceLevel?: string;
  priceType?:       string;
  location?:        string;
  workType?:        string;
  frequency?:       "instant" | "daily" | "weekly";
  notifyEmail?:     boolean;
  notifyInApp?:     boolean;
}

export const jobAlertService = {
  list: () =>
    apiClient.get<ApiResponse<JobAlert[]>>("/job-alerts"),

  create: (payload: CreateAlertPayload) =>
    apiClient.post<ApiResponse<JobAlert>>("/job-alerts", payload),

  update: (id: string, payload: Partial<CreateAlertPayload> & { active?: boolean }) =>
    apiClient.patch<ApiResponse<JobAlert>>(`/job-alerts/${id}`, payload),

  toggle: (id: string) =>
    apiClient.patch<ApiResponse<JobAlert>>(`/job-alerts/${id}/toggle`),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/job-alerts/${id}`),
};
