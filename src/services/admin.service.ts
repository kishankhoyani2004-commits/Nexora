import { apiClient } from "@/lib/axios";
import type { AdminUserRow, ApiResponse, ComplaintItem, PaginatedResponse, ServerNode } from "@/types";

export const adminService = {
  listUsers: (params?: { page?: number; status?: string; role?: string }) =>
    apiClient.get<ApiResponse<PaginatedResponse<AdminUserRow>>>("/admin/users", { params }),
  banUser: (id: string) => apiClient.post<ApiResponse<null>>(`/admin/users/${id}/ban`),
  getComplaints: () => apiClient.get<ApiResponse<ComplaintItem[]>>("/admin/complaints"),
  resolveComplaint: (id: string) =>
    apiClient.post<ApiResponse<null>>(`/admin/complaints/${id}/resolve`),
  getSystemHealth: () => apiClient.get<ApiResponse<ServerNode[]>>("/admin/system-health"),
  getAnalyticsOverview: () => apiClient.get<ApiResponse<Record<string, unknown>>>("/admin/analytics/overview"),
};
