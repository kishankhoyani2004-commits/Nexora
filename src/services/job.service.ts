import { apiClient } from "@/lib/axios";
import type { ApiResponse, Job, PaginatedResponse, JobCreatePayload } from "@/types";

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

  create: (payload: Partial<Job> | JobCreatePayload) =>
    apiClient.post<ApiResponse<Job>>("/jobs", payload),

  /** Save a job as draft — partial data allowed */
  saveDraft: (payload: Partial<JobCreatePayload>) =>
    apiClient.post<ApiResponse<Job>>("/jobs/save-draft", payload),

  /** Create a new job and immediately publish it (status = open) */
  createAndPublish: (payload: JobCreatePayload) =>
    apiClient.post<ApiResponse<Job>>("/jobs/publish-new", payload),

  update: (id: string, payload: Partial<Job> | Partial<JobCreatePayload>) =>
    apiClient.patch<ApiResponse<Job>>(`/jobs/${id}`, payload),

  publish: (id: string) =>
    apiClient.post<ApiResponse<Job>>(`/jobs/${id}/publish`),

  /** Close an open/in-progress job (sets status = closed) */
  close: (id: string) =>
    apiClient.patch<ApiResponse<Job>>(`/jobs/${id}/close`),

  delete: (id: string) =>
    apiClient.delete<ApiResponse<null>>(`/jobs/${id}`),
};
