import { useState, useRef, useEffect, useMemo, useCallback } from "react";
import {
  Plus,
  MessageSquare,
  Pin,
  PinOff,
  FileText,
  Briefcase,
  Brain,
  Paperclip,
  Send,
  Loader2,
  Trash2,
  Pencil,
  Check,
  X,
  Copy,
  Search,
  DollarSign,
  ListChecks,
  UserCheck,
  Scale,
  ClipboardList,
  MessageSquareText,
  BarChart3,
  Wand2,
  Target,
  Clock,
  Layers,
  FileBadge,
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { CLIENT_NAV, FREELANCER_NAV } from "@/constants/nav";
import { aiService } from "@/services/ai.service";
import { useDebounce } from "@/hooks/useDebounce";
import type { AiChatMessage, AiChatSummary, AiChatSearchResult } from "@/types";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/utils/cn";

// ── Role-scoped AI tools — never mixed between Client and Freelancer. ───────
const TOOL_COLORS = [
  "border-l-brand-500", "border-l-violet-500", "border-l-teal-500", "border-l-amber-500",
  "border-l-rose-500", "border-l-sky-500", "border-l-emerald-500", "border-l-indigo-500",
  "border-l-fuchsia-500", "border-l-cyan-500", "border-l-orange-500", "border-l-lime-500",
];

const CLIENT_TOOLS = [
  { title: "Generate Job Description", description: "Draft a complete, professional job post from scratch.", icon: Briefcase, prompt: "Write a complete, professional job description for a role I want to hire for. Ask me for the job title and key requirements if you need more detail." },
  { title: "Improve Job Description", description: "Sharpen an existing draft to attract better freelancers.", icon: FileText, prompt: "Here is my current job description — please improve it to attract better freelancers. I'll paste it in my next message." },
  { title: "Estimate Project Budget", description: "Get a fair budget range for your project.", icon: DollarSign, prompt: "Help me estimate a fair project budget in INR. Ask me for the job title, scope, and experience level needed." },
  { title: "Suggest Required Skills", description: "Find the right technical skills to require.", icon: ListChecks, prompt: "Suggest the key technical skills I should require for a job I'm posting. Ask me for the job title and category if needed." },
  { title: "Recommend Best Freelancer", description: "Get a data-backed hiring recommendation.", icon: UserCheck, prompt: "Based on the proposals I've received on my open jobs, which freelancer should I hire and why?" },
  { title: "Compare Proposals", description: "See strengths, risks, and pricing side by side.", icon: Scale, prompt: "Compare the proposals I've received across my open jobs — highlight strengths, risks, and pricing differences." },
  { title: "Summarize Proposals", description: "Turn long cover letters into quick bullet points.", icon: ClipboardList, prompt: "Summarize the proposals I've received on my open jobs in a few bullet points each." },
  { title: "Hiring Advice", description: "Strategic recommendations based on your hiring history.", icon: Brain, prompt: "Based on my hiring history, give me strategic hiring advice and recommendations for what to focus on next." },
  { title: "Generate Client Messages", description: "Draft a message to a freelancer you're working with.", icon: MessageSquareText, prompt: "Help me draft a professional message to a freelancer I'm working with. Ask me for the project and the purpose of the message." },
  { title: "Project Progress Summary", description: "See how your active projects are really doing.", icon: BarChart3, prompt: "Summarize the progress of my active projects, including any milestones that need attention." },
].map((t, i) => ({ ...t, color: TOOL_COLORS[i % TOOL_COLORS.length] }));

const FREELANCER_TOOLS = [
  { title: "Generate Proposal", description: "Draft a high-converting project proposal cover letter.", icon: FileText, prompt: "Help me write a high-converting project proposal cover letter. Ask me what the job is about if you need more details." },
  { title: "Improve Proposal", description: "Make an existing draft more persuasive and professional.", icon: Wand2, prompt: "Here is my proposal draft — please improve it to be more persuasive and professional. I'll paste it in my next message." },
  { title: "Analyze Job Description", description: "Decide if a job posting is worth applying to.", icon: Search, prompt: "Analyze a job posting and tell me if it's a good opportunity. I'll paste the job description in my next message." },
  { title: "Job Match Score", description: "Find which open jobs best fit your skills.", icon: Target, prompt: "Based on my skills and profile, which open jobs on the platform are the best match for me, and why?" },
  { title: "Suggest Better Bid Amount", description: "Price your bid competitively without underselling.", icon: DollarSign, prompt: "Suggest a competitive bid amount for a job. Ask me for the job budget range and scope if needed." },
  { title: "Estimate Delivery Time", description: "Set a realistic, confident delivery timeframe.", icon: Clock, prompt: "Help me estimate a realistic delivery timeframe for a project. Ask me for the scope if needed." },
  { title: "Improve Portfolio", description: "Make a project description more results-focused.", icon: Layers, prompt: "Help me improve a portfolio project description so it's more results-focused and impressive. Ask me for the current description." },
  { title: "Improve Resume", description: "Polish your resume text for freelance clients.", icon: FileBadge, prompt: "Review and improve my resume/CV text. Ask me to paste it if I haven't already." },
  { title: "Improve Profile", description: "Strengthen your bio and skills for hireability.", icon: UserCheck, prompt: "Review my bio and skills, and suggest specific improvements to make my freelancer profile more attractive to clients." },
  { title: "Career Advice", description: "Request career goals coaching and market outlooks.", icon: Brain, prompt: "Give me career advice on how to grow as a freelancer, including market trends and next skill steps." },
  { title: "Generate Client Replies", description: "Draft a professional reply to a client message.", icon: MessageSquareText, prompt: "Help me draft a professional reply to a client message. Ask me to paste the client's message." },
  { title: "Project Task Breakdown", description: "Split a big project into manageable tasks.", icon: ListChecks, prompt: "Break down a project into smaller, actionable tasks. Ask me for the project description." },
].map((t, i) => ({ ...t, color: TOOL_COLORS[i % TOOL_COLORS.length] }));

type ChatListTab = "all" | "pinned";

// ── Splits assistant text into fenced code blocks + prose so code blocks can
// render as real, independently-copyable elements instead of one HTML blob. ──
function splitSegments(text: string) {
  const parts: { type: "text" | "code"; lang?: string; content: string }[] = [];
  const regex = /```(\w*)\n([\s\S]*?)```/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) parts.push({ type: "text", content: text.slice(lastIndex, match.index) });
    parts.push({ type: "code", lang: match[1], content: match[2].trim() });
    lastIndex = regex.lastIndex;
  }
  if (lastIndex < text.length) parts.push({ type: "text", content: text.slice(lastIndex) });
  return parts;
}

