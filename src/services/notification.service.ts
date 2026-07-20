import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export const notificationService = {
  list: () => apiClient.get<ApiResponse<NotificationDto[]>>("/notifications"),
  markAsRead: (id: string) => apiClient.post<ApiResponse<null>>(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.post<ApiResponse<null>>("/notifications/read-all"),
};
