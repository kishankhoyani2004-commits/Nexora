import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export type WithdrawalMethod = "bank" | "upi" | "paypal";
export type WithdrawalStatus = "pending" | "processing" | "completed" | "failed" | "rejected";

export interface WithdrawalDestination {
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  upiId?: string;
  paypalEmail?: string;
}

export interface Withdrawal {
  id: string;
  freelancer: string;
  amount: number;
  method: WithdrawalMethod;
  destination: WithdrawalDestination;
  status: WithdrawalStatus;
  failureReason: string;
  reference: string;
  processedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CreateWithdrawalPayload {
  amount: number;
  method: WithdrawalMethod;
  destination: WithdrawalDestination;
}

export const withdrawalService = {
  getBalance: () => apiClient.get<ApiResponse<{ available: number }>>("/withdrawals/balance"),

  getHistory: () => apiClient.get<ApiResponse<Withdrawal[]>>("/withdrawals"),

  requestWithdrawal: (payload: CreateWithdrawalPayload) =>
    apiClient.post<ApiResponse<Withdrawal>>("/withdrawals", payload),
};
