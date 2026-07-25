import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export interface ReviewDto {
  id:              string;
  contract:        string | { id: string; title: string; budget?: number };
  rating:          number; // Overall Rating
  communication:   number;
  qualityOfWork:   number;
  deliveryTime:    number;
  professionalism: number;
  recommend:       boolean | null;
  comment:         string;
  createdAt:       string;
  updatedAt:       string;
  canEdit:         boolean;
  reviewer?: {
    id:        string;
    fullName:  string;
    avatar?:   string;
    role?:     string;
  };
  reviewee?: {
    id:        string;
    fullName:  string;
    avatar?:   string;
    role?:     string;
  };
}

export interface ReviewablePartyDto {
  id?: string;
  fullName: string;
  avatar?: string;
}

export interface ReviewableContractDto {
  id: string;
  title: string;
  budget: number;
  client: ReviewablePartyDto;
  freelancer: ReviewablePartyDto;
  createdAt: string;
  updatedAt: string;
}

export interface ReviewPayload {
  contractId:      string;
  rating:          number;
  communication:   number;
  qualityOfWork:   number;
  deliveryTime:    number;
  professionalism: number;
  recommend?:      boolean;
  comment?:        string;
}

export const reviewService = {
  /** All reviews left for a specific user (used by profile pages) */
  listForUser: (userId: string) =>
    apiClient.get<ApiResponse<ReviewDto[]>>(`/reviews/user/${userId}`),

  /** Reviews the logged-in user has given and/or received */
  getMine: (type?: "given" | "received") =>
    apiClient.get<ApiResponse<{ given: ReviewDto[]; received: ReviewDto[] }>>(
      `/reviews/mine${type ? `?type=${type}` : ""}`
    ),

  /** Completed contracts the logged-in user hasn't reviewed yet */
  getReviewableContracts: () =>
    apiClient.get<ApiResponse<ReviewableContractDto[]>>("/reviews/reviewable"),

  /** Submit a review for a completed contract */
  create: (payload: ReviewPayload) =>
    apiClient.post<ApiResponse<ReviewDto>>("/reviews", payload),

  /** Edit a review — only the author, only within the edit window */
  update: (reviewId: string, payload: Partial<Omit<ReviewPayload, "contractId">>) =>
    apiClient.patch<ApiResponse<ReviewDto>>(`/reviews/${reviewId}`, payload),
};
