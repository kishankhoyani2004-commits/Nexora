import { apiClient } from "@/lib/axios";
import type {
  ApiResponse,
  WorkspaceFile,
  WorkspaceFolder,
  WorkspaceTask,
  WorkspaceMilestone,
  WorkspaceDeliverable,
  WorkspaceTimeLog,
} from "@/types";

export const workspaceService = {
  // Tasks
  getTasks: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceTask[]>>(`/workspaces/${projectId}/tasks`),
  createTask: (projectId: string, payload: Partial<WorkspaceTask>) =>
    apiClient.post<ApiResponse<WorkspaceTask>>(`/workspaces/${projectId}/tasks`, payload),
  moveTask: (projectId: string, taskId: string, column: string) =>
    apiClient.patch<ApiResponse<WorkspaceTask>>(`/workspaces/${projectId}/tasks/${taskId}`, {
      column,
    }),

  // Folders & Files
  getFolders: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceFolder[]>>(`/workspaces/${projectId}/folders`),
  getFiles: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceFile[]>>(`/workspaces/${projectId}/files`),
  uploadFile: (projectId: string, formData: FormData) =>
    apiClient.post<ApiResponse<WorkspaceFile>>(`/workspaces/${projectId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  // Milestones
  getMilestones: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceMilestone[]>>(`/workspaces/${projectId}/milestones`),
  createMilestone: (projectId: string, payload: Partial<WorkspaceMilestone>) =>
    apiClient.post<ApiResponse<WorkspaceMilestone>>(`/workspaces/${projectId}/milestones`, payload),
  submitMilestone: (milestoneId: string, submissionText: string, submissionUrl?: string) =>
    apiClient.post<ApiResponse<WorkspaceMilestone>>(`/workspaces/milestones/${milestoneId}/submit`, {
      submissionText,
      submissionUrl,
    }),
  reviewMilestone: (milestoneId: string, status: "approved" | "rejected", clientFeedback?: string) =>
    apiClient.post<ApiResponse<WorkspaceMilestone>>(`/workspaces/milestones/${milestoneId}/review`, {
      status,
      clientFeedback,
    }),

  // Deliverables
  getDeliverables: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceDeliverable[]>>(`/workspaces/${projectId}/deliverables`),
  createDeliverable: (projectId: string, payload: Partial<WorkspaceDeliverable>) =>
    apiClient.post<ApiResponse<WorkspaceDeliverable>>(`/workspaces/${projectId}/deliverables`, payload),

  // Time Tracking
  getTimeLogs: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceTimeLog[]>>(`/workspaces/${projectId}/time-logs`),
  getActiveTimeLog: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceTimeLog | null>>(`/workspaces/${projectId}/time-logs/active`),
  startTimeLog: (projectId: string) =>
    apiClient.post<ApiResponse<WorkspaceTimeLog>>(`/workspaces/${projectId}/time-logs/start`),
  stopTimeLog: (projectId: string, notes?: string) =>
    apiClient.post<ApiResponse<WorkspaceTimeLog>>(`/workspaces/${projectId}/time-logs/stop`, { notes }),
  createManualTimeLog: (projectId: string, payload: any) =>
    apiClient.post<ApiResponse<WorkspaceTimeLog>>(`/workspaces/${projectId}/time-logs/manual`, payload),
};
