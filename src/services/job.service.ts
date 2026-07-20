import { apiClient } from "@/lib/axios";
import type { ApiResponse, Job, PaginatedResponse } from "@/types";

export interface JobFilters {
  search?:          string;
  category?:        string;
  location?:        string;
  workType?:        string;
  minBudget?:       number;
  maxBudget?:       number;
  priceType?:       string;
  experienceLevel?: string[];
  skills?:          string[];
  clientRating?:    number;
  paymentVerified?: boolean;
  postedWithin?:    string; // "today" | "3days" | "week" | "month"
  sortBy?:          string;
  page?:            number;
  limit?:           number;
  client?:          string;
  status?:          string;
}

export interface RecommendedJob extends Job {
  matchScore:  number;
  matchReason: string;
}

export const jobService = {
  list: (filters?: JobFilters) =>
    apiClient.get<ApiResponse<PaginatedResponse<Job>>>("/jobs", { params: filters }),

  getRecommended: (limit = 12) =>
    apiClient.get<ApiResponse<{ items: RecommendedJob[]; total: number }>>(
      "/jobs/recommended",
      { params: { limit } }
    ),

  getById: (id: string) =>
    apiClient.get<ApiResponse<Job>>(`/jobs/${id}`),

  create: (payload: Partial<Job>) =>
    apiClient.post<ApiResponse<Job>>("/jobs", payload),

  update: (id: string, payload: Partial<Job>) =>
    apiClient.patch<ApiResponse<Job>>(`/jobs/${id}`, payload),

  publish: (id: string) =>
    apiClient.post<ApiResponse<Job>>(`/jobs/${id}/publish`),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/jobs/${id}`),
};
