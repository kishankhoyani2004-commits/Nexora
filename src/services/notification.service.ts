import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export interface NotificationDto {
  id: string;
  title: string;
  message: string;
  type?: string;
  link?: string;
  read: boolean;
  createdAt: string;
}

export const notificationService = {
  list: () => apiClient.get<ApiResponse<NotificationDto[]>>("/notifications"),
  unreadCount: () => apiClient.get<ApiResponse<{ count: number }>>("/notifications/unread-count"),
  markAsRead: (id: string) => apiClient.post<ApiResponse<null>>(`/notifications/${id}/read`),
  markAllAsRead: () => apiClient.post<ApiResponse<null>>("/notifications/read-all"),
};
