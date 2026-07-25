import { apiClient, authStorage } from "@/lib/axios";
import type { ApiResponse, AiChat, AiChatSummary, AiChatSearchResult } from "@/types";

/**
 * AI service — talks to the real Gemini-backed backend (backend/services/geminiService.js).
 * Two generations of endpoints live here:
 *  - Legacy single-channel chat (kept for backward compatibility with older callers).
 *  - Real multi-chat AI Assistant (New Chat / Rename / Delete / Search / Streaming / Files).
 */
export const aiService = {
  // ── Legacy channel-based chat (backward compatible) ─────────────────────────
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

  // ── Real multi-chat AI Assistant ─────────────────────────────────────────────
  createChat: (title?: string, context?: string) =>
    apiClient.post<ApiResponse<AiChat>>("/ai/chats", { title, context }),

  listChats: () => apiClient.get<ApiResponse<AiChatSummary[]>>("/ai/chats"),

  searchChats: (q: string) =>
    apiClient.get<ApiResponse<AiChatSearchResult[]>>("/ai/chats/search", { params: { q } }),

  getChat: (chatId: string) => apiClient.get<ApiResponse<AiChat>>(`/ai/chats/${chatId}`),

  renameChat: (chatId: string, title: string) =>
    apiClient.patch<ApiResponse<AiChat>>(`/ai/chats/${chatId}`, { title }),

  togglePinChat: (chatId: string) =>
    apiClient.patch<ApiResponse<AiChat>>(`/ai/chats/${chatId}/pin`),

  deleteChat: (chatId: string) =>
    apiClient.delete<{ success: boolean; message: string }>(`/ai/chats/${chatId}`),

  sendChatMessage: (chatId: string, content: string) =>
    apiClient.post<ApiResponse<{ reply: string; chat: AiChat }>>(`/ai/chats/${chatId}/messages`, { content }),

  uploadChatFile: (chatId: string, formData: FormData) =>
    apiClient.post<ApiResponse<{ reply: string; chat: AiChat }>>(`/ai/chats/${chatId}/upload`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),

  suggestFollowups: (chatId: string) =>
    apiClient.get<ApiResponse<{ questions: string[] }>>(`/ai/chats/${chatId}/followups`),

  /**
   * True server-sent-events streaming — EventSource can't send a POST body or
   * auth headers, so this reads the fetch ReadableStream directly and parses
   * "data: {...}\n\n" frames as they arrive for a real typing effect.
   */
  streamChatMessage: async (
    chatId: string,
    content: string,
    handlers: {
      onChunk: (text: string) => void;
      onDone: (info: { chatId: string; title: string }) => void;
      onError: (message: string) => void;
    }
  ) => {
    const token = authStorage.get("nexora_access_token");
    const baseURL = (apiClient.defaults.baseURL as string) || "/api";

    try {
      const response = await fetch(`${baseURL}/ai/chats/${chatId}/stream`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({ content }),
      });

      if (!response.ok || !response.body) {
        throw new Error(`Stream request failed (${response.status})`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const frames = buffer.split("\n\n");
        buffer = frames.pop() || "";

        for (const frame of frames) {
          const line = frame.trim();
          if (!line.startsWith("data:")) continue;
          const jsonStr = line.slice(5).trim();
          if (!jsonStr) continue;

          try {
            const payload = JSON.parse(jsonStr);
            if (payload.chunk) handlers.onChunk(payload.chunk);
            if (payload.error) handlers.onError(payload.error);
            if (payload.done) handlers.onDone({ chatId: payload.chatId, title: payload.title });
          } catch {
            // Ignore malformed frame — stream continues.
          }
        }
      }
    } catch (err: any) {
      handlers.onError(err.message || "Streaming connection failed.");
    }
  },

  // ── Client AI features (real data) ──────────────────────────────────────────
  explainDashboard: () => apiClient.get<ApiResponse<{ content: string; stats: any }>>("/ai/client/dashboard/explain"),
  hiringRecommendations: () => apiClient.get<ApiResponse<{ content: string }>>("/ai/client/hiring-recommendations"),
  summarizeProjectProgress: (contractId: string) =>
    apiClient.get<ApiResponse<{ content: string }>>(`/ai/client/projects/${contractId}/summary`),
  improveJobDescription: (payload: { title?: string; description: string; skills?: string[] }) =>
    apiClient.post<ApiResponse<{ content: string }>>("/ai/client/job-description/improve", payload),
  suggestJobSkills: (payload: { title?: string; description?: string; category?: string }) =>
    apiClient.post<ApiResponse<{ skills: string[] }>>("/ai/client/job/suggest-skills", payload),
  estimateJobBudget: (payload: { title?: string; description?: string; category?: string; experienceLevel?: string; priceType?: string }) =>
    apiClient.post<ApiResponse<{ min: number; max: number; reasoning: string }>>("/ai/client/job/estimate-budget", payload),
  estimateJobDuration: (payload: { title?: string; description?: string; category?: string }) =>
    apiClient.post<ApiResponse<{ duration: string; reasoning: string }>>("/ai/client/job/estimate-duration", payload),
  suggestExperienceLevel: (payload: { title?: string; description?: string }) =>
    apiClient.post<ApiResponse<{ level: string; reasoning: string }>>("/ai/client/job/suggest-experience-level", payload),
  suggestJobCategory: (payload: { title?: string; description?: string }) =>
    apiClient.post<ApiResponse<{ category: string; subcategory: string; reasoning: string }>>("/ai/client/job/suggest-category", payload),
  compareProposals: (jobId: string) =>
    apiClient.get<ApiResponse<{ content: string; proposalCount: number }>>(`/ai/client/jobs/${jobId}/compare-proposals`),
  recommendBestFreelancer: (jobId: string) =>
    apiClient.get<ApiResponse<{ content: string }>>(`/ai/client/jobs/${jobId}/recommend-freelancer`),
  summarizeProposal: (proposalId: string) =>
    apiClient.get<ApiResponse<{ content: string }>>(`/ai/client/proposals/${proposalId}/summary`),
  highlightProposalRisks: (proposalId: string) =>
    apiClient.get<ApiResponse<{ content: string }>>(`/ai/client/proposals/${proposalId}/risks`),
  detectDelayedMilestones: () =>
    apiClient.get<ApiResponse<{ content: string; delayedCount: number }>>("/ai/client/projects/delayed-milestones"),
  suggestNextActions: (contractId: string) =>
    apiClient.get<ApiResponse<{ content: string }>>(`/ai/client/projects/${contractId}/next-actions`),
  generateClientMessage: (contractId: string, payload: { purpose?: string; tone?: string }) =>
    apiClient.post<ApiResponse<{ content: string }>>(`/ai/client/projects/${contractId}/generate-message`, payload),
  explainAnalyticsReport: () => apiClient.get<ApiResponse<{ content: string; stats: any }>>("/ai/client/analytics/explain"),
  hiringInsights: () => apiClient.get<ApiResponse<{ content: string }>>("/ai/client/analytics/hiring-insights"),
  spendingAnalysis: () => apiClient.get<ApiResponse<{ content: string; totalSpent: number; recentSpend: number }>>("/ai/client/analytics/spending"),

  // ── Freelancer AI features (real data) ──────────────────────────────────────
  analyzeJobPost: (jobId: string) => apiClient.get<ApiResponse<{ content: string }>>(`/ai/freelancer/jobs/${jobId}/analyze`),
  jobMatchScore: (jobId: string) =>
    apiClient.get<ApiResponse<{ score: number; reason: string; matchedSkills: string[] }>>(`/ai/freelancer/jobs/${jobId}/match-score`),
  explainJobMatch: (jobId: string) => apiClient.get<ApiResponse<{ content: string }>>(`/ai/freelancer/jobs/${jobId}/explain-match`),
  suggestBetterJobs: () => apiClient.get<ApiResponse<{ content: string; candidateCount: number }>>("/ai/freelancer/jobs/suggest-better"),
  generateProposalForJob: (jobId: string) =>
    apiClient.post<ApiResponse<{ content: string }>>(`/ai/freelancer/jobs/${jobId}/generate-proposal`, {}),
  improveProposalText: (proposalText: string) =>
    apiClient.post<ApiResponse<{ content: string }>>("/ai/freelancer/proposal/improve", { proposalText }),
  rewriteProfessionally: (text: string) =>
    apiClient.post<ApiResponse<{ content: string }>>("/ai/freelancer/proposal/rewrite", { text }),
  estimateBidAmount: (jobId: string) =>
    apiClient.post<ApiResponse<{ suggestedBid: number; reasoning: string }>>(`/ai/freelancer/jobs/${jobId}/estimate-bid`, {}),
  estimateProposalDeliveryTime: (jobId: string) =>
    apiClient.post<ApiResponse<{ estimatedDelivery: string; reasoning: string }>>(`/ai/freelancer/jobs/${jobId}/estimate-delivery`, {}),
  improveBio: (currentBio?: string) =>
    apiClient.post<ApiResponse<{ content: string }>>("/ai/freelancer/profile/improve-bio", { currentBio }),
  suggestProfileSkills: () => apiClient.get<ApiResponse<{ skills: string[] }>>("/ai/freelancer/profile/suggest-skills"),
  improvePortfolioDescription: (payload: { title?: string; description: string }) =>
    apiClient.post<ApiResponse<{ content: string }>>("/ai/freelancer/profile/improve-portfolio", payload),
  improveResumeText: (resumeText: string) =>
    apiClient.post<ApiResponse<{ content: string }>>("/ai/freelancer/profile/improve-resume", { resumeText }),
  generateProjectUpdate: (contractId: string) =>
    apiClient.post<ApiResponse<{ content: string }>>(`/ai/freelancer/projects/${contractId}/generate-update`, {}),
  generateClientReply: (contractId: string, payload: { incomingMessage: string; tone?: string }) =>
    apiClient.post<ApiResponse<{ content: string }>>(`/ai/freelancer/projects/${contractId}/generate-reply`, payload),
  explainTask: (taskId: string) =>
    apiClient.post<ApiResponse<{ content: string }>>(`/ai/freelancer/tasks/${taskId}/explain`, {}),
  breakDownTask: (taskId: string) =>
    apiClient.post<ApiResponse<{ subtasks: string[] }>>(`/ai/freelancer/tasks/${taskId}/breakdown`, {}),
  summarizeWorkspaceConversation: (projectId: string) =>
    apiClient.post<ApiResponse<{ content: string; messageCount: number }>>(`/ai/freelancer/workspace/${projectId}/summarize-conversation`, {}),
  summarizeWorkspaceFiles: (projectId: string) =>
    apiClient.post<ApiResponse<{ content: string; fileCount: number }>>(`/ai/freelancer/workspace/${projectId}/summarize-files`, {}),
  generateMeetingNotes: (projectId: string, rawNotes: string) =>
    apiClient.post<ApiResponse<{ content: string }>>(`/ai/freelancer/workspace/${projectId}/meeting-notes`, { rawNotes }),
  createTaskListFromText: (projectId: string, text: string) =>
    apiClient.post<ApiResponse<{ tasks: { title: string; label?: string }[] }>>(`/ai/freelancer/workspace/${projectId}/create-tasks`, { text }),
};
