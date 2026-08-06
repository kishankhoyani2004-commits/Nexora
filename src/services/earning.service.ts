import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export interface Earning {
  id: string;
  freelancer: string;
  contract: { id: string; title: string } | string;
  job: { id: string; title: string; budget?: number } | string;
  client: { id: string; fullName: string; avatar?: string } | string;
  amount: number;
  status: "pending" | "in_escrow" | "released" | "withdrawn" | "refunded";
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

export interface EarningsMonthPoint {
  month: string;
  year: number;
  amount: number;
}

export interface RecentPayment {
  id: string;
  projectTitle: string;
  clientName: string;
  amount: number;
  status: string;
  date: string;
}

export interface TopPayingClient {
  clientId: string;
  name: string;
  avatar: string;
  total: number;
  projectCount: number;
}

export interface EarningsDashboard {
  totalEarnings: number;
  availableBalance: number;
  pendingClearance: number;
  withdrawnAmount: number;
  thisMonthEarnings: number;
  lastMonthEarnings: number;
  lifetimeEarnings: number;
  earningsByMonth: EarningsMonthPoint[];
  recentPayments: RecentPayment[];
  topPayingClients: TopPayingClient[];
}

export const earningService = {
  /** All earning records for the logged-in freelancer */
  getEarnings: () =>
    apiClient.get<ApiResponse<{ earnings: Earning[]; summary: EarningsSummary }>>("/earnings"),

  /** Summary totals only (total, pending, inEscrow, released) */
  getSummary: () =>
    apiClient.get<ApiResponse<EarningsSummary>>("/earnings/summary"),

  /** Full Earnings Dashboard payload — stats, monthly chart, recent payments, top clients */
  getDashboard: () =>
    apiClient.get<ApiResponse<EarningsDashboard>>("/earnings/dashboard"),
};
