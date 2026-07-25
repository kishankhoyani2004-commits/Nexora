import { apiClient } from "@/lib/axios";
import type { ApiResponse, Invitation } from "@/types";

export interface CreateInvitationPayload {
  freelancerId: string;
  jobId:        string;
  message?:     string;
}

export const invitationService = {
  /** Client sends an invitation to a freelancer for one of their own open jobs */
  create: (payload: CreateInvitationPayload) =>
    apiClient.post<ApiResponse<Invitation>>("/invitations", payload),

  /** Invitations the authenticated client has sent */
  listSent: () =>
    apiClient.get<ApiResponse<Invitation[]>>("/invitations/sent"),

  /** Invitations received by the authenticated freelancer */
  listReceived: () =>
    apiClient.get<ApiResponse<{ items: Invitation[]; total: number; pendingCount: number }>>(
      "/invitations/received"
    ),

  /** Freelancer accepts or declines an invitation */
  respond: (id: string, action: "accept" | "decline") =>
    apiClient.patch<ApiResponse<Invitation>>(`/invitations/${id}/respond`, { action }),
};