function CodeBlock({ lang, code }: { lang?: string; code: string }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };
  return (
    <div className="relative my-3 overflow-hidden rounded-2xl border border-surface-border bg-surface-muted">
      <div className="flex items-center justify-between border-b border-surface-border px-4 py-2">
        <span className="text-[10px] font-bold uppercase tracking-wider text-ink-400">{lang || "code"}</span>
        <button onClick={copy} className="flex items-center gap-1 text-[10px] font-bold text-ink-500 hover:text-brand-600">
          {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-4 text-[11px] font-mono leading-relaxed text-ink-800"><code>{code}</code></pre>
    </div>
  );
}

function ProseBlock({ text }: { text: string }) {
  let html = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  html = html.replace(/`([^`]+)`/g, '<code class="bg-surface-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-ink-800">$1</code>');
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-ink-900">$1</strong>');
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-brand-600 underline font-semibold">$1</a>');
  html = html.replace(/^### (.*)$/gim, '<h3 class="text-xs font-black text-ink-900 mt-4 mb-1.5 uppercase tracking-wider">$1</h3>');
  html = html.replace(/^## (.*)$/gim, '<h2 class="text-sm font-extrabold text-ink-900 mt-5 mb-2">$1</h2>');
  html = html.replace(/^\s*\d+\.\s+(.*)$/gim, '<li class="ml-4 list-decimal my-1">$1</li>');
  html = html.replace(/^\s*[-*]\s+(.*)$/gim, '<li class="ml-4 list-disc my-1">$1</li>');
  html = html.replace(/\n/g, "<br />");

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function MessageContent({ content }: { content: string }) {
  const segments = useMemo(() => splitSegments(content), [content]);
  return (
    <div className="space-y-1">
      {segments.map((seg, i) =>
        seg.type === "code" ? <CodeBlock key={i} lang={seg.lang} code={seg.content} /> : <ProseBlock key={i} text={seg.content} />
      )}
    </div>
  );
}

export default function AiAssistant() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const navItems = user?.role === "client" ? CLIENT_NAV : FREELANCER_NAV;
  // Detected live from the auth context — swaps instantly on role change, no reload.
  const tools = user?.role === "client" ? CLIENT_TOOLS : FREELANCER_TOOLS;

  const [chats, setChats] = useState<AiChatSummary[]>([]);
  const [chatsLoading, setChatsLoading] = useState(true);
  const [listTab, setListTab] = useState<ChatListTab>("all");

  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [messages, setMessages] = useState<AiChatMessage[]>([]);
  const [loadingChat, setLoadingChat] = useState(false);

  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [followups, setFollowups] = useState<string[]>([]);

  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<AiChatSearchResult[] | null>(null);
  const debouncedSearch = useDebounce(searchQuery, 300);

  const [renamingChatId, setRenamingChatId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // ── Load chat list on mount ──────────────────────────────────────────────
  const loadChats = useCallback(async () => {
    try {
      setChatsLoading(true);
      const res = await aiService.listChats();
      setChats(res.data.data || []);
    } catch (err) {
      console.error("[AiAssistant] Failed to load chats:", err);
    } finally {
      setChatsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // ── Search chats ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!debouncedSearch.trim()) {
      setSearchResults(null);
      return;
    }
    let active = true;
    aiService.searchChats(debouncedSearch).then((res) => {
      if (active) setSearchResults(res.data.data || []);
    }).catch(() => {
      if (active) setSearchResults([]);
    });
    return () => { active = false; };
  }, [debouncedSearch]);

  // ── Auto-scroll on new content ────────────────────────────────────────────
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // ── Open a chat ───────────────────────────────────────────────────────────
  const openChat = async (chatId: string) => {
    setActiveChatId(chatId);
    setSearchQuery("");
    setSearchResults(null);
    setFollowups([]);
    setLoadingChat(true);
    try {
      const res = await aiService.getChat(chatId);
      const chat = res.data.data;
      setMessages(
        (chat.messages || []).map((m: any, idx: number) => ({
          id: m.id || m._id || `m${idx}`,
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
          attachments: m.attachments,
        }))
      );
    } catch (err) {
      notify("Failed to load conversation.", "error");
    } finally {
      setLoadingChat(false);
    }
  };

  const newChat = async () => {
    try {
      const res = await aiService.createChat("New Chat");
      const chat = res.data.data;
      setChats((prev) => [{ id: chat.id, title: chat.title, context: chat.context, pinned: false, lastMessageAt: chat.lastMessageAt, createdAt: chat.createdAt, messageCount: 0, preview: "" }, ...prev]);
      setActiveChatId(chat.id);
      setMessages([]);
      setFollowups([]);
      return chat.id;
    } catch {
      notify("Failed to start a new chat.", "error");
      return null;
    }
  };

  const startRename = (chat: AiChatSummary, e: React.MouseEvent) => {
    e.stopPropagation();
    setRenamingChatId(chat.id);
    setRenameDraft(chat.title);
  };

  const confirmRename = async (chatId: string) => {
    if (!renameDraft.trim()) {
      setRenamingChatId(null);
      return;
    }
    try {
      await aiService.renameChat(chatId, renameDraft.trim());
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, title: renameDraft.trim() } : c)));
    } catch {
      notify("Failed to rename chat.", "error");
    } finally {
      setRenamingChatId(null);
    }
  };

  const togglePin = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await aiService.togglePinChat(chatId);
      setChats((prev) => prev.map((c) => (c.id === chatId ? { ...c, pinned: !c.pinned } : c)));
    } catch {
      notify("Failed to update chat.", "error");
    }
  };

  const removeChat = async (chatId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm("Delete this conversation? This cannot be undone.")) return;
    try {
      await aiService.deleteChat(chatId);
      setChats((prev) => prev.filter((c) => c.id !== chatId));
      if (activeChatId === chatId) {
        setActiveChatId(null);
        setMessages([]);
        setFollowups([]);
      }
      notify("Conversation deleted.", "success");
    } catch {
      notify("Failed to delete chat.", "error");
    }
  };

  // ── Send message (real streaming) ────────────────────────────────────────
  const send = async (content: string) => {
    if (!content.trim() || sending) return;

    let chatId = activeChatId;
    if (!chatId) {
      chatId = await newChat();
      if (!chatId) return;
    }

    const userMsg: AiChatMessage = { id: `u${Date.now()}`, role: "user", content, createdAt: new Date().toISOString() };
    const assistantId = `a${Date.now()}`;
    setMessages((prev) => [...prev, userMsg, { id: assistantId, role: "assistant", content: "", createdAt: new Date().toISOString() }]);
    setDraft("");
    setSending(true);
    setFollowups([]);

    await aiService.streamChatMessage(chatId, content, {
      onChunk: (chunk) => {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content + chunk } : m)));
      },
      onDone: ({ chatId: doneChatId, title }) => {
        setChats((prev) => {
          const exists = prev.some((c) => c.id === doneChatId);
          const updated = exists
            ? prev.map((c) => (c.id === doneChatId ? { ...c, title, lastMessageAt: new Date().toISOString() } : c))
            : prev;
          return [...updated].sort((a, b) => (b.pinned === a.pinned ? +new Date(b.lastMessageAt) - +new Date(a.lastMessageAt) : b.pinned ? 1 : -1));
        });
        aiService.suggestFollowups(doneChatId).then((res) => setFollowups(res.data.data.questions || [])).catch(() => {});
      },
      onError: (message) => {
        setMessages((prev) => prev.map((m) => (m.id === assistantId ? { ...m, content: m.content || `⚠️ ${message}` } : m)));
        notify(message, "error");
      },
    });

    setSending(false);
  };

  // ── File upload (real PDF/DOCX/TXT parsing) ──────────────────────────────
  const handleFileUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    let chatId = activeChatId;
    if (!chatId) {
      chatId = await newChat();
      if (!chatId) return;
    }

    const question = draft.trim();
    setUploading(true);
    notify(`Uploading "${file.name}" for AI analysis...`, "info");

    const userMsg: AiChatMessage = {
      id: `u${Date.now()}`,
      role: "user",
      content: `📎 Uploaded "${file.name}"${question ? `\n${question}` : ""}`,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");

    const formData = new FormData();
    formData.append("file", file);
    if (question) formData.append("question", question);

    try {
      const res = await aiService.uploadChatFile(chatId, formData);
      const reply = res.data.data.reply;
      setMessages((prev) => [...prev, { id: `a${Date.now()}`, role: "assistant", content: reply, createdAt: new Date().toISOString() }]);
      loadChats();
      notify("File analyzed successfully.", "success");
    } catch (err: any) {
      notify(err.response?.data?.message || "Failed to analyze file.", "error");
    } finally {
      setUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  // ── Derived list to show in the sidebar ──────────────────────────────────
  const visibleChats = listTab === "pinned" ? chats.filter((c) => c.pinned) : chats;

  return (
    <DashboardLayout navItems={navItems} tagline="AI Assistant Workspace" ctaLabel="New Chat" onCtaClick={newChat} noPadding>
      <div className="flex h-[calc(100vh-5rem)] overflow-hidden bg-surface-app">
        {/* ── CHAT LIST PANEL ── */}
        <div className="hidden w-72 shrink-0 flex-col border-r border-surface-border bg-surface-sidebar lg:flex">
          <div className="space-y-3 p-4">
            <Button fullWidth size="sm" icon={<Plus className="h-4 w-4" />} onClick={newChat}>
              New Chat
            </Button>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search chat history…"
                className="w-full rounded-xl border border-surface-border bg-surface-card py-2 pl-9 pr-3 text-xs text-ink-900 outline-none placeholder:text-ink-400 focus:border-brand-500"
              />
            </div>
            {!searchQuery && (
              <div className="flex rounded-xl border border-surface-border p-1">
                {(["all", "pinned"] as ChatListTab[]).map((tab) => (
                  <button
                    key={tab}
                    onClick={() => setListTab(tab)}
                    className={cn(
                      "flex-1 rounded-lg py-1.5 text-[11px] font-bold capitalize transition-colors",
                      listTab === tab ? "bg-brand-600 text-white" : "text-ink-500 hover:bg-surface-muted"
                    )}
                  >
                    {tab}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="flex-1 space-y-1 overflow-y-auto px-3 pb-4">
            {searchQuery ? (
              searchResults === null ? (
                <div className="px-2 py-6 text-center text-xs text-ink-400">Searching…</div>
              ) : searchResults.length === 0 ? (
                <div className="px-2 py-6 text-center text-xs text-ink-400">No matches for "{searchQuery}"</div>
              ) : (
                searchResults.map((r) => (
                  <button
                    key={r.id}
                    onClick={() => openChat(r.id)}
                    className={cn(
                      "w-full rounded-xl px-3 py-2.5 text-left transition-colors",
                      activeChatId === r.id ? "bg-brand-50" : "hover:bg-surface-muted"
                    )}
                  >
                    <p className="truncate text-xs font-bold text-ink-900">{r.title}</p>
                    <p className="mt-0.5 truncate text-[11px] text-ink-400">{r.snippet}</p>
                  </button>
                ))
              )
            ) : chatsLoading ? (
              <div className="flex justify-center py-6"><Loader2 className="h-4 w-4 animate-spin text-brand-600" /></div>
            ) : visibleChats.length === 0 ? (
              <div className="px-2 py-6 text-center text-xs text-ink-400">
                {listTab === "pinned" ? "No pinned chats yet." : "No conversations yet — start one below."}
              </div>
            ) : (
              visibleChats.map((c) => (
                <div
                  key={c.id}
                  onClick={() => openChat(c.id)}
                  className={cn(
                    "group relative flex cursor-pointer items-start gap-2 rounded-xl px-3 py-2.5 transition-colors",
                    activeChatId === c.id ? "bg-brand-50" : "hover:bg-surface-muted"
                  )}
                >
                  <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-400" />
                  <div className="min-w-0 flex-1">
                    {renamingChatId === c.id ? (
                      <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                        <input
                          autoFocus
                          value={renameDraft}
                          onChange={(e) => setRenameDraft(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter") confirmRename(c.id);
                            if (e.key === "Escape") setRenamingChatId(null);
                          }}
                          className="w-full rounded-lg border border-brand-400 bg-surface-card px-2 py-1 text-xs outline-none"
                        />
                        <button onClick={() => confirmRename(c.id)} className="text-brand-600"><Check className="h-3.5 w-3.5" /></button>
                        <button onClick={() => setRenamingChatId(null)} className="text-ink-400"><X className="h-3.5 w-3.5" /></button>
                      </div>
                    ) : (
                      <>
                        <p className="truncate text-xs font-bold text-ink-900">{c.title}</p>
                        <p className="mt-0.5 truncate text-[11px] text-ink-400">{c.preview || "No messages yet"}</p>
                      </>
                    )}
                  </div>
                  {renamingChatId !== c.id && (
                    <div className="hidden shrink-0 items-center gap-1 group-hover:flex">
                      <button onClick={(e) => togglePin(c.id, e)} className="text-ink-400 hover:text-brand-600" aria-label={c.pinned ? "Unpin" : "Pin"}>
                        {c.pinned ? <PinOff className="h-3.5 w-3.5" /> : <Pin className="h-3.5 w-3.5" />}
                      </button>
                      <button onClick={(e) => startRename(c, e)} className="text-ink-400 hover:text-brand-600" aria-label="Rename">
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      <button onClick={(e) => removeChat(c.id, e)} className="text-ink-400 hover:text-danger" aria-label="Delete">
                        <Trash2 className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>

        {/* MAIN PANEL */}
        <div className="flex flex-1 flex-col bg-surface-app">
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-8 py-10">
            {loadingChat ? (
              <div className="flex h-full items-center justify-center gap-2.5 text-xs font-bold text-ink-500">
                <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                <span>Loading conversation…</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto max-w-3xl space-y-10 pt-10">
                <div className="space-y-3 text-center">
                  <Badge tone="brand" className="mx-auto w-fit gap-1.5 font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> SYSTEM ONLINE
                  </Badge>
                  <h1 className="text-3xl font-black tracking-tight text-ink-900">How can I assist you today?</h1>
                  <p className="mx-auto max-w-md text-sm text-ink-500">
                    Ask anything, upload a document for analysis, or start with a quick action below.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {tools.map((action) => (
                    <button
                      key={action.title}
                      onClick={() => send(action.prompt)}
                      className={cn(
                        "rounded-2xl border border-l-4 border-surface-border bg-surface-card p-5 text-left shadow-card transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg",
                        action.color
                      )}
                    >
                      <action.icon className="mb-3 h-5 w-5 text-brand-600" />
                      <p className="text-sm font-bold text-ink-900">{action.title}</p>
                      <p className="mt-1 text-xs leading-relaxed text-ink-500">{action.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((m) => (
                  <div key={m.id} className={cn("group flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div className="relative max-w-xl">
                      <div
                        className={cn(
                          "rounded-3xl border px-5 py-4 text-xs leading-relaxed shadow-sm",
                          m.role === "user"
                            ? "rounded-tr-sm border-brand-500 bg-brand-600 text-white"
                            : "rounded-tl-sm border-surface-border bg-surface-card text-ink-900"
                        )}
                      >
                        {m.content ? <MessageContent content={m.content} /> : <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                      </div>
                      {m.role === "assistant" && m.content && (
                        <button
                          onClick={() => navigator.clipboard.writeText(m.content)}
                          className="absolute -bottom-2 right-1 hidden rounded-lg bg-surface-card p-1.5 text-ink-400 shadow-sm hover:text-brand-600 group-hover:flex"
                          aria-label="Copy response"
                          title="Copy response"
                        >
                          <Copy className="h-3 w-3" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}

                {followups.length > 0 && !sending && (
                  <div className="flex flex-wrap gap-2 pl-1">
                    {followups.map((q) => (
                      <button
                        key={q}
                        onClick={() => send(q)}
                        className="rounded-full border border-surface-border bg-surface-card px-3 py-1.5 text-[11px] font-semibold text-ink-600 shadow-sm hover:border-brand-400 hover:text-brand-600"
                      >
                        {q}
                      </button>
                    ))}
                  </div>
                )}

                {sending && (
                  <div className="flex items-center gap-2 text-xs font-bold text-ink-400">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                    <span>Nexora AI is thinking…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* INPUT AREA */}
          <div className="border-t border-surface-border bg-surface-header p-6">
            <div className="mx-auto max-w-3xl space-y-4">
              <input type="file" accept=".pdf,.doc,.docx,.txt,.csv" ref={fileInputRef} onChange={handleFileChange} className="hidden" />

              <div className="rounded-3xl border border-surface-border bg-surface-card p-3 shadow-md focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      send(draft);
                    }
                  }}
                  disabled={loadingChat}
                  placeholder="Message Nexora AI… (Shift+Enter for new line)"
                  rows={2}
                  className="w-full resize-none border-none bg-surface-card text-xs text-ink-900 outline-none placeholder:text-ink-400 disabled:opacity-50"
                />
                <div className="mt-2 flex items-center gap-3 text-ink-400">
                  <button
                    onClick={handleFileUploadClick}
                    disabled={uploading}
                    className="flex items-center gap-1 hover:text-ink-600 disabled:opacity-50"
                    aria-label="Upload file for analysis"
                    title="Upload PDF, DOCX, or TXT for AI analysis"
                  >
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                  </button>
                  <span className="text-[10px] font-semibold uppercase tracking-wide text-ink-300">PDF · DOCX · TXT</span>
                  <button
                    onClick={() => send(draft)}
                    disabled={!draft.trim() || sending || loadingChat}
                    aria-label="Send message"
                    className="ml-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-40"
                  >
                    {sending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <p className="text-center text-[10px] font-bold text-ink-400">
                Nexora AI can make mistakes. Verify important technical or financial details.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
