import { apiClient } from "@/lib/axios";
import type {
  ApiResponse,
  WorkspaceFile,
  WorkspaceFolder,
  WorkspaceTask,
  WorkspaceMilestone,
  WorkspaceDeliverable,
  WorkspaceTimeLog,
  WorkspaceOverview,
  WorkspaceActivityItem,
  WorkspaceMessage,
  Contract,
  ProjectSubmission,
  SubmittedProjectItem,
  MyMilestoneItem,
  MyFileItem,
} from "@/types";

export const workspaceService = {
  // Overview & Activity
  getOverview: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceOverview>>(`/workspaces/${projectId}/overview`),
  getActivity: (projectId: string, limit?: number) =>
    apiClient.get<ApiResponse<WorkspaceActivityItem[]>>(
      `/workspaces/${projectId}/activity${limit ? `?limit=${limit}` : ""}`
    ),

  // Messages — REST fallback/search; the real-time path is Socket.io.
  getMessages: (projectId: string, q?: string) =>
    apiClient.get<ApiResponse<WorkspaceMessage[]>>(
      `/workspaces/${projectId}/messages${q ? `?q=${encodeURIComponent(q)}` : ""}`
    ),
  sendMessage: (projectId: string, content: string) =>
    apiClient.post<ApiResponse<WorkspaceMessage>>(`/workspaces/${projectId}/messages`, { content }),
  markMessagesRead: (projectId: string) =>
    apiClient.patch<ApiResponse<null>>(`/workspaces/${projectId}/messages/read`),

  // Tasks
  getTasks: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceTask[]>>(`/workspaces/${projectId}/tasks`),
  createTask: (projectId: string, payload: Partial<WorkspaceTask>) =>
    apiClient.post<ApiResponse<WorkspaceTask>>(`/workspaces/${projectId}/tasks`, payload),
  moveTask: (projectId: string, taskId: string, column: string) =>
    apiClient.patch<ApiResponse<WorkspaceTask>>(`/workspaces/${projectId}/tasks/${taskId}`, {
      column,
    }),
  updateTask: (
    projectId: string,
    taskId: string,
    payload: Partial<Pick<WorkspaceTask, "title" | "label" | "labelColor" | "column">> & { assignee?: string | null }
  ) => apiClient.patch<ApiResponse<WorkspaceTask>>(`/workspaces/${projectId}/tasks/${taskId}`, payload),

  // Folders & Files
  getFolders: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceFolder[]>>(`/workspaces/${projectId}/folders`),
  getFiles: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceFile[]>>(`/workspaces/${projectId}/files`),
  uploadFile: (projectId: string, formData: FormData) =>
    apiClient.post<ApiResponse<WorkspaceFile>>(`/workspaces/${projectId}/files`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  deleteFile: (projectId: string, fileId: string) =>
    apiClient.delete<ApiResponse<null>>(`/workspaces/${projectId}/files/${fileId}`),

  // Milestones
  getMilestones: (projectId: string) =>
    apiClient.get<ApiResponse<WorkspaceMilestone[]>>(`/workspaces/${projectId}/milestones`),
  createMilestone: (projectId: string, payload: Partial<WorkspaceMilestone>) =>
    apiClient.post<ApiResponse<WorkspaceMilestone>>(`/workspaces/${projectId}/milestones`, payload),
  updateMilestone: (milestoneId: string, payload: Partial<WorkspaceMilestone>) =>
    apiClient.patch<ApiResponse<WorkspaceMilestone>>(`/workspaces/milestones/${milestoneId}`, payload),
  deleteMilestone: (milestoneId: string) =>
    apiClient.delete<ApiResponse<null>>(`/workspaces/milestones/${milestoneId}`),
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

  // Project Submission (whole-project submit/review)
  submitProject: (projectId: string, formData: FormData) =>
    apiClient.post<ApiResponse<ProjectSubmission>>(`/workspaces/${projectId}/submit`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  getSubmission: (projectId: string) =>
    apiClient.get<ApiResponse<ProjectSubmission | null>>(`/workspaces/${projectId}/submission`),
  listSubmittedProjects: () =>
    apiClient.get<ApiResponse<SubmittedProjectItem[]>>(`/workspaces/submitted-projects`),
  listMySubmissions: () =>
    apiClient.get<ApiResponse<ProjectSubmission[]>>(`/workspaces/my-submissions`),

  // Cross-project lists (all contracts, not a single project's tab)
  listMyMilestones: () =>
    apiClient.get<ApiResponse<MyMilestoneItem[]>>(`/workspaces/my-milestones`),
  listMyFiles: () =>
    apiClient.get<ApiResponse<MyFileItem[]>>(`/workspaces/my-files`),
  reviewSubmission: (projectId: string, action: "approve" | "request_revision", feedback?: string) =>
    apiClient.post<ApiResponse<{ contract: Contract; submission: ProjectSubmission }>>(
      `/workspaces/${projectId}/submission/review`,
      { action, feedback }
    ),
};
