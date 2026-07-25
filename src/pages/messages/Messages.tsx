import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Video, Phone, Search, MoreVertical, Pin, Smile, Paperclip, Mic, Send, X, Loader2, MessageSquarePlus } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Modal } from "@/components/ui/Modal";
import { useAuth } from "@/context/AuthContext";
import { CLIENT_NAV, FREELANCER_NAV } from "@/constants/nav";
import { cn } from "@/utils/cn";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { messageService } from "@/services/message.service";
import { contractService } from "@/services/contract.service";
import { useNotification } from "@/context/NotificationContext";
import type { Contract } from "@/types";

export default function Messages() {
  const { user } = useAuth();
  const navItems = user?.role === "client" ? CLIENT_NAV : FREELANCER_NAV;
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  const [searchParams] = useSearchParams();

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showPinned, setShowPinned] = useState(true);
  const [draft, setDraft] = useState("");
  const [showNewMessageModal, setShowNewMessageModal] = useState(false);
  // A partner picked from the "New Message" contact picker — same shape/role
  // as the ?to= deep-link partner below, just chosen from inside the page.
  const [pickedPartner, setPickedPartner] = useState<{ id: string; name: string; avatar?: string } | null>(null);

  // 1. Fetch conversations
  const { data: conversationsResponse, isLoading: loadingConversations } = useQuery({
    queryKey: ["conversations"],
    queryFn: async () => {
      const res = await messageService.listConversations();
      return res.data;
    },
  });

  const fetchedConversations = conversationsResponse?.data || [];

  // People the user actually has a working relationship with (contract
  // partners) — used to power "New Message" when there's no existing
  // conversation and no deep link to jump in from.
  const { data: contractsResponse } = useQuery({
    queryKey: ["contracts", "all"],
    queryFn: async () => (await contractService.list()).data,
  });
  const allContracts: Contract[] = (contractsResponse as any)?.data || [];
  const isClient = user?.role === "client";
  const contacts = (() => {
    const map = new Map<string, { id: string; name: string; avatar?: string }>();
    allContracts.forEach((c: any) => {
      const partner = isClient ? c.freelancer : c.client;
      const partnerId = partner?.id || partner?._id;
      if (partnerId && !map.has(partnerId)) {
        map.set(partnerId, { id: partnerId, name: partner.fullName, avatar: partner.avatar });
      }
    });
    return Array.from(map.values());
  })();

  // ── Deep-link support: /messages?to=<userId>&name=..&avatar=..
  // Lets other pages (e.g. Proposals) jump straight into a chat with a specific
  // user, even before any message has ever been sent between the two of them.
  // A partner picked from the in-page "New Message" picker works the same way.
  const myId = user?.id || user?._id || "";
  const toParam = searchParams.get("to");
  const newPartner = toParam
    ? { id: toParam, name: searchParams.get("name") || "New Conversation", avatar: searchParams.get("avatar") || undefined }
    : pickedPartner;
  const virtualConversationId = newPartner ? [myId, newPartner.id].sort().join("-") : null;

  const conversations = (() => {
    if (!virtualConversationId || !newPartner) return fetchedConversations;
    if (fetchedConversations.some((c) => c.id === virtualConversationId)) return fetchedConversations;
    return [
      {
        id: virtualConversationId,
        partnerName: newPartner.name,
        partnerAvatar: newPartner.avatar,
        partnerId: newPartner.id,
        lastMessage: "",
        timestamp: new Date().toISOString(),
        unreadCount: 0,
      },
      ...fetchedConversations,
    ];
  })();

  // Automatically select the deep-linked partner, else the first conversation
  if (!activeId && virtualConversationId) {
    setActiveId(virtualConversationId);
  } else if (!activeId && conversations.length > 0) {
    setActiveId(conversations[0].id);
  }

  const startConversationWith = (contact: { id: string; name: string; avatar?: string }) => {
    setPickedPartner(contact);
    setActiveId([myId, contact.id].sort().join("-"));
    setShowNewMessageModal(false);
  };

  // Contacts not already reachable via an existing conversation thread.
  const newMessageCandidates = contacts.filter(
    (c) => !fetchedConversations.some((conv) => conv.partnerId === c.id)
  );

  const activeConversation = conversations.find((c) => c.id === activeId);

  // 2. Fetch messages for active conversation
  const { data: messagesResponse, isLoading: loadingMessages } = useQuery({
    queryKey: ["messages", activeId],
    queryFn: async () => {
      const res = await messageService.getMessages(activeId!);
      return res.data;
    },
    enabled: !!activeId,
  });

  const messages = messagesResponse?.data || [];

  // 3. Send message mutation
  const sendMutation = useMutation({
    mutationFn: async () => {
      if (!activeId || !draft.trim()) return;
      await messageService.send(activeId, draft);
    },
    onSuccess: () => {
      setDraft("");
      queryClient.invalidateQueries({ queryKey: ["messages", activeId] });
      queryClient.invalidateQueries({ queryKey: ["conversations"] });
    },
    onError: (err: any) => {
      notify(err.response?.data?.message || err.message || "Failed to send message.", "error");
    },
  });

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!draft.trim()) return;
    sendMutation.mutate();
  };

  return (
    <DashboardLayout navItems={navItems} tagline="Freelance Hub" searchPlaceholder="Search resources..." noPadding>
      <div className="flex h-full">
        {/* Conversation list */}
        <div className="flex w-80 shrink-0 flex-col border-r border-surface-border">
          <div className="space-y-3 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
              <input
                placeholder="Jump to…"
                className="h-11 w-full rounded-xl border border-surface-border bg-surface-muted pl-10 pr-3 text-sm outline-none"
              />
            </div>
            <button
              onClick={() => setShowNewMessageModal(true)}
              className="flex h-10 w-full items-center justify-center gap-2 rounded-xl bg-brand-600 text-sm font-bold text-white hover:bg-brand-700 transition-colors"
            >
              <MessageSquarePlus className="h-4 w-4" />
              New Message
            </button>
          </div>
          <div className="flex-1 overflow-y-auto scrollbar-thin px-2">
            <p className="px-2 pb-2 pt-1 text-xs font-bold uppercase tracking-wide text-ink-400">Direct Messages</p>
            {loadingConversations ? (
              <div className="flex h-32 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-brand-600" />
              </div>
            ) : conversations.length === 0 ? (
              <div className="px-2 py-4 text-center">
                <p className="text-sm text-ink-400">No conversations yet.</p>
                {contacts.length > 0 && (
                  <button
                    onClick={() => setShowNewMessageModal(true)}
                    className="mt-2 text-sm font-bold text-brand-600 hover:underline"
                  >
                    Start a conversation
                  </button>
                )}
              </div>
            ) : (
              conversations.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setActiveId(c.id)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-xl px-2 py-2.5 text-left transition-colors hover:bg-surface-muted",
                    activeId === c.id && "bg-brand-50"
                  )}
                >
                  <Avatar src={c.partnerAvatar} name={c.partnerName} size="md" />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-semibold text-ink-900">{c.partnerName}</p>
                    <p className="truncate text-xs text-ink-400">{c.lastMessage}</p>
                  </div>
                  {c.unreadCount !== undefined && c.unreadCount > 0 && (
                    <span className="flex h-5 w-5 items-center justify-center rounded-full bg-brand-600 text-[10px] font-bold text-white">
                      {c.unreadCount}
                    </span>
                  )}
                </button>
              ))
            )}
          </div>
        </div>

        {/* Chat window */}
        <div className="flex flex-1 flex-col">
          {activeConversation ? (
            <>
              <div className="flex h-20 items-center gap-3 border-b border-surface-border px-6">
                <Avatar src={activeConversation.partnerAvatar} name={activeConversation.partnerName} size="md" />
                <div>
                  <p className="font-bold text-ink-900">{activeConversation.partnerName}</p>
                  <p className="text-xs font-medium text-ink-400">Direct Message Thread</p>
                </div>
                <div className="ml-auto flex items-center gap-2 text-ink-400">
                  <button aria-label="Video call" className="rounded-lg p-2 hover:bg-surface-muted"><Video className="h-5 w-5" /></button>
                  <button aria-label="Voice call" className="rounded-lg p-2 hover:bg-surface-muted"><Phone className="h-5 w-5" /></button>
                  <button aria-label="Search in chat" className="rounded-lg p-2 hover:bg-surface-muted"><Search className="h-5 w-5" /></button>
                  <button aria-label="More options" className="rounded-lg p-2 hover:bg-surface-muted"><MoreVertical className="h-5 w-5" /></button>
                </div>
              </div>

              {showPinned && (
                <div className="mx-6 mt-4 flex items-start gap-3 rounded-xl border border-brand-200 bg-brand-50 p-3">
                  <Pin className="mt-0.5 h-4 w-4 shrink-0 text-brand-600" />
                  <p className="text-sm text-ink-700">
                    <span className="font-bold text-brand-700">Pinned message: </span>
                    The latest API documentation for the AI node integration is ready for review.
                  </p>
                  <button onClick={() => setShowPinned(false)} aria-label="Dismiss pinned message" className="ml-auto text-ink-400">
                    <X className="h-4 w-4" />
                  </button>
                </div>
              )}

              <div className="flex-1 space-y-5 overflow-y-auto p-6">
                <p className="text-center text-xs font-semibold text-ink-400">CONVERSATION LOGS</p>
                {loadingMessages ? (
                  <div className="flex h-full items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
                  </div>
                ) : (
                  messages.map((m: any) => {
                    const isOwn = m.senderId === user?._id || m.senderId === user?.id;
                    return isOwn ? (
                      <div key={m.id} className="flex flex-col items-end gap-1">
                        <div className="max-w-md rounded-2xl rounded-tr-sm bg-brand-600 px-4 py-3 text-sm text-white">
                          {m.content}
                        </div>
                        <span className="text-[10px] font-semibold uppercase text-ink-400">
                          {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                    ) : (
                      <div key={m.id} className="flex gap-3">
                        <Avatar src={m.senderAvatar} name={m.senderName} size="sm" className="mt-1" />
                        <div className="flex flex-col gap-1">
                          <div className="max-w-md rounded-2xl rounded-tl-sm bg-surface-muted px-4 py-3 text-sm text-ink-900">
                            {m.content}
                          </div>
                          <span className="text-[10px] font-semibold uppercase text-ink-400">
                            {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Message Composer */}
              <form onSubmit={handleSend} className="border-t border-surface-border p-4">
                <div className="flex items-center gap-2 rounded-2xl border border-surface-border bg-surface-card px-4 py-2.5 focus-within:border-brand-500">
                  <button type="button" aria-label="Add attachment" className="text-ink-400 hover:text-ink-900">
                    <Paperclip className="h-5 w-5" />
                  </button>
                  <input
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder={`Message ${activeConversation.partnerName}…`}
                    className="flex-1 text-sm text-ink-900 outline-none placeholder:text-ink-400"
                  />
                  <div className="flex items-center gap-2">
                    <button type="button" aria-label="Add emoji" className="text-ink-400 hover:text-ink-900">
                      <Smile className="h-5 w-5" />
                    </button>
                    <button type="button" aria-label="Record voice note" className="text-ink-400 hover:text-ink-900">
                      <Mic className="h-5 w-5" />
                    </button>
                    <button
                      type="submit"
                      disabled={!draft.trim() || sendMutation.isPending}
                      aria-label="Send message"
                      className="rounded-xl bg-brand-600 p-2 text-white transition-colors hover:bg-brand-700 disabled:bg-surface-muted disabled:text-ink-300"
                    >
                      {sendMutation.isPending ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Send className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
              </form>
            </>
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center gap-3 text-ink-400">
              <p>Select a conversation to start messaging.</p>
              {contacts.length > 0 && (
                <button
                  onClick={() => setShowNewMessageModal(true)}
                  className="flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-bold text-white hover:bg-brand-700 transition-colors"
                >
                  <MessageSquarePlus className="h-4 w-4" />
                  New Message
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={showNewMessageModal} onClose={() => setShowNewMessageModal(false)} title="New Message">
        {newMessageCandidates.length === 0 && contacts.length === 0 ? (
          <p className="py-6 text-center text-sm text-ink-500">
            {isClient
              ? "You'll be able to message a freelancer once you've hired them for a job."
              : "You'll be able to message a client once they've hired you for a job."}
          </p>
        ) : (
          <div className="max-h-96 space-y-1 overflow-y-auto">
            {(newMessageCandidates.length > 0 ? newMessageCandidates : contacts).map((c) => (
              <button
                key={c.id}
                onClick={() => startConversationWith(c)}
                className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left hover:bg-surface-muted transition-colors"
              >
                <Avatar src={c.avatar} name={c.name} size="md" />
                <p className="text-sm font-semibold text-ink-900">{c.name}</p>
              </button>
            ))}
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
