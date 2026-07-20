import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

/**
 * AI service — kept fully independent from any concrete AI provider.
 * The backend will implement the real generation logic later;
 * these are typed placeholders the AI Assistant UI calls today.
 */
export const aiService = {
  generateProposal: (jobId: string, context?: string) =>
    apiClient.post<ApiResponse<{ content: string }>>("/ai/generate-proposal", { jobId, context }),

  generateJobDescription: (prompt: string) =>
    apiClient.post<ApiResponse<{ content: string }>>("/ai/generate-job-description", { prompt }),

  resumeAnalysis: (formData: FormData) =>
    apiClient.post<ApiResponse<{ summary: string; suggestions: string[] }>>(
      "/ai/resume-analysis",
      formData,
      { headers: { "Content-Type": "multipart/form-data" } }
    ),

  careerAdvice: (prompt: string) =>
    apiClient.post<ApiResponse<{ content: string }>>("/ai/career-advice", { prompt }),

  skillRecommendation: (userId: string) =>
    apiClient.get<ApiResponse<{ skills: string[] }>>(`/ai/skill-recommendation/${userId}`),

  chat: (message: string, channel?: string) =>
    apiClient.post<{ success: boolean; reply: string }>("/ai/chat", {
      prompt: message,
      message,
      channel,
    }),

  getHistory: (channel: string) =>
    apiClient.get<{ success: boolean; messages: any[] }>("/ai/history", { params: { channel } }),

  clearHistory: (channel: string) =>
    apiClient.post<{ success: boolean; message: string }>("/ai/clear", { channel }),
};
