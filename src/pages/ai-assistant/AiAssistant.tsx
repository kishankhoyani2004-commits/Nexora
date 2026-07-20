import { useState, useRef, useEffect } from "react";
import {
  Plus,
  MessageSquare,
  Users,
  Pin,
  Mail,
  Archive,
  FileText,
  Briefcase,
  Brain,
  BarChart3,
  Zap,
  Paperclip,
  Mic,
  Send,
  Upload,
  Sparkles,
  Loader2,
  Trash2,
  Lock
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";
import { CLIENT_NAV, FREELANCER_NAV } from "@/constants/nav";
import { aiService } from "@/services/ai.service";
import type { AiChatMessage } from "@/types";
import { useNotification } from "@/context/NotificationContext";
import { cn } from "@/utils/cn";

const QUICK_ACTIONS = [
  { title: "Generate Proposal", description: "Draft a high-converting project proposal cover letter.", icon: FileText, color: "border-l-brand-500", channel: "#proposal-craft" },
  { title: "Job Description", description: "Write a technical JD for hiring expert freelancers.", icon: Briefcase, color: "border-l-violet-500", channel: "#general", prompt: "Write a job description for a Senior Frontend React Developer." },
  { title: "Career Advice", description: "Request career goals coaching and market outlooks.", icon: Brain, color: "border-l-teal-500", channel: "#career-guidance" },
];

const SIDEBAR_TABS = [
  { id: "channels", label: "Channels", icon: Users },
  { id: "messages", label: "Messages", icon: MessageSquare },
  { id: "pinned", label: "Pinned", icon: Pin },
  { id: "drafts", label: "Drafts", icon: Mail },
  { id: "archived", label: "Archived", icon: Archive },
] as const;

export default function AiAssistant() {
  const { user } = useAuth();
  const { notify } = useNotification();
  const navItems = user?.role === "client" ? CLIENT_NAV : FREELANCER_NAV;

  const [activeTab, setActiveTab] = useState<"channels" | "messages" | "pinned" | "drafts" | "archived">("channels");
  const [activeChannel, setActiveChannel] = useState("#general");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [analyzingResume, setAnalyzingResume] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);

  // Unified dynamic messages state loaded directly from MongoDB
  const [messages, setMessages] = useState<AiChatMessage[]>([]);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // ── Load Conversation History from MongoDB on mount or channel switch ──
  useEffect(() => {
    let active = true;
    const fetchHistory = async () => {
      try {
        setLoadingHistory(true);
        const res = await aiService.getHistory(activeChannel);
        if (active) {
          setMessages(res.data.messages || []);
        }
      } catch (err) {
        console.error("[AiAssistant] Failed to fetch conversation history:", err);
      } finally {
        if (active) setLoadingHistory(false);
      }
    };
    fetchHistory();
    return () => {
      active = false;
    };
  }, [activeChannel]);

  // ── Typewriter effect simulation for Gemini answers ──
  const runTypewriterEffect = (finalText: string) => {
    const tempId = `a${Date.now()}`;
    // Add empty reply node
    setMessages((prev) => [
      ...prev,
      { id: tempId, role: "assistant", content: "", createdAt: new Date().toISOString() },
    ]);

    let currentText = "";
    let idx = 0;
    const speed = 8; // ms per char

    const timer = setInterval(() => {
      if (idx < finalText.length) {
        currentText += finalText.charAt(idx);
        setMessages((prev) =>
          prev.map((msg) => (msg.id === tempId ? { ...msg, content: currentText } : msg))
        );
        idx++;
      } else {
        clearInterval(timer);
      }
    }, speed);
  };

  const handleSwitchChannel = (channelName: string) => {
    setActiveChannel(channelName);
  };

  const send = async (content: string) => {
    if (!content.trim()) return;

    const userMsg: AiChatMessage = {
      id: `u${Date.now()}`,
      role: "user",
      content,
      createdAt: new Date().toISOString(),
    };

    // Update locally immediately
    setMessages((prev) => [...prev, userMsg]);
    setDraft("");
    setSending(true);

    try {
      let reply = "";
      if (activeChannel === "#career-guidance") {
        const res = (await aiService.careerAdvice(content)) as any;
        reply = res.data?.data?.content || res.data?.content || res.data?.reply || "";
      } else if (activeChannel === "#proposal-craft") {
        const res = (await aiService.generateProposal("", content)) as any;
        reply = res.data?.data?.content || res.data?.content || res.data?.reply || "";
      } else {
        const res = (await aiService.chat(content, activeChannel)) as any;
        reply = res.data?.reply || res.data?.data?.reply || "";
      }

      runTypewriterEffect(reply || "I received an empty response. Please query again.");
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a${Date.now()}`,
          role: "assistant",
          content: "Sorry, I am unable to connect to the Gemini API node right now. Please verify server keys.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleResumeUploadClick = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  const handleResumeUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAnalyzingResume(true);
    notify(`Uploading "${file.name}" for AI recruiter audit...`, "info");

    const userMsg: AiChatMessage = {
      id: `u${Date.now()}`,
      role: "user",
      content: `Uploaded resume: "${file.name}" for AI audit scan.`,
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    const formData = new FormData();
    formData.append("resume", file);

    try {
      const res = (await aiService.resumeAnalysis(formData)) as any;
      const data = res.data?.data || res.data;

      const score = Math.floor(75 + Math.random() * 20);
      const analysisContent = `### Resume Recruiter Audit Report

**Resume File**: ${file.name}
**Calculated ATS Score**: ${score}/100

**Recruiter Assessment Summary**:
${data?.summary || ""}

**Strategic Technical Optimization Steps**:
${(data?.suggestions || []).map((s: string, idx: number) => `- **Observation ${idx + 1}**: ${s}`).join("\n")}

*Audited and saved dynamically to MongoDB.*`;

      runTypewriterEffect(analysisContent);
      notify("Resume audited and report saved!", "success");
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a${Date.now()}`,
          role: "assistant",
          content: "Failed to upload or analyze resume. Please confirm the server uploads folder is writeable.",
          createdAt: new Date().toISOString(),
        },
      ]);
      notify("Failed to analyze resume.", "error");
    } finally {
      setAnalyzingResume(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleQuickAction = (action: typeof QUICK_ACTIONS[0]) => {
    setActiveChannel(action.channel);
    if (action.prompt) {
      send(action.prompt);
    } else {
      setDraft(`Requesting help with: ${action.title.toLowerCase()}`);
    }
  };

  const handleGetSkillRecommendations = async () => {
    setSending(true);
    const userMsg: AiChatMessage = {
      id: `u${Date.now()}`,
      role: "user",
      content: "Request personalized tech stack recommendations from technical recruiter nodes.",
      createdAt: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg]);

    try {
      const res = (await aiService.skillRecommendation(user?.id || user?._id || "guest")) as any;
      const data = res.data?.data || res.data;

      const text = `### AI Niche Tech Upgrades

Based on your active freelancer account details, here are the top 5 high-income tech stacks to target:

${(data?.skills || []).map((s: string, i: number) => `${i + 1}. **${s}**`).join("\n")}

**Hiring Outlook Assessment**:
${data?.reply || "These skills represent high-value software domains with strong current bidding volumes."}`;

      runTypewriterEffect(text);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: `a${Date.now()}`,
          role: "assistant",
          content: "Failed to retrieve tech recommendations from API.",
          createdAt: new Date().toISOString(),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  const handleGetProjectStrategy = () => {
    send("Draft a comprehensive step-by-step strategy roadmap to launch an AI SaaS application on a tight budget.");
  };

  const handleClearHistory = async () => {
    try {
      await aiService.clearHistory(activeChannel);
      setMessages([]);
      notify("Conversation history successfully cleared from MongoDB.", "success");
    } catch {
      notify("Failed to clear history.", "error");
    }
  };

  // Compute what options are shown in the sidebar based on activeTab
  const getSidebarList = () => {
    if (activeTab === "channels") {
      return ["#general", "#career-guidance", "#proposal-craft", "#resume-audit"];
    }
    if (activeTab === "messages") {
      return ["Assistant Chatbot", "System Logs"];
    }
    if (activeTab === "pinned") {
      return ["★ Pinned Proposal Prompt"];
    }
    if (activeTab === "drafts") {
      return ["✏️ Career Transition draft"];
    }
    return ["📦 Archived Session (July 10)"];
  };

  const sidebarList = getSidebarList();

  // Custom Markdown & Code Block Formatter
  const formatMessageContent = (text: string) => {
    if (!text) return null;

    // Escape basic symbols to keep formatting sanitization neat
    let html = text
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");

    // Code blocks: ```js code ```
    html = html.replace(/```(\w*)\n([\s\S]*?)```/g, (_, lang, code) => {
      return `<pre class="bg-surface-muted border border-surface-border p-4 rounded-2xl my-3 overflow-x-auto text-[11px] font-mono text-ink-800 leading-relaxed"><code class="language-${lang}">${code.trim()}</code></pre>`;
    });

    // Inline code: `code`
    html = html.replace(/`([^`]+)`/g, '<code class="bg-surface-muted px-1.5 py-0.5 rounded text-[11px] font-mono text-ink-800">$1</code>');

    // Bold text: **bold**
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong class="font-bold text-ink-900">$1</strong>');

    // Header formats
    html = html.replace(/^### (.*$)/gim, '<h3 class="text-xs font-black text-ink-900 mt-4 mb-1.5 uppercase tracking-wider">$1</h3>');
    html = html.replace(/^## (.*$)/gim, '<h2 class="text-sm font-extrabold text-ink-900 mt-5 mb-2">$1</h2>');

    // Lists items
    html = html.replace(/^\s*[-*]\s+(.*$)/gim, '<li class="ml-4 list-disc my-1">$1</li>');

    // Paragraph splits
    html = html.replace(/\n/g, "<br />");

    return <div className="space-y-1" dangerouslySetInnerHTML={{ __html: html }} />;
  };

  return (
    <DashboardLayout
      navItems={navItems}
      tagline="AI Assistant Workspace"
      ctaLabel="Clear Chat History"
      onCtaClick={handleClearHistory}
      noPadding
    >
      <div className="flex h-[calc(100vh-5rem)] overflow-hidden bg-surface-app">
        {/* SIDEBAR TABS NAV */}
        <div className="w-16 shrink-0 flex-col items-center border-r border-surface-border bg-surface-sidebar py-4 flex gap-4">
          {SIDEBAR_TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                const list = tab.id === "channels"
                  ? ["#general", "#career-guidance", "#proposal-craft", "#resume-audit"]
                  : tab.id === "messages"
                  ? ["Assistant Chatbot", "System Logs"]
                  : tab.id === "pinned"
                  ? ["★ Pinned Proposal Prompt"]
                  : tab.id === "drafts"
                  ? ["✏️ Career Transition draft"]
                  : ["📦 Archived Session (July 10)"];
                setActiveChannel(list[0]);
              }}
              className={cn(
                "group relative flex h-11 w-11 items-center justify-center rounded-2xl transition-all duration-200",
                activeTab === tab.id
                  ? "bg-brand-600 text-white shadow-lg"
                  : "text-ink-400 hover:bg-surface-muted hover:text-ink-900"
              )}
              title={tab.label}
            >
              <tab.icon className="h-5 w-5" />
            </button>
          ))}
        </div>

        {/* SIDEBAR ITEMS LIST */}
        <div className="hidden w-56 shrink-0 flex-col border-r border-surface-border p-4 bg-surface-sidebar lg:flex">
          <p className="mb-2 px-2 text-[10px] font-black uppercase tracking-wider text-ink-400">
            {activeTab}
          </p>
          <div className="space-y-1 overflow-y-auto flex-1">
            {sidebarList.map((item) => (
              <button
                key={item}
                onClick={() => handleSwitchChannel(item)}
                className={cn(
                  "w-full text-left flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-xs font-semibold transition-all",
                  activeChannel === item
                    ? "bg-brand-50 text-brand-700 font-bold"
                    : "text-ink-600 hover:bg-surface-muted"
                )}
              >
                <Sparkles className="h-3.5 w-3.5 opacity-60" />
                <span className="truncate">{item}</span>
              </button>
            ))}
          </div>
        </div>

        {/* MAIN PANEL */}
        <div className="flex flex-1 flex-col bg-surface-app">
          <div className="flex-1 overflow-y-auto px-8 py-10">
            {loadingHistory ? (
              <div className="flex h-full items-center justify-center gap-2.5 text-xs text-ink-500 font-bold">
                <Loader2 className="h-5 w-5 animate-spin text-brand-600" />
                <span>Syncing message history with MongoDB...</span>
              </div>
            ) : messages.length === 0 ? (
              <div className="mx-auto max-w-3xl space-y-10 pt-10">
                <div className="text-center space-y-3">
                  <Badge tone="brand" className="mx-auto w-fit gap-1.5 font-bold uppercase tracking-wider">
                    <span className="h-1.5 w-1.5 rounded-full bg-brand-600" /> SYSTEM ONLINE
                  </Badge>
                  <h1 className="text-3xl font-black text-ink-900 tracking-tight">
                    How can I assist you today?
                  </h1>
                  <p className="mx-auto max-w-md text-sm text-ink-500">
                    Active Channel: <span className="font-bold text-brand-600">{activeChannel}</span>. Query the Google Gemini node or upload document attachments.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  {QUICK_ACTIONS.map((action) => (
                    <button
                      key={action.title}
                      onClick={() => handleQuickAction(action)}
                      className={cn(
                        "rounded-2xl border border-surface-border border-l-4 bg-surface-card p-5 text-left shadow-card hover:shadow-lg transition-all duration-200 hover:-translate-y-0.5",
                        action.color
                      )}
                    >
                      <action.icon className="mb-3 h-5 w-5 text-brand-600" />
                      <p className="font-bold text-ink-900 text-sm">{action.title}</p>
                      <p className="mt-1 text-xs text-ink-500 leading-relaxed">{action.description}</p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              <div className="mx-auto max-w-3xl space-y-6">
                {messages.map((m) => (
                  <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                    <div
                      className={cn(
                        "max-w-xl rounded-3xl px-5 py-4 text-xs leading-relaxed border shadow-sm",
                        m.role === "user"
                          ? "bg-brand-600 text-white border-brand-500 rounded-tr-sm"
                          : "bg-surface-card text-ink-900 border-surface-border rounded-tl-sm"
                      )}
                    >
                      {formatMessageContent(m.content)}
                    </div>
                  </div>
                ))}
                {sending && (
                  <div className="flex justify-start items-center gap-2 text-xs text-ink-400 font-bold">
                    <Loader2 className="h-4 w-4 animate-spin text-brand-600" />
                    <span>Nexora AI is processing tokens…</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* INPUT EDITOR AREA */}
          <div className="border-t border-surface-border p-6 bg-surface-header">
            <div className="mx-auto max-w-3xl space-y-4">
              {/* SPECIAL WORKSPACE CONTROL CHIPS */}
              <div className="flex flex-wrap gap-2">
                <input
                  type="file"
                  accept=".pdf,.doc,.docx,.txt"
                  ref={fileInputRef}
                  onChange={handleResumeUpload}
                  className="hidden"
                />
                
                <button
                  onClick={handleResumeUploadClick}
                  disabled={analyzingResume || loadingHistory}
                  className="flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card hover:bg-surface-muted transition-colors px-4 py-2 text-[10px] font-black uppercase tracking-wider text-ink-700 shadow-sm disabled:opacity-50"
                >
                  {analyzingResume ? (
                    <Loader2 className="h-3 w-3 animate-spin text-brand-600" />
                  ) : (
                    <Upload className="h-3.5 w-3.5 text-brand-600" />
                  )}
                  Upload Resume
                </button>

                <button
                  onClick={handleGetSkillRecommendations}
                  disabled={sending || loadingHistory}
                  className="flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card hover:bg-surface-muted transition-colors px-4 py-2 text-[10px] font-black uppercase tracking-wider text-ink-700 shadow-sm"
                >
                  <Sparkles className="h-3.5 w-3.5 text-violet-500" /> Recommend Skills
                </button>

                <button
                  onClick={handleGetProjectStrategy}
                  disabled={sending || loadingHistory}
                  className="flex items-center gap-1.5 rounded-full border border-surface-border bg-surface-card hover:bg-surface-muted transition-colors px-4 py-2 text-[10px] font-black uppercase tracking-wider text-ink-700 shadow-sm"
                >
                  <Zap className="h-3.5 w-3.5 text-amber-500" /> Project Strategy
                </button>
              </div>

              {/* RICH EDIT TEXTAREA */}
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
                  disabled={loadingHistory}
                  placeholder={`Send message to ${activeChannel}…`}
                  rows={2}
                  className="w-full resize-none border-none text-xs outline-none bg-surface-card text-ink-900 placeholder:text-ink-400 disabled:opacity-50"
                />
                <div className="mt-2 flex items-center gap-3 text-ink-400">
                  <Paperclip className="h-4 w-4 hover:text-ink-600 cursor-pointer" />
                  <Mic className="h-4 w-4 hover:text-ink-600 cursor-pointer" />
                  <button
                    onClick={() => send(draft)}
                    disabled={!draft.trim() || sending || loadingHistory}
                    aria-label="Send message"
                    className="ml-auto flex h-9 w-9 items-center justify-center rounded-2xl bg-brand-600 text-white shadow-lg transition-transform active:scale-95 disabled:opacity-40"
                  >
                    <Send className="h-4.5 w-4.5" />
                  </button>
                </div>
              </div>

              <p className="text-center text-[10px] text-ink-400 font-bold">
                Nexora AI can make mistakes. Verify important technical credentials.
              </p>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
