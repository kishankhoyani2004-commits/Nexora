import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export interface Earning {
  id: string;
  freelancer: string;
  contract: { id: string; title: string } | string;
  job: { id: string; title: string; budget?: number } | string;
  client: { id: string; fullName: string; avatar?: string } | string;
  amount: number;
  status: "pending" | "in_escrow" | "released" | "withdrawn";
  description?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface EarningsSummary {
  total: number;
  pending: number;
  inEscrow: number;
  released: number;
  count: number;
}

export const earningService = {
  /** All earning records for the logged-in freelancer */
  getEarnings: () =>
    apiClient.get<ApiResponse<{ earnings: Earning[]; summary: EarningsSummary }>>("/earnings"),

  /** Summary totals only (total, pending, inEscrow, released) */
  getSummary: () =>
    apiClient.get<ApiResponse<EarningsSummary>>("/earnings/summary"),
};
