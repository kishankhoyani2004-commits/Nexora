import { apiClient } from "@/lib/axios";
import type { ApiResponse, User } from "@/types";

export const userService = {
  getById: (id: string) => apiClient.get<ApiResponse<User>>(`/users/${id}`),
  updateProfile: (id: string, payload: Partial<User>) =>
    apiClient.patch<ApiResponse<User>>(`/users/${id}`, payload),
  uploadAvatar: (id: string, formData: FormData) =>
    apiClient.post<ApiResponse<{ avatarUrl: string }>>(`/users/${id}/avatar`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
};
