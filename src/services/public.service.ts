import { apiClient } from "@/lib/axios";
import type { ApiResponse, PaginatedResponse } from "@/types";

export interface PlatformStats {
  totalFreelancers: number;
  totalClients: number;
  totalJobsPosted: number;
  totalCompletedJobs: number;
}

export interface PublicFreelancer {
  id: string;
  fullName: string;
  avatar: string;
  bio: string;
  skills: string[];
  location: string;
  title: string;
  hourlyRate: number;
  rating: number;
  reviewCount: number;
  availability: "available" | "busy" | "unavailable";
  createdAt: string;
}

export interface FreelancerFilters {
  search?: string;
  skill?: string;
  category?: string;
  minRate?: number;
  maxRate?: number;
  minRating?: number;
  availability?: string;
  location?: string;
  sortBy?: "rating" | "newest" | "rateLow" | "rateHigh";
  page?: number;
  limit?: number;
}

export interface PublicCategory {
  slug: string;
  label: string;
  icon: string;
  jobCount: number;
  freelancerCount: number;
}

export interface TrendingSkill {
  skill: string;
  jobCount: number;
}

export interface Testimonial {
  id: string;
  rating: number;
  comment: string;
  createdAt: string;
  reviewer: { id: string; fullName: string; avatar: string; title: string };
  reviewee: { id: string; fullName: string; avatar: string; title: string };
}

export const publicService = {
  getStats: () => apiClient.get<ApiResponse<PlatformStats>>("/public/stats"),

  listFreelancers: (filters?: FreelancerFilters) =>
    apiClient.get<ApiResponse<PaginatedResponse<PublicFreelancer>>>("/public/freelancers", {
      params: filters,
    }),

  listCategories: () => apiClient.get<ApiResponse<PublicCategory[]>>("/public/categories"),

  /** authoredBy: whose voice the testimonial is written in — "client" for Find Talent, "freelancer" for Find Work success stories. */
  getTestimonials: (authoredBy: "client" | "freelancer" = "client", limit = 6) =>
    apiClient.get<ApiResponse<Testimonial[]>>("/public/testimonials", {
      params: { authoredBy, limit },
    }),

  getTrendingSkills: (limit = 10) =>
    apiClient.get<ApiResponse<TrendingSkill[]>>("/public/trending-skills", { params: { limit } }),
};
