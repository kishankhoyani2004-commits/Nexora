import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export interface Invoice {
  id: string;
  invoiceNumber: string;
  projectTitle: string;
  milestoneTitle: string | null;
  clientName: string;
  clientEmail: string;
  freelancerName: string;
  freelancerEmail: string;
  amount: number;
  platformFee: number;
  taxAmount: number;
  netAmount: number;
  currency: string;
  status: "paid" | "refunded";
  issuedAt: string;
}

export const invoiceService = {
  list: () => apiClient.get<ApiResponse<Invoice[]>>("/invoices"),

  getById: (id: string) => apiClient.get<ApiResponse<Invoice>>(`/invoices/${id}`),

  /** Downloads the PDF invoice and saves it locally. */
  downloadPdf: async (id: string, invoiceNumber: string) => {
    const res = await apiClient.get(`/invoices/${id}/pdf`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `${invoiceNumber}.pdf`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(url);
    return url;
  },

  /** Opens the PDF in a new tab so the browser's own print dialog can be used. */
  printPdf: async (id: string) => {
    const res = await apiClient.get(`/invoices/${id}/pdf`, { responseType: "blob" });
    const url = window.URL.createObjectURL(new Blob([res.data], { type: "application/pdf" }));
    const win = window.open(url, "_blank");
    win?.addEventListener("load", () => win.print());
  },
};
