import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export interface ReviewDto {
  id:              string;
  contractId:      string;
  rating:          number;
  comment:         string;
  createdAt:       string;
  reviewer?: {
    id:        string;
    fullName:  string;
    avatar?:   string;
  };
  reviewee?: {
    id:        string;
    fullName:  string;
    avatar?:   string;
  };
}

export const reviewService = {
  /** All reviews left for a specific user */
  listForUser: (userId: string) =>
    apiClient.get<ApiResponse<ReviewDto[]>>(`/reviews/user/${userId}`),

  /** Submit a review for a completed contract */
  create: (payload: { contractId: string; rating: number; comment?: string }) =>
    apiClient.post<ApiResponse<ReviewDto>>("/reviews", payload),
};
