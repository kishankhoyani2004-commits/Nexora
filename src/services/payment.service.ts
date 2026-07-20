import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export interface TransactionDto {
  id:           string;
  projectTitle: string;
  amount:       number;
  type:         "payout" | "charge";
  status:       "completed" | "pending" | "failed";
  date:         string;
}

export interface PaymentIntentDto {
  clientSecret:    string;
  paymentIntentId: string;
}

export const paymentService = {
  /** Transaction history for the authenticated user */
  listTransactions: () =>
    apiClient.get<ApiResponse<TransactionDto[]>>("/payments/history"),

  /** Create a Stripe payment intent for a contract */
  createIntent: (contractId: string) =>
    apiClient.post<ApiResponse<PaymentIntentDto>>("/payments/intent", {
      contractId,
    }),
};
