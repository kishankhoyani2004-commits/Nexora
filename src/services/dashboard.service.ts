import { apiClient } from "@/lib/axios";
import type {
  ApiResponse,
  PaginatedResponse,
  FreelancerDashboardStats,
  FeedActivityItem,
  ClientDashboardStats,
} from "@/types";

export interface FreelancerAnalyticsData {
  monthlyEarnings:     { month: string; year: number; amount: number; contracts: number }[];
  monthlyProposals:    { month: string; total: number; accepted: number }[];
  proposalBreakdown:   { submitted: number; shortlisted: number; accepted: number; rejected: number; draft: number };
  clientGrowth:        { month: string; total: number; new: number }[];
  topSkills:           { skill: string; count: number }[];
  ratingDist:          { star: number; count: number }[];
  avgRating:           number;
  reviewCount:         number;
  totalEarnings:       number;
  totalContracts:      number;
  completedContracts:  number;
  totalProposals:      number;
  acceptedProposals:   number;
  acceptanceRate:      number;
  profileCompletion:   number;
}

export interface ActivityFeedParams {
  page?:     number;
  limit?:    number;
  category?: string;
}

export interface ActivityFeedResponse {
  items:    FeedActivityItem[];
  total:    number;
  page:     number;
  pageSize: number;
  hasMore:  boolean;
}

export const dashboardService = {
  /** Freelancer KPI stats for the overview dashboard cards */
  getFreelancerStats: () =>
    apiClient.get<ApiResponse<FreelancerDashboardStats>>("/dashboard/freelancer/stats"),

  /** Paginated activity timeline */
  getFreelancerActivity: (params?: ActivityFeedParams) =>
    apiClient.get<ApiResponse<ActivityFeedResponse>>("/dashboard/freelancer/activity", {
      params,
    }),

  /** Full analytics payload for the analytics page */
  getFreelancerAnalytics: () =>
    apiClient.get<ApiResponse<FreelancerAnalyticsData>>("/dashboard/freelancer/analytics"),
};

// ── Client dashboard services ────────────────────────────────────────────────

export const clientDashboardService = {
  /** Client KPI stats for the overview dashboard cards */
  getClientStats: () =>
    apiClient.get<ApiResponse<ClientDashboardStats>>("/dashboard/client/stats"),

  /** Paginated client activity timeline */
  getClientActivity: (params?: ActivityFeedParams) =>
    apiClient.get<ApiResponse<ActivityFeedResponse>>("/dashboard/client/activity", {
      params,
    }),
};
