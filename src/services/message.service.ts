import { apiClient } from "@/lib/axios";
import type { ApiResponse } from "@/types";

export interface ConversationDto {
  id:            string;
  partnerName:   string;
  partnerAvatar?: string;
  partnerId:     string;
  lastMessage:   string;
  timestamp:     string;
  unreadCount:   number;
}

export interface MessageDto {
  id:             string;
  conversationId: string;
  senderId:       string;
  senderName:     string;
  senderAvatar?:  string;
  content:        string;
  timestamp:      string;
}

export const messageService = {
  /** List all conversations for the authenticated user */
  listConversations: () =>
    apiClient.get<ApiResponse<ConversationDto[]>>("/messages/conversations"),

  /** Fetch messages for a specific conversation */
  getMessages: (conversationId: string) =>
    apiClient.get<ApiResponse<MessageDto[]>>(
      `/messages/conversations/${conversationId}`
    ),

  /** Send a message into a conversation */
  send: (conversationId: string, content: string) =>
    apiClient.post<ApiResponse<MessageDto>>(
      `/messages/conversations/${conversationId}`,
      { content }
    ),
};
