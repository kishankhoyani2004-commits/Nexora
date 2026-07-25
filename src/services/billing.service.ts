import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export type BillingMethodType = "card" | "upi" | "netbanking";

export interface BillingMethod {
  id: string;
  user: string;
  type: BillingMethodType;
  isDefault: boolean;
  label: string;
  cardBrand?: string;
  last4?: string;
  expiryMonth?: number | null;
  expiryYear?: number | null;
  upiId?: string;
  bankName?: string;
  createdAt: string;
}

export interface AddBillingMethodPayload {
  type: BillingMethodType;
  label?: string;
  isDefault?: boolean;
  // card
  cardNumber?: string;
  cardBrand?: string;
  expiryMonth?: number;
  expiryYear?: number;
  // upi
  upiId?: string;
  // netbanking
  bankName?: string;
}

export interface BillingProfile {
  companyName: string;
  address: string;
  gstId: string;
  country: string;
  state: string;
  city: string;
}

export const billingService = {
  getMethods: () => apiClient.get<ApiResponse<BillingMethod[]>>("/billing/methods"),

  addMethod: (payload: AddBillingMethodPayload) =>
    apiClient.post<ApiResponse<BillingMethod>>("/billing/methods", payload),

  removeMethod: (id: string) => apiClient.delete<ApiResponse<null>>(`/billing/methods/${id}`),

  setDefault: (id: string) => apiClient.patch<ApiResponse<BillingMethod>>(`/billing/methods/${id}/default`),

  getProfile: () => apiClient.get<ApiResponse<BillingProfile>>("/billing/profile"),

  updateProfile: (payload: Partial<BillingProfile>) =>
    apiClient.patch<ApiResponse<BillingProfile>>("/billing/profile", payload),
};
