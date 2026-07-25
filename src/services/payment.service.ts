import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export interface TransactionDto {
  id:             string;
  transactionId:  string;
  projectTitle:   string;
  projectId:      string | null;
  contractId:     string | null;
  milestoneId:    string | null;
  milestoneTitle: string | null;
  freelancerName: string;
  freelancerAvatar: string;
  clientName:     string;
  amount:         number;
  method:         "escrow" | "stripe" | "card" | "bank_transfer";
  status:         "completed" | "pending" | "refunded";
  rawStatus:      "pending" | "in_escrow" | "released" | "withdrawn" | "refunded";
  description:    string;
  date:           string;
  type:           "payout" | "charge";
}

export interface PaymentIntentDto {
  clientSecret:    string;
  paymentIntentId: string;
}

export interface ReleasableMilestoneDto {
  milestoneId:      string;
  contractId:        string | null;
  projectTitle:       string;
  freelancerName:     string;
  freelancerAvatar:   string;
  title:              string;
  budget:             number;
  dueDate:            string;
  submissionText?:    string;
  submissionUrl?:     string;
}

export interface ClientFinanceMonthPoint {
  month: string;
  year: number;
  amount: number;
}

export interface ClientRecentPayment {
  id: string;
  projectTitle: string;
  freelancerName: string;
  amount: number;
  status: string;
  date: string;
}

export interface ClientFinanceDashboard {
  pendingPayments: { count: number; amount: number };
  completedPayments: { count: number; amount: number };
  upcomingPayments: { count: number; amount: number };
  totalSpent: number;
  monthlySpending: number;
  monthlySpendingChart: ClientFinanceMonthPoint[];
  recentPayments: ClientRecentPayment[];
}

export const paymentService = {
  /** Transaction history for the authenticated user, optionally filtered by display status */
  listTransactions: (status?: "completed" | "pending" | "refunded") =>
    apiClient.get<ApiResponse<TransactionDto[]>>(`/payments/history${status ? `?status=${status}` : ""}`),

  /** Milestones submitted by a freelancer and awaiting the client's payment release */
  getReleasableMilestones: () =>
    apiClient.get<ApiResponse<ReleasableMilestoneDto[]>>("/payments/releasable-milestones"),

  /** Release payment for one specific milestone — creates/updates the Earning ledger entry */
  releaseMilestonePayment: (milestoneId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/payments/milestones/${milestoneId}/release`),

  /** Refund a transaction (by Earning id) */
  refundPayment: (earningId: string) =>
    apiClient.post<ApiResponse<unknown>>(`/payments/${earningId}/refund`),

  /** Downloads the PDF receipt for a transaction and saves it locally */
  downloadReceipt: async (earningId: string, transactionId: string) => {
    const res = await apiClient.get(`/payments/${earningId}/receipt`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${transactionId}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
  },

  /** Create a Stripe payment intent for a contract */
  createIntent: (contractId: string) =>
    apiClient.post<ApiResponse<PaymentIntentDto>>("/payments/intent", {
      contractId,
    }),

  /** Client Finance Dashboard summary — pending/completed/upcoming, spending chart, recent payments */
  getDashboard: () =>
    apiClient.get<ApiResponse<ClientFinanceDashboard>>("/payments/dashboard"),
};
