import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate, useParams } from "react-router-dom";
import {
  MessageSquare,
  Paperclip,
  Plus,
  FolderOpen,
  Loader2,
  Flag,
  Package,
  Clock,
  CheckCircle2,
  Calendar,
  Wallet,
  TrendingUp,
  Search,
  ChevronRight,
  ExternalLink,
  ArrowLeft,
  Briefcase,
  Play,
  Pause,
  Square,
  Users,
  Cpu,
  Zap,
  Download,
  AlertTriangle,
  History,
  Send,
  UploadCloud,
  Eye,
  RefreshCw,
  Trash2,
  Check,
  CheckCheck,
  FileText,
  Image as ImageIcon
} from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { useAuth } from "@/context/AuthContext";
import { CLIENT_NAV, FREELANCER_NAV } from "@/constants/nav";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { workspaceService } from "@/services/workspace.service";
import { apiClient } from "@/lib/axios";
import { formatCurrency } from "@/utils/formatters";
import { useNotification } from "@/context/NotificationContext";
import { ROUTES } from "@/constants/routes";
import { connectSocket } from "@/lib/socket";
import type {
  Contract,
  WorkspaceTask,
  WorkspaceMilestone,
  WorkspaceDeliverable,
  WorkspaceTimeLog,
  WorkspaceOverview,
  WorkspaceMessage,
  TaskColumnKey,
  ApiResponse
} from "@/types";
import { cn } from "@/utils/cn";

// Define Tab types. "Activity" is the internal value for the Project Timeline
// tab — NOT "Timeline", because the sidebar's "Milestones" shortcut link
// already overloads `?tab=Timeline` to mean the Milestones tab (see the
// "Handle sidebar navigation shortcut tabs" effect below); reusing that
// string here would make this tab unreachable.
type WorkspaceTab = "Overview" | "Tasks" | "Milestones" | "Deliverables" | "Time Tracking" | "Files" | "Messages" | "Activity" | "AI Assistant";

const TAB_LABELS: Record<WorkspaceTab, string> = {
  Overview: "Overview",
  Tasks: "Tasks",
  Milestones: "Milestones",
  Deliverables: "Deliverables",
  "Time Tracking": "Time Tracking",
  Files: "Files",
  Messages: "Messages",
  Activity: "Timeline",
  "AI Assistant": "AI Assistant",
};

const COLUMNS: { key: TaskColumnKey; label: string }[] = [
  { key: "todo", label: "To Do" },
  { key: "in_progress", label: "In Progress" },
  { key: "review", label: "Review" },
  { key: "completed", label: "Completed" },
];

export default function Workspace() {
  const { user } = useAuth();
  const navItems = user?.role === "client" ? CLIENT_NAV : FREELANCER_NAV;
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { notify } = useNotification();
  const [searchParams, setSearchParams] = useSearchParams();
  const { projectId: routeProjectId } = useParams<{ projectId?: string }>();

  // Selected project contract ID — prefer the /workspace/:projectId route param,
  // fall back to the legacy ?project= query string used by older deep links.
  const projectId = routeProjectId || searchParams.get("project") || "";

  // Tab parameters (if no project is open, we can toggle Active vs Completed)
  const tabParam = searchParams.get("tab") || "Active";
  const [tab, setTab] = useState<WorkspaceTab>("Overview");

  // Switches tabs while keeping the URL scheme consistent: path param for
  // project id (when present), query string for everything else.
  const updateTab = (t: WorkspaceTab) => {
    setTab(t);
    if (routeProjectId) {
      setSearchParams({ tab: t });
    } else {
      setSearchParams({ project: projectId, tab: t });
    }
  };

  // Project List states
  const [searchQuery, setSearchQuery] = useState("");
  const [filterType, setFilterType] = useState<"all" | "fixed" | "hourly">("all");
  const [filterPriority, setFilterPriority] = useState<"all" | "high" | "normal">("all");
  const [sortBy, setSortBy] = useState<"newest" | "deadline" | "progress" | "budget">("newest");

  // Board (Tasks) states
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [newTaskLabel, setNewTaskLabel] = useState("");
  const [newTaskAssignee, setNewTaskAssignee] = useState("");
  const [draggingTaskId, setDraggingTaskId] = useState<string | null>(null);

  // Milestones states
  const [submittingMilestoneId, setSubmittingMilestoneId] = useState<string | null>(null);
  const [submissionText, setSubmissionText] = useState("");
  const [submissionUrl, setSubmissionUrl] = useState("");
  const [reviewingMilestoneId, setReviewingMilestoneId] = useState<string | null>(null);
  const [reviewFeedback, setReviewFeedback] = useState("");
  const [showMilestoneModal, setShowMilestoneModal] = useState(false);
  const [editingMilestoneId, setEditingMilestoneId] = useState<string | null>(null);
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const [milestoneDescription, setMilestoneDescription] = useState("");
  const [milestoneBudget, setMilestoneBudget] = useState<number>(0);
  const [milestoneDueDate, setMilestoneDueDate] = useState("");

  const resetMilestoneForm = () => {
    setShowMilestoneModal(false);
    setEditingMilestoneId(null);
    setMilestoneTitle("");
    setMilestoneDescription("");
    setMilestoneBudget(0);
    setMilestoneDueDate("");
  };

  const openCreateMilestone = () => {
    resetMilestoneForm();
    setShowMilestoneModal(true);
  };

  const openEditMilestone = (m: WorkspaceMilestone) => {
    setEditingMilestoneId(m.id);
    setMilestoneTitle(m.title);
    setMilestoneDescription(m.description || "");
    setMilestoneBudget(m.budget);
    setMilestoneDueDate(m.dueDate ? new Date(m.dueDate).toISOString().slice(0, 10) : "");
    setShowMilestoneModal(true);
  };

  // Deliverables states
  const [showDeliverableModal, setShowDeliverableModal] = useState(false);
  const [delName, setDelName] = useState("");
  const [delMilestoneId, setDelMilestoneId] = useState("");
  const [delType, setDelType] = useState("zip");
  const [delSize, setDelSize] = useState("4.2 MB");
  const [delGitUrl, setDelGitUrl] = useState("");
  const [delLiveUrl, setDelLiveUrl] = useState("");

  // Time tracking timer state (persists client-side)
  const [timerSeconds, setTimerSeconds] = useState(0);
  const [timerRunning, setTimerRunning] = useState(false);
  const [workNotes, setWorkNotes] = useState("");
  const timerIntervalRef = useRef<any>(null);
  
  // Manual time entries states
  const [showManualTimeModal, setShowManualTimeModal] = useState(false);
  const [manualHours, setManualHours] = useState(2);
  const [manualNotes, setManualNotes] = useState("");

  // Chat message states — messages are held locally (not React Query) since
  // they're driven by a live socket stream, not a poll/refetch cycle.
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [liveMessages, setLiveMessages] = useState<WorkspaceMessage[]>([]);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [otherTyping, setOtherTyping] = useState(false);
  const [otherOnline, setOtherOnline] = useState(false);
  const [otherLastSeen, setOtherLastSeen] = useState<string | null>(null);
  const [sendingMessage, setSendingMessage] = useState(false);
  const typingTimeoutRef = useRef<any>(null);

  // Sync tab state with query parameter if present
  useEffect(() => {
    const tabQuery = searchParams.get("tab");
    if (tabQuery && ["Overview", "Tasks", "Milestones", "Deliverables", "Time Tracking", "Files", "Messages", "Activity", "AI Assistant"].includes(tabQuery)) {
      setTab(tabQuery as WorkspaceTab);
    }
  }, [searchParams]);

  // Handle sidebar navigation shortcut tabs
  useEffect(() => {
    const tabQuery = searchParams.get("tab");
    if (tabQuery === "Timeline") setTab("Milestones");
    else if (tabQuery === "Deliverables") setTab("Deliverables");
    else if (tabQuery === "TimeTracking") setTab("Time Tracking");
    else if (tabQuery === "Files") setTab("Files");
  }, [searchParams]);

  // ─── Queries ───────────────────────────────────────────────────────────────

  // 1. Fetch Projects (Contracts)
  const { data: contractsResponse, isLoading: loadingContracts } = useQuery({
    queryKey: ["contracts"],
    queryFn: async () => {
      const res = await apiClient.get<ApiResponse<Contract[]>>("/contracts");
      return res.data;
    },
  });

  const allProjects = contractsResponse?.data || [];

  // Active project selection
  const currentProject = allProjects.find((p: Contract) => p.id === projectId);

  // Chat is 1:1 per project (client + assigned freelancer only) — derive
  // "me" and "the other party" from whichever role the logged-in user has.
  const myId = user?.id || (user as any)?._id || "";
  const otherUser =
    currentProject && (currentProject.client as any)?.id === myId
      ? (currentProject.freelancer as any)
      : (currentProject?.client as any);
  const otherUserId = otherUser?.id || otherUser?._id || "";

  // 2. Fetch Tasks (Board)
  const { data: tasksResponse, isLoading: loadingTasks } = useQuery({
    queryKey: ["tasks", projectId],
    queryFn: async () => {
      const res = await workspaceService.getTasks(projectId);
      return res.data;
    },
    enabled: !!projectId && tab === "Tasks",
  });

  const tasks = tasksResponse?.data || [];

  // 3. Fetch Milestones
  const { data: milestonesResponse, isLoading: loadingMilestones } = useQuery({
    queryKey: ["milestones", projectId],
    queryFn: async () => {
      const res = await workspaceService.getMilestones(projectId);
      return res.data;
    },
    enabled: !!projectId && (tab === "Milestones" || tab === "Overview" || tab === "Deliverables" || tab === "AI Assistant"),
  });

  const milestones = milestonesResponse?.data || [];

  // 4. Fetch Deliverables
  const { data: deliverablesResponse, isLoading: loadingDeliverables } = useQuery({
    queryKey: ["deliverables", projectId],
    queryFn: async () => {
      const res = await workspaceService.getDeliverables(projectId);
      return res.data;
    },
    enabled: !!projectId && tab === "Deliverables",
  });

  const deliverables = deliverablesResponse?.data || [];

  // 5. Fetch Files
  const { data: filesResponse, isLoading: loadingFiles } = useQuery({
    queryKey: ["files", projectId],
    queryFn: async () => {
      const res = await workspaceService.getFiles(projectId);
      return res.data;
    },
    enabled: !!projectId && tab === "Files",
  });

  const files = filesResponse?.data || [];

  // 6. Fetch Time Logs
  const { data: timeLogsResponse, isLoading: loadingTimeLogs } = useQuery({
    queryKey: ["time-logs", projectId],
    queryFn: async () => {
      const res = await workspaceService.getTimeLogs(projectId);
      return res.data;
    },
    enabled: !!projectId && tab === "Time Tracking",
  });

  const timeLogs = timeLogsResponse?.data || [];

  // 7. Fetch Active Timer from Backend
  const { data: activeTimerResponse } = useQuery({
    queryKey: ["active-timer", projectId],
    queryFn: async () => {
      const res = await workspaceService.getActiveTimeLog(projectId);
      return res.data;
    },
    enabled: !!projectId && tab === "Time Tracking",
  });

  // 8. Real-time chat: connect Socket.io, join this project's room, load
  // history over REST, and keep `liveMessages` updated from live events.
  // (The old code here called `/messages?recipient=` and `POST /messages`,
  // neither of which is a real endpoint — this replaces that dead code.)
  useEffect(() => {
    if (!projectId || tab !== "Messages") return;

    let cancelled = false;
    const socket = connectSocket();

    setLoadingMessages(true);
    workspaceService
      .getMessages(projectId)
      .then((res) => {
        if (!cancelled) setLiveMessages(res.data.data);
      })
      .catch(() => {
        if (!cancelled) notify("Failed to load messages.", "error");
      })
      .finally(() => {
        if (!cancelled) setLoadingMessages(false);
      });

    socket.emit("join_workspace", { contractId: projectId }, (ack: { success: boolean; message?: string }) => {
      if (!cancelled && ack && !ack.success) {
        notify(ack.message || "Unable to join chat for this workspace.", "error");
      }
    });

    // Existing unread messages from the other party become read the moment
    // this tab is open.
    socket.emit("mark_read", { contractId: projectId });

    const onReceive = (msg: WorkspaceMessage) => {
      if (msg.contractId !== projectId) return;
      setLiveMessages((prev) => [...prev, msg]);
      if (msg.senderId && msg.senderId !== myId) {
        socket.emit("mark_read", { contractId: projectId });
      }
    };
    const onTyping = (payload: { contractId: string; userId: string }) => {
      if (payload.contractId === projectId && payload.userId !== myId) setOtherTyping(true);
    };
    const onStopTyping = (payload: { contractId: string; userId: string }) => {
      if (payload.contractId === projectId && payload.userId !== myId) setOtherTyping(false);
    };
    const onPresence = (payload: { userId: string; online: boolean; lastSeen: string | null }) => {
      if (payload.userId === otherUserId) {
        setOtherOnline(payload.online);
        setOtherLastSeen(payload.lastSeen);
      }
    };
    const onReadReceipt = (payload: { contractId: string; readBy: string }) => {
      if (payload.contractId !== projectId || payload.readBy === myId) return;
      setLiveMessages((prev) =>
        prev.map((m) => (m.senderId === myId ? { ...m, read: true } : m))
      );
    };

    socket.on("receive_message", onReceive);
    socket.on("user_typing", onTyping);
    socket.on("user_stop_typing", onStopTyping);
    socket.on("presence_update", onPresence);
    socket.on("read_receipt", onReadReceipt);

    return () => {
      cancelled = true;
      socket.off("receive_message", onReceive);
      socket.off("user_typing", onTyping);
      socket.off("user_stop_typing", onStopTyping);
      socket.off("presence_update", onPresence);
      socket.off("read_receipt", onReadReceipt);
      setOtherTyping(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [projectId, tab]);

  // Search scoped to this project's message history (hits the backend so it
  // covers messages beyond what's currently loaded in `liveMessages`).
  const { data: searchResponse, isFetching: searchingMessages } = useQuery({
    queryKey: ["message-search", projectId, messageSearch],
    queryFn: async () => {
      const res = await workspaceService.getMessages(projectId, messageSearch);
      return res.data;
    },
    enabled: !!projectId && tab === "Messages" && messageSearch.trim().length > 0,
  });

  const displayedMessages = messageSearch.trim() ? searchResponse?.data || [] : liveMessages;

  // 9. Fetch Workspace Overview (progress, due date, activity, summaries)
  const { data: overviewResponse, isLoading: loadingOverview, error: overviewError } = useQuery({
    queryKey: ["workspace-overview", projectId],
    queryFn: async () => {
      const res = await workspaceService.getOverview(projectId);
      return res.data;
    },
    enabled: !!projectId && tab === "Overview",
    retry: false,
  });

  const overview = overviewResponse?.data as WorkspaceOverview | undefined;

  // 10. Fetch full Project Timeline (complete activity history, latest first)
  const { data: timelineResponse, isLoading: loadingTimeline } = useQuery({
    queryKey: ["workspace-timeline", projectId],
    queryFn: async () => {
      const res = await workspaceService.getActivity(projectId, 200);
      return res.data;
    },
    enabled: !!projectId && tab === "Activity",
  });

  const timelineActivity = timelineResponse?.data || [];

  // Only the client and assigned freelancer may open this workspace — if the
  // backend rejects us (wrong user, or a stale/invalid project id), bounce
  // back to the workspace list instead of showing a broken page.
  useEffect(() => {
    const status = (overviewError as any)?.response?.status;
    if (status === 403) {
      notify("You don't have access to this workspace.", "error");
      navigate(ROUTES.WORKSPACE, { replace: true });
    } else if (status === 404) {
      notify("Project not found.", "error");
      navigate(ROUTES.WORKSPACE, { replace: true });
    }
  }, [overviewError, navigate, notify]);

  // ─── Active Timer Rehydration & Intervals ──────────────────────────────────
  useEffect(() => {
    if (activeTimerResponse?.data) {
      const elapsed = Math.round((Date.now() - new Date(activeTimerResponse.data.startTime).getTime()) / 1000);
      setTimerSeconds(elapsed > 0 ? elapsed : 0);
      setTimerRunning(true);
    } else {
      setTimerRunning(false);
      setTimerSeconds(0);
    }
  }, [activeTimerResponse]);

  useEffect(() => {
    if (timerRunning) {
      timerIntervalRef.current = setInterval(() => {
        setTimerSeconds((prev) => prev + 1);
      }, 1000);
    } else {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    }
    return () => {
      if (timerIntervalRef.current) clearInterval(timerIntervalRef.current);
    };
  }, [timerRunning]);

  // Scroll to bottom of chat
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayedMessages, tab]);

  // ─── Mutations ─────────────────────────────────────────────────────────────

  // Move Task Board
  const moveTaskMutation = useMutation({
    mutationFn: async ({ taskId, column }: { taskId: string; column: string }) => {
      await workspaceService.moveTask(projectId, taskId, column);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      notify("Task status updated!", "success");
    },
  });

  // Create Task Board
  const createTaskMutation = useMutation({
    mutationFn: async () => {
      if (!newTaskTitle.trim()) return;
      await workspaceService.createTask(projectId, {
        title: newTaskTitle,
        label: newTaskLabel || "Feature",
        labelColor: newTaskLabel === "Bug" ? "#ef4444" : "#4f46e5",
        assignee: (newTaskAssignee || undefined) as any,
      });
    },
    onSuccess: () => {
      setNewTaskTitle("");
      setNewTaskLabel("");
      setNewTaskAssignee("");
      setShowTaskModal(false);
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      notify("New task added to board", "success");
    },
  });

  // Reassign an existing task to a different project member (or unassign)
  const reassignTaskMutation = useMutation({
    mutationFn: async ({ taskId, assignee }: { taskId: string; assignee: string | null }) => {
      await workspaceService.updateTask(projectId, taskId, { assignee });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      notify("Task assignment updated.", "success");
    },
  });

  // Create Milestone
  const createMilestoneMutation = useMutation({
    mutationFn: async () => {
      await workspaceService.createMilestone(projectId, {
        title: milestoneTitle,
        description: milestoneDescription,
        budget: milestoneBudget,
        dueDate: milestoneDueDate,
      });
    },
    onSuccess: () => {
      resetMilestoneForm();
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
      notify("Milestone created.", "success");
    },
  });

  // Edit an existing milestone's details
  const updateMilestoneMutation = useMutation({
    mutationFn: async () => {
      if (!editingMilestoneId) return;
      await workspaceService.updateMilestone(editingMilestoneId, {
        title: milestoneTitle,
        description: milestoneDescription,
        budget: milestoneBudget,
        dueDate: milestoneDueDate,
      });
    },
    onSuccess: () => {
      resetMilestoneForm();
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
      notify("Milestone updated.", "success");
    },
  });

  // Quick status set: Pending / In Progress / Completed
  const setMilestoneStatusMutation = useMutation({
    mutationFn: async ({ milestoneId, status }: { milestoneId: string; status: "pending" | "in_progress" | "completed" }) => {
      await workspaceService.updateMilestone(milestoneId, { status });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
      notify("Milestone status updated.", "success");
    },
  });

  const deleteMilestoneMutation = useMutation({
    mutationFn: async (milestoneId: string) => {
      await workspaceService.deleteMilestone(milestoneId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
      notify("Milestone deleted.", "success");
    },
  });

  // Submit Milestone Work
  const submitMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, text, url }: { milestoneId: string; text: string; url?: string }) => {
      await workspaceService.submitMilestone(milestoneId, text, url);
    },
    onSuccess: () => {
      setSubmissionText("");
      setSubmissionUrl("");
      setSubmittingMilestoneId(null);
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
      queryClient.invalidateQueries({ queryKey: ["deliverables", projectId] });
      notify("Milestone deliverables submitted for client review!", "success");
    },
  });

  // Review Milestone Work (Simulation Toggle)
  const reviewMilestoneMutation = useMutation({
    mutationFn: async ({ milestoneId, status, feedback }: { milestoneId: string; status: "approved" | "rejected"; feedback?: string }) => {
      await workspaceService.reviewMilestone(milestoneId, status, feedback);
    },
    onSuccess: (_, variables) => {
      setReviewFeedback("");
      setReviewingMilestoneId(null);
      queryClient.invalidateQueries({ queryKey: ["milestones", projectId] });
      queryClient.invalidateQueries({ queryKey: ["deliverables", projectId] });
      queryClient.invalidateQueries({ queryKey: ["contracts"] });
      notify(`Milestone submission successfully ${variables.status}!`, "success");
    },
  });

  // Create Deliverable manually
  const createDeliverableMutation = useMutation({
    mutationFn: async () => {
      await workspaceService.createDeliverable(projectId, {
        milestone: delMilestoneId,
        name: delName,
        fileType: delType,
        fileSize: delSize,
        gitRepoUrl: delGitUrl,
        liveSiteUrl: delLiveUrl,
      });
    },
    onSuccess: () => {
      setDelName("");
      setDelGitUrl("");
      setDelLiveUrl("");
      setShowDeliverableModal(false);
      queryClient.invalidateQueries({ queryKey: ["deliverables", projectId] });
      notify("Deliverable version uploaded successfully", "success");
    },
  });

  // Timer Start
  const startTimerMutation = useMutation({
    mutationFn: async () => {
      await workspaceService.startTimeLog(projectId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["active-timer", projectId] });
      notify("Timer started, recording sessions.", "success");
    },
  });

  // Timer Stop
  const stopTimerMutation = useMutation({
    mutationFn: async () => {
      await workspaceService.stopTimeLog(projectId, workNotes);
    },
    onSuccess: () => {
      setWorkNotes("");
      queryClient.invalidateQueries({ queryKey: ["active-timer", projectId] });
      queryClient.invalidateQueries({ queryKey: ["time-logs", projectId] });
      notify("Session stopped and billable hours saved.", "success");
    },
  });

  // Manual log time
  const manualTimeMutation = useMutation({
    mutationFn: async () => {
      const startTime = new Date(Date.now() - manualHours * 3600 * 1000).toISOString();
      const endTime = new Date().toISOString();
      await workspaceService.createManualTimeLog(projectId, {
        startTime,
        endTime,
        notes: manualNotes,
      });
    },
    onSuccess: () => {
      setManualNotes("");
      setShowManualTimeModal(false);
      queryClient.invalidateQueries({ queryKey: ["time-logs", projectId] });
      notify("Manual hours logged in backend sheet.", "success");
    },
  });

  // Send chat message — over the socket when connected (real-time delivery
  // to the other party), falling back to the REST endpoint (which also
  // broadcasts server-side) if the socket isn't up yet.
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    const content = newMessage.trim();
    if (!content || sendingMessage) return;

    setSendingMessage(true);
    const socket = connectSocket();
    if (socket.connected) {
      socket.emit(
        "send_message",
        { contractId: projectId, content },
        (ack: { success: boolean; message?: string }) => {
          setSendingMessage(false);
          if (!ack?.success) {
            notify(ack?.message || "Failed to send message.", "error");
          }
        }
      );
    } else {
      try {
        const res = await workspaceService.sendMessage(projectId, content);
        setLiveMessages((prev) => [...prev, res.data.data]);
      } catch {
        notify("Failed to send message.", "error");
      } finally {
        setSendingMessage(false);
      }
    }
    setNewMessage("");
    clearTimeout(typingTimeoutRef.current);
    socket.emit("stop_typing", { contractId: projectId });
  };

  // Typing indicator — emit "typing" on keystroke, auto "stop_typing" after
  // a short pause so a dropped connection can't leave it stuck on.
  const handleMessageInputChange = (value: string) => {
    setNewMessage(value);
    const socket = connectSocket();
    socket.emit("typing", { contractId: projectId });
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", { contractId: projectId });
    }, 2000);
  };

  // File Upload
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const fileObj = e.target.files[0];
    const fd = new FormData();
    fd.append("file", fileObj);
    try {
      await workspaceService.uploadFile(projectId, fd);
      queryClient.invalidateQueries({ queryKey: ["files", projectId] });
      notify(`File ${fileObj.name} uploaded successfully!`, "success");
    } catch (err: any) {
      notify(err?.response?.data?.message || "File upload failed, check file type/size.", "error");
    }
  };

  // File Delete (permission-checked server-side: uploader or admin only)
  const deleteFileMutation = useMutation({
    mutationFn: async (fileId: string) => {
      await workspaceService.deleteFile(projectId, fileId);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["files", projectId] });
      notify("File deleted.", "success");
    },
    onError: (err: any) => {
      notify(err?.response?.data?.message || "Failed to delete file.", "error");
    },
  });

  // Helper formatting for timer
  const formatTime = (seconds: number) => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  // ─── Filter & Search Roster ────────────────────────────────────────────────
  const filteredProjects = allProjects
    .filter((p: Contract) => {
      // Toggle active vs completed based on parameter
      const isActiveTab = tabParam === "Active";
      const matchStatus = isActiveTab ? p.status !== "completed" : p.status === "completed";
      
      const matchSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.client?.fullName.toLowerCase().includes(searchQuery.toLowerCase());

      const matchType =
        filterType === "all"
          ? true
          : filterType === "fixed"
          ? p.budget > 10000 // Simple logic: fixed projects have larger budgets in INR seeder
          : p.budget <= 10000;

      const matchPriority =
        filterPriority === "all" ? true : filterPriority === "high" ? p.budget >= 100000 : p.budget < 100000;

      return matchStatus && matchSearch && matchType && matchPriority;
    })
    .sort((a: Contract, b: Contract) => {
      if (sortBy === "newest") return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      if (sortBy === "deadline") return a.title.localeCompare(b.title); // fallback alphabetical
      if (sortBy === "progress") return b.budget - a.budget;
      if (sortBy === "budget") return b.budget - a.budget;
      return 0;
    });

  // Calculate project metrics
  const totalEarnedCompleted = allProjects
    .filter((p: Contract) => p.status === "completed")
    .reduce((sum: number, p: Contract) => sum + p.budget, 0);

  const activeMilestone = milestones.find((m: WorkspaceMilestone) => m.status === "in_progress") || milestones[0];

  return (
    <DashboardLayout navItems={navItems} tagline="Workbase" searchPlaceholder="Search projects or milestones...">
      
      {/* ───────────────────────────────────────────────────────────────────────
          CASE 1: PROJECT DETAIL VIEW (?project=id)
          ─────────────────────────────────────────────────────────────────────── */}
      {projectId && currentProject ? (
        <div className="space-y-6">
          
          {/* Header & Back Button */}
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                icon={<ArrowLeft className="h-4 w-4" />}
                onClick={() => navigate(`${ROUTES.WORKSPACE}?tab=${tabParam}`)}
              >
                Back to Workspace
              </Button>
              <div className="h-6 w-px bg-surface-border" />
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-brand-600">
                  {currentProject.status.toUpperCase()} PROJECT
                </p>
                <h1 className="text-xl font-extrabold text-ink-900">{currentProject.title}</h1>
              </div>
            </div>

            {/* Simulated Review/Client Actions Panel */}
            <div className="flex items-center gap-2 rounded-2xl border border-warning/30 bg-warning/5 px-4 py-2 text-xs text-warning-strong">
              <Zap className="h-4 w-4 text-warning" />
              <span>Simulation Console: Logged in as Freelancer (Owner)</span>
            </div>
          </div>

          {/* Navigation Tabs bar */}
          <div className="flex gap-2 border-b border-surface-border overflow-x-auto pb-px">
            {(["Overview", "Tasks", "Milestones", "Deliverables", "Time Tracking", "Files", "Messages", "Activity", "AI Assistant"] as WorkspaceTab[]).map((t) => (
              <button
                key={t}
                onClick={() => updateTab(t)}
                className={cn(
                  "border-b-2 px-4 py-3 text-sm font-semibold transition-colors whitespace-nowrap",
                  tab === t
                    ? "border-brand-600 text-brand-600 font-bold"
                    : "border-transparent text-ink-500 hover:text-ink-900"
                )}
              >
                {TAB_LABELS[t]}
              </button>
            ))}
          </div>

          {/* ── TAB 1: OVERVIEW ── */}
          {tab === "Overview" && (
            <div className="grid gap-6 lg:grid-cols-3">

              {/* Left Column: Details */}
              <div className="lg:col-span-2 space-y-6">
                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-4">
                  <h2 className="text-lg font-bold text-ink-900">Project Overview</h2>
                  <p className="text-sm text-ink-600 leading-relaxed">
                    Welcome to the workspace for the <strong>{currentProject.title}</strong>. This repository maps visual wireframes, columns layout, deliverable archives, time logged, and messaging pipelines between you and the client team. Use milestones to request payouts and trigger automatic Escrow verification.
                  </p>

                  <div className="grid grid-cols-2 gap-4 pt-4 border-t border-surface-border">
                    <div>
                      <p className="text-xs text-ink-400 font-medium">ESTIMATED BUDGET</p>
                      <p className="text-xl font-extrabold text-brand-600">{formatCurrency(currentProject.budget)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-ink-400 font-medium">ESCROW DEPOSIT</p>
                      <Badge tone={currentProject.escrowStatus === "released" ? "success" : "info"}>
                        {currentProject.escrowStatus.toUpperCase()}
                      </Badge>
                    </div>
                  </div>

                  {/* Progress bar — share of milestones approved/completed */}
                  <div className="pt-4 border-t border-surface-border space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-ink-700">Overall Progress</span>
                      <span className="font-bold text-brand-600">{loadingOverview ? "…" : `${overview?.progress ?? 0}%`}</span>
                    </div>
                    <div className="h-2.5 w-full rounded-full bg-surface-muted overflow-hidden">
                      <div
                        className="h-full rounded-full bg-brand-600 transition-all"
                        style={{ width: `${overview?.progress ?? 0}%` }}
                      />
                    </div>
                  </div>
                </div>

                {/* Milestones summary */}
                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
                  <h3 className="font-bold text-ink-900 mb-4">Milestones Summary</h3>
                  <div className="grid grid-cols-4 gap-3 text-center">
                    <div className="rounded-2xl bg-surface-muted p-3">
                      <p className="text-lg font-extrabold text-ink-900">{overview?.milestonesSummary.total ?? 0}</p>
                      <p className="text-[10px] text-ink-500 font-semibold uppercase mt-1">Total</p>
                    </div>
                    <div className="rounded-2xl bg-surface-muted p-3">
                      <p className="text-lg font-extrabold text-emerald-500">{overview?.milestonesSummary.completed ?? 0}</p>
                      <p className="text-[10px] text-ink-500 font-semibold uppercase mt-1">Approved</p>
                    </div>
                    <div className="rounded-2xl bg-surface-muted p-3">
                      <p className="text-lg font-extrabold text-brand-600">{overview?.milestonesSummary.inProgress ?? 0}</p>
                      <p className="text-[10px] text-ink-500 font-semibold uppercase mt-1">In Progress</p>
                    </div>
                    <div className="rounded-2xl bg-surface-muted p-3">
                      <p className="text-lg font-extrabold text-warning">{overview?.milestonesSummary.submitted ?? 0}</p>
                      <p className="text-[10px] text-ink-500 font-semibold uppercase mt-1">Submitted</p>
                    </div>
                  </div>
                </div>

                {/* Shared Files & Deliverables summary */}
                <div className="grid grid-cols-2 gap-6">
                  <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-ink-900 text-sm">Shared Files</h3>
                      <Paperclip className="h-4 w-4 text-ink-400" />
                    </div>
                    <p className="text-2xl font-extrabold text-ink-900">{overview?.filesCount ?? 0}</p>
                    <Button variant="outline" size="sm" fullWidth onClick={() => updateTab("Files")}>View Files</Button>
                  </div>
                  <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="font-bold text-ink-900 text-sm">Deliverables</h3>
                      <Package className="h-4 w-4 text-ink-400" />
                    </div>
                    <p className="text-2xl font-extrabold text-ink-900">{overview?.deliverablesCount ?? 0}</p>
                    <Button variant="outline" size="sm" fullWidth onClick={() => updateTab("Deliverables")}>View Deliverables</Button>
                  </div>
                </div>

                {/* Recent Activity */}
                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-4">
                  <h3 className="font-bold text-ink-900 flex items-center gap-2"><History className="h-4 w-4 text-ink-400" /> Recent Activity</h3>
                  {loadingOverview ? (
                    <div className="flex h-16 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-brand-600" /></div>
                  ) : !overview?.recentActivity?.length ? (
                    <p className="text-sm text-ink-500">No activity recorded for this workspace yet.</p>
                  ) : (
                    <div className="space-y-3">
                      {overview.recentActivity.map((a) => (
                        <div key={a.id} className="flex items-start justify-between gap-3 border-b border-surface-border last:border-0 pb-3 last:pb-0">
                          <div className="flex items-start gap-2">
                            <span className="mt-1 h-1.5 w-1.5 rounded-full bg-brand-600 shrink-0" />
                            <div>
                              <p className="text-xs text-ink-700">{a.message}</p>
                              <p className="text-[10px] text-ink-400 mt-0.5">{a.actor?.fullName || "System"}</p>
                            </div>
                          </div>
                          <span className="text-[10px] text-ink-400 whitespace-nowrap">{new Date(a.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Project Milestone Roadmap */}
                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-4">
                  <h2 className="text-lg font-bold text-ink-900">Active Milestone Roadmap</h2>
                  {loadingMilestones ? (
                    <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-brand-600" /></div>
                  ) : milestones.length === 0 ? (
                    <p className="text-sm text-ink-500">No milestones registered. Payouts processed at delivery.</p>
                  ) : (
                    <div className="relative border-l border-surface-border pl-6 ml-3 space-y-6">
                      {milestones.map((m) => (
                        <div key={m.id} className="relative">
                          <span className={cn(
                            "absolute -left-[31px] top-1.5 flex h-4 w-4 rounded-full border-2 bg-surface-card",
                            m.status === "approved" ? "border-emerald-500 bg-emerald-50" : m.status === "in_progress" ? "border-brand-600 bg-brand-50" : "border-ink-200"
                          )} />
                          <div className="flex justify-between items-start">
                            <div>
                              <h4 className="text-sm font-bold text-ink-900">{m.title}</h4>
                              <p className="text-xs text-ink-500 mt-1">Due: {new Date(m.dueDate).toLocaleDateString()} • {formatCurrency(m.budget)}</p>
                            </div>
                            <Badge tone={m.status === "approved" ? "success" : m.status === "in_progress" ? "brand" : "neutral"}>
                              {m.status.toUpperCase()}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right Column: Client, Freelancer & Status Card */}
              <div className="space-y-6">
                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-5">
                  <h3 className="font-bold text-ink-900">Assigned Client</h3>
                  <div className="flex items-center gap-3">
                    <Avatar src={currentProject.client?.avatar || currentProject.client?.avatarUrl} name={currentProject.client?.fullName || "Client"} size="md" />
                    <div>
                      <p className="font-bold text-ink-900">{currentProject.client?.fullName || "Client"}</p>
                      <p className="text-xs text-ink-400">{currentProject.client?.email}</p>
                    </div>
                  </div>
                  <Button variant="outline" size="sm" fullWidth onClick={() => updateTab("Messages")}>
                    <MessageSquare className="h-4 w-4 mr-2" /> Message Client
                  </Button>
                </div>

                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-5">
                  <h3 className="font-bold text-ink-900">Assigned Freelancer</h3>
                  <div className="flex items-center gap-3">
                    <Avatar src={currentProject.freelancer?.avatar || currentProject.freelancer?.avatarUrl} name={currentProject.freelancer?.fullName || "Freelancer"} size="md" />
                    <div>
                      <p className="font-bold text-ink-900">{currentProject.freelancer?.fullName || "Freelancer"}</p>
                      <p className="text-xs text-ink-400">{currentProject.freelancer?.email}</p>
                    </div>
                  </div>
                </div>

                {/* Timeline status info */}
                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-4">
                  <h3 className="font-bold text-ink-900">Project Parameters</h3>
                  <div className="space-y-3 text-xs text-ink-600">
                    <div className="flex justify-between">
                      <span>Start Date</span>
                      <span className="font-semibold">{new Date(currentProject.createdAt).toLocaleDateString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Due Date</span>
                      <span className="font-semibold">
                        {overview?.dueDate ? new Date(overview.dueDate).toLocaleDateString() : "Not set"}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span>Project Status</span>
                      <Badge tone={currentProject.status === "completed" ? "success" : "brand"}>{currentProject.status.toUpperCase()}</Badge>
                    </div>
                    <div className="flex justify-between">
                      <span>Priority</span>
                      <Badge tone={currentProject.budget >= 100000 ? "danger" : "info"}>
                        {currentProject.budget >= 100000 ? "HIGH" : "NORMAL"}
                      </Badge>
                    </div>
                  </div>
                </div>

                {/* Quick Actions */}
                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-3">
                  <h3 className="font-bold text-ink-900">Quick Actions</h3>
                  <Button variant="outline" size="sm" fullWidth onClick={() => updateTab("Milestones")}>
                    <Flag className="h-4 w-4 mr-2" /> Review Milestones
                  </Button>
                  <Button variant="outline" size="sm" fullWidth onClick={() => updateTab("Files")}>
                    <UploadCloud className="h-4 w-4 mr-2" /> Upload File
                  </Button>
                  <Button variant="outline" size="sm" fullWidth onClick={() => updateTab("Deliverables")}>
                    <Package className="h-4 w-4 mr-2" /> Upload Deliverable
                  </Button>
                  <Button variant="outline" size="sm" fullWidth onClick={() => updateTab("Time Tracking")}>
                    <Clock className="h-4 w-4 mr-2" /> Log Time
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── TAB 2: TASKS (BOARD) ── */}
          {tab === "Tasks" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-ink-900">Sprint Kanban Board</h2>
                  <p className="text-xs text-ink-500">Drag or assign tasks across swimlanes to track features.</p>
                </div>
                <Button size="sm" onClick={() => setShowTaskModal(true)}>
                  <Plus className="h-4 w-4 mr-1.5" /> Create Task
                </Button>
              </div>

              {loadingTasks ? (
                <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
              ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                  {COLUMNS.map((col) => {
                    const colTasks = tasks.filter((t) => t.column === col.key);
                    return (
                      <div
                        key={col.key}
                        onDragOver={(e) => e.preventDefault()}
                        onDrop={(e) => {
                          e.preventDefault();
                          if (draggingTaskId) {
                            moveTaskMutation.mutate({ taskId: draggingTaskId, column: col.key });
                            setDraggingTaskId(null);
                          }
                        }}
                        className="rounded-3xl border border-surface-border bg-surface-muted/50 p-4 space-y-4 min-h-[350px]"
                      >
                        <div className="flex items-center justify-between">
                          <h3 className="text-sm font-bold text-ink-900">{col.label}</h3>
                          <Badge tone="neutral">{colTasks.length}</Badge>
                        </div>

                        <div className="space-y-3">
                          {colTasks.length === 0 ? (
                            <p className="text-xs text-ink-400 text-center py-8 border border-dashed border-surface-border rounded-2xl">
                              No tasks in this lane
                            </p>
                          ) : (
                            colTasks.map((task) => (
                              <div
                                key={task.id}
                                draggable
                                onDragStart={() => setDraggingTaskId(task.id)}
                                onDragEnd={() => setDraggingTaskId(null)}
                                className={cn(
                                  "rounded-2xl border border-surface-border bg-surface-card p-4 shadow-sm hover:shadow-card transition-shadow space-y-3 cursor-grab active:cursor-grabbing",
                                  draggingTaskId === task.id && "opacity-40"
                                )}
                              >
                                <h4 className="text-xs font-bold text-ink-900 leading-snug">{task.title}</h4>
                                <div className="flex justify-between items-center gap-2">
                                  <span style={{ backgroundColor: task.labelColor + "15", color: task.labelColor }} className="rounded-lg px-2.5 py-0.5 text-[10px] font-bold">
                                    {task.label.toUpperCase()}
                                  </span>
                                  <select
                                    value={col.key}
                                    onChange={(e) => moveTaskMutation.mutate({ taskId: task.id, column: e.target.value })}
                                    className="rounded-lg border border-surface-border bg-surface-card px-1.5 py-0.5 text-[10px] text-ink-500 outline-none"
                                    title="Move to column"
                                  >
                                    {COLUMNS.map((c) => (
                                      <option key={c.key} value={c.key}>{c.label}</option>
                                    ))}
                                  </select>
                                </div>

                                {/* Assignee — client and freelancer are the only two project members */}
                                <div className="flex items-center justify-between gap-2 pt-2 border-t border-surface-border">
                                  <div className="flex items-center gap-1.5">
                                    {task.assignee ? (
                                      <>
                                        <Avatar src={task.assignee.avatar} name={task.assignee.fullName || "User"} size="sm" />
                                        <span className="text-[10px] text-ink-500 truncate max-w-[80px]">{task.assignee.fullName}</span>
                                      </>
                                    ) : (
                                      <span className="text-[10px] text-ink-400 italic">Unassigned</span>
                                    )}
                                  </div>
                                  <select
                                    value={task.assignee?.id || ""}
                                    onChange={(e) => reassignTaskMutation.mutate({ taskId: task.id, assignee: e.target.value || null })}
                                    className="rounded-lg border border-surface-border bg-surface-card px-1.5 py-0.5 text-[10px] text-ink-500 outline-none max-w-[90px]"
                                    title="Assign to"
                                  >
                                    <option value="">Unassigned</option>
                                    {currentProject?.client && (
                                      <option value={(currentProject.client as any).id}>{(currentProject.client as any).fullName}</option>
                                    )}
                                    {currentProject?.freelancer && (
                                      <option value={(currentProject.freelancer as any).id}>{(currentProject.freelancer as any).fullName}</option>
                                    )}
                                  </select>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Task Creation Modal */}
              {showTaskModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
                    <h3 className="text-lg font-bold text-ink-900 mb-4">Add Task to Board</h3>
                    <form onSubmit={(e) => { e.preventDefault(); createTaskMutation.mutate(); }} className="space-y-4">
                      <Input
                        label="Task Title"
                        placeholder="Define API endpoint..."
                        value={newTaskTitle}
                        onChange={(e) => setNewTaskTitle(e.target.value)}
                        required
                      />
                      <Input
                        label="Label (e.g. Backend, Frontend)"
                        placeholder="Backend"
                        value={newTaskLabel}
                        onChange={(e) => setNewTaskLabel(e.target.value)}
                      />
                      <div>
                        <label className="block text-xs font-bold uppercase text-ink-700 mb-1.5">Assign To</label>
                        <select
                          value={newTaskAssignee}
                          onChange={(e) => setNewTaskAssignee(e.target.value)}
                          className="w-full h-11 rounded-xl border border-surface-border px-3 text-xs outline-none bg-surface-card text-ink-900"
                        >
                          <option value="">Unassigned</option>
                          {currentProject?.client && (
                            <option value={(currentProject.client as any).id}>{(currentProject.client as any).fullName} (Client)</option>
                          )}
                          {currentProject?.freelancer && (
                            <option value={(currentProject.freelancer as any).id}>{(currentProject.freelancer as any).fullName} (Freelancer)</option>
                          )}
                        </select>
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setShowTaskModal(false)}>Cancel</Button>
                        <Button type="submit" isLoading={createTaskMutation.isPending}>Create Task</Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 3: MILESTONES ── */}
          {tab === "Milestones" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-ink-900">Project Milestones & Disbursements</h2>
                  <p className="text-xs text-ink-500">Submit deliverables for active milestones to claim Escrow payments.</p>
                </div>
                <Button size="sm" onClick={openCreateMilestone}>
                  <Plus className="h-4 w-4 mr-1.5" /> Create Milestone
                </Button>
              </div>

              {loadingMilestones ? (
                <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
              ) : milestones.length === 0 ? (
                <div className="rounded-3xl border border-surface-border bg-surface-card p-8 text-center text-ink-500">
                  No milestones defined for this contract.
                </div>
              ) : (
                <div className="grid gap-4">
                  {milestones.map((m) => (
                    <div key={m.id} className="rounded-3xl border border-surface-border bg-surface-card p-5 shadow-card space-y-4">
                      <div className="flex flex-wrap items-start justify-between gap-3">
                        <div>
                          <h3 className="font-bold text-ink-900">{m.title}</h3>
                          <p className="text-xs text-ink-500 mt-1">Due: {new Date(m.dueDate).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-3">
                          <p className="font-extrabold text-brand-600">{formatCurrency(m.budget)}</p>
                          <Badge tone={
                            m.status === "approved" || m.status === "completed" ? "success" :
                            m.status === "submitted" ? "warning" :
                            m.status === "in_progress" ? "brand" : "neutral"
                          }>
                            {m.status.toUpperCase()}
                          </Badge>
                        </div>
                      </div>

                      {m.description && <p className="text-xs text-ink-600">{m.description}</p>}

                      {m.clientFeedback && (
                        <div className="rounded-xl bg-surface-muted p-3 border-l-4 border-brand-500 text-xs text-ink-600">
                          <strong>Client Feedback:</strong> {m.clientFeedback}
                        </div>
                      )}

                      {/* Quick status set: Pending / In Progress / Completed — only
                          shown before a milestone enters the formal submit/review
                          pipeline, since these 3 options can't represent
                          submitted/approved/rejected without misrepresenting them. */}
                      <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-surface-border">
                        {["pending", "in_progress", "completed"].includes(m.status) ? (
                          <>
                            <label className="text-[10px] font-bold uppercase text-ink-400">Status</label>
                            <select
                              value={m.status}
                              onChange={(e) =>
                                setMilestoneStatusMutation.mutate({ milestoneId: m.id, status: e.target.value as "pending" | "in_progress" | "completed" })
                              }
                              className="rounded-lg border border-surface-border bg-surface-card px-2 py-1 text-xs outline-none text-ink-900"
                            >
                              <option value="pending">Pending</option>
                              <option value="in_progress">In Progress</option>
                              <option value="completed">Completed</option>
                            </select>
                          </>
                        ) : (
                          <span className="text-[10px] text-ink-400 italic">In review pipeline — use Submit/Review actions below.</span>
                        )}

                        <div className="ml-auto flex gap-2">
                          <Button size="sm" variant="outline" onClick={() => openEditMilestone(m)}>Edit</Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-danger hover:bg-danger/5"
                            onClick={() => {
                              if (confirm(`Delete milestone "${m.title}"? This cannot be undone.`)) {
                                deleteMilestoneMutation.mutate(m.id);
                              }
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>

                      {/* Action buttons depending on state */}
                      <div className="flex gap-2 justify-end">
                        {m.status === "in_progress" && (
                          <Button size="sm" onClick={() => setSubmittingMilestoneId(m.id)}>
                            Submit Deliverables
                          </Button>
                        )}
                        {m.status === "submitted" && (
                          <div className="flex gap-2">
                            <Button size="sm" variant="outline" onClick={() => setSubmittingMilestoneId(m.id)}>
                              Edit Submission
                            </Button>
                            {/* Only the client approves/requests revision */}
                            {user?.role === "client" && (
                              <Button size="sm" className="bg-emerald-600 hover:bg-emerald-700" onClick={() => setReviewingMilestoneId(m.id)}>
                                Review Submission
                              </Button>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Create / Edit Milestone Modal */}
              {showMilestoneModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-lg rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
                    <h3 className="text-lg font-bold text-ink-900 mb-4">{editingMilestoneId ? "Edit Milestone" : "Create Milestone"}</h3>
                    <form
                      onSubmit={(e) => {
                        e.preventDefault();
                        if (editingMilestoneId) updateMilestoneMutation.mutate();
                        else createMilestoneMutation.mutate();
                      }}
                      className="space-y-4"
                    >
                      <Input
                        label="Milestone Title"
                        placeholder="Design system handoff"
                        value={milestoneTitle}
                        onChange={(e) => setMilestoneTitle(e.target.value)}
                        required
                      />
                      <div>
                        <label className="block text-xs font-bold uppercase text-ink-700 mb-1.5">Description</label>
                        <textarea
                          placeholder="What does this milestone cover?"
                          value={milestoneDescription}
                          onChange={(e) => setMilestoneDescription(e.target.value)}
                          className="w-full h-24 rounded-xl border border-surface-border p-3 text-xs outline-none bg-surface-card"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          label="Budget"
                          type="number"
                          min={0}
                          value={milestoneBudget}
                          onChange={(e) => setMilestoneBudget(Number(e.target.value))}
                          required
                        />
                        <Input
                          label="Due Date"
                          type="date"
                          value={milestoneDueDate}
                          onChange={(e) => setMilestoneDueDate(e.target.value)}
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={resetMilestoneForm}>Cancel</Button>
                        <Button type="submit" isLoading={createMilestoneMutation.isPending || updateMilestoneMutation.isPending}>
                          {editingMilestoneId ? "Save Changes" : "Create Milestone"}
                        </Button>
                      </div>
                    </form>
                  </div>
                </div>
              )}

              {/* Milestone Submit Modal */}
              {submittingMilestoneId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-lg rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
                    <h3 className="text-lg font-bold text-ink-900 mb-2">Submit Milestone Deliverables</h3>
                    <p className="text-xs text-ink-500 mb-4">Provide delivery text/work logs and any repository link for client verification.</p>
                    <div className="space-y-4">
                      <div>
                        <label className="block text-xs font-bold uppercase text-ink-700 mb-1.5">Work Details / Summary</label>
                        <textarea
                          placeholder="List features built and details..."
                          value={submissionText}
                          onChange={(e) => setSubmissionText(e.target.value)}
                          className="w-full h-28 rounded-xl border border-surface-border p-3 text-xs outline-none bg-surface-card"
                        />
                      </div>
                      <Input
                        label="Submission Link / Git Repo URL"
                        placeholder="https://github.com/..."
                        value={submissionUrl}
                        onChange={(e) => setSubmissionUrl(e.target.value)}
                      />
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setSubmittingMilestoneId(null)}>Cancel</Button>
                        <Button
                          isLoading={submitMilestoneMutation.isPending}
                          onClick={() => submitMilestoneMutation.mutate({ milestoneId: submittingMilestoneId, text: submissionText, url: submissionUrl })}
                        >
                          Submit Work
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Client Review Simulation Modal */}
              {reviewingMilestoneId && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-4">
                    <h3 className="text-lg font-bold text-ink-900">Disbursement Approval Console</h3>
                    <p className="text-xs text-ink-500">As the client, review code/document deliverable artifacts to release Escrow payment.</p>
                    <textarea
                      placeholder="Comment e.g. Great work, thanks!"
                      value={reviewFeedback}
                      onChange={(e) => setReviewFeedback(e.target.value)}
                      className="w-full h-20 rounded-xl border border-surface-border p-3 text-xs outline-none bg-surface-card"
                    />
                    <div className="flex justify-end gap-2 pt-2">
                      <Button variant="ghost" onClick={() => setReviewingMilestoneId(null)}>Cancel</Button>
                      <Button
                        variant="outline"
                        className="text-danger hover:bg-danger/5"
                        isLoading={reviewMilestoneMutation.isPending}
                        onClick={() => reviewMilestoneMutation.mutate({ milestoneId: reviewingMilestoneId, status: "rejected", feedback: reviewFeedback })}
                      >
                        Reject & Request Edit
                      </Button>
                      <Button
                        className="bg-emerald-600 hover:bg-emerald-700"
                        isLoading={reviewMilestoneMutation.isPending}
                        onClick={() => reviewMilestoneMutation.mutate({ milestoneId: reviewingMilestoneId, status: "approved", feedback: reviewFeedback })}
                      >
                        Approve & Release Funds
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 4: DELIVERABLES ── */}
          {tab === "Deliverables" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-ink-900">Submitted Deliverables Versioning</h2>
                  <p className="text-xs text-ink-500">Index of source archives, documents, and repo links shared.</p>
                </div>
                <Button size="sm" onClick={() => setShowDeliverableModal(true)}>
                  <UploadCloud className="h-4 w-4 mr-1.5" /> Upload Version
                </Button>
              </div>

              {loadingDeliverables ? (
                <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
              ) : deliverables.length === 0 ? (
                <div className="rounded-3xl border border-surface-border bg-surface-card p-8 text-center text-ink-500">
                  No deliverables submitted for this workspace yet.
                </div>
              ) : (
                <div className="rounded-3xl border border-surface-border bg-surface-card overflow-hidden">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className="border-b border-surface-border bg-surface-muted text-ink-500 font-semibold uppercase tracking-wider">
                        <th className="p-4">Name</th>
                        <th className="p-4">Milestone</th>
                        <th className="p-4">Format</th>
                        <th className="p-4">Status</th>
                        <th className="p-4">Review Comments</th>
                        <th className="p-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-surface-border">
                      {deliverables.map((d) => (
                        <tr key={d.id} className="hover:bg-surface-muted/50">
                          <td className="p-4 font-bold text-ink-900">{d.name}</td>
                          <td className="p-4 text-ink-500">{(d.milestone as any)?.title || "General Submission"}</td>
                          <td className="p-4"><Badge tone="neutral">{d.fileType.toUpperCase()}</Badge></td>
                          <td className="p-4">
                            <Badge tone={d.status === "approved" ? "success" : d.status === "rejected" ? "danger" : "warning"}>
                              {d.status.toUpperCase()}
                            </Badge>
                          </td>
                          <td className="p-4 text-ink-600 truncate max-w-xs">{d.feedback || "Awaiting Client review"}</td>
                          <td className="p-4 text-right">
                            {d.liveSiteUrl && (
                              <a href={d.liveSiteUrl} target="_blank" rel="noreferrer" className="text-brand-600 hover:underline font-semibold flex items-center justify-end gap-1">
                                View <ExternalLink className="h-3 w-3" />
                              </a>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {/* Upload Deliverable Modal */}
              {showDeliverableModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-4">
                    <h3 className="text-lg font-bold text-ink-900">Upload Deliverable Version</h3>
                    <div className="space-y-3">
                      <Input label="Deliverable Name" placeholder="Dashboard CSS Source Code" value={delName} onChange={(e) => setDelName(e.target.value)} required />
                      
                      <div>
                        <label className="block text-xs font-bold uppercase text-ink-700 mb-1.5">Target Milestone</label>
                        <select
                          value={delMilestoneId}
                          onChange={(e) => setDelMilestoneId(e.target.value)}
                          className="w-full h-11 rounded-xl border border-surface-border px-3 text-xs outline-none bg-surface-card text-ink-900"
                        >
                          <option value="">Select Milestone...</option>
                          {milestones.map((m) => <option key={m.id} value={m.id}>{m.title}</option>)}
                        </select>
                      </div>

                      <Input label="GitHub Link / Deployment URL" placeholder="https://github.com/..." value={delLiveUrl} onChange={(e) => setDelLiveUrl(e.target.value)} />
                      
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setShowDeliverableModal(false)}>Cancel</Button>
                        <Button isLoading={createDeliverableMutation.isPending} onClick={() => createDeliverableMutation.mutate()}>Save Log</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 5: TIME TRACKING ── */}
          {tab === "Time Tracking" && (
            <div className="space-y-6">
              
              {/* Timer metrics & control console */}
              <div className="grid gap-6 md:grid-cols-3">
                <div className="md:col-span-2 rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card flex flex-col md:flex-row items-center justify-between gap-6">
                  <div className="space-y-2 text-center md:text-left">
                    <p className="text-xs text-ink-400 font-bold uppercase tracking-wider">ACTIVE BILLABLE SESSION</p>
                    <p className="text-4xl font-black text-ink-900 font-mono tracking-tight">{formatTime(timerSeconds)}</p>
                    {timerRunning && <p className="text-xs text-emerald-500 font-medium animate-pulse">Recording active logs...</p>}
                  </div>

                  <div className="flex items-center gap-3">
                    {!timerRunning ? (
                      <Button
                        icon={<Play className="h-4 w-4 mr-1.5" />}
                        className="bg-brand-600 hover:bg-brand-700 text-white"
                        isLoading={startTimerMutation.isPending}
                        onClick={() => startTimerMutation.mutate()}
                      >
                        Start Tracker
                      </Button>
                    ) : (
                      <div className="flex gap-2">
                        <Button
                          icon={<Pause className="h-4 w-4 mr-1.5" />}
                          variant="outline"
                          onClick={() => setTimerRunning(false)}
                        >
                          Pause
                        </Button>
                        <Button
                          icon={<Square className="h-4 w-4 mr-1.5" />}
                          className="bg-danger hover:bg-danger-strong text-white"
                          isLoading={stopTimerMutation.isPending}
                          onClick={() => stopTimerMutation.mutate()}
                        >
                          Stop & Log
                        </Button>
                      </div>
                    )}
                  </div>
                </div>

                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card flex items-center justify-between">
                  <div className="space-y-1">
                    <p className="text-xs text-ink-400 font-semibold">TOTAL WORK LOGGED</p>
                    <p className="text-2xl font-extrabold text-brand-600">
                      {Math.round(timeLogs.reduce((sum, l) => sum + l.duration, 0) / 3600)} Hrs
                    </p>
                    <p className="text-[10px] text-ink-400">Calculated from seeder sheets</p>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowManualTimeModal(true)}>
                    Log Manual
                  </Button>
                </div>
              </div>

              {/* Time logs history table */}
              <div className="rounded-3xl border border-surface-border bg-surface-card p-5 shadow-card space-y-4">
                <h3 className="font-bold text-ink-900 text-sm">Session Sheet Records</h3>
                
                {loadingTimeLogs ? (
                  <div className="flex h-20 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-brand-600" /></div>
                ) : timeLogs.length === 0 ? (
                  <p className="text-xs text-ink-500 text-center py-6">No hours logged for this workspace.</p>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-surface-border text-ink-500 font-semibold uppercase">
                          <th className="pb-3">Date</th>
                          <th className="pb-3">Start</th>
                          <th className="pb-3">End</th>
                          <th className="pb-3">Duration</th>
                          <th className="pb-3">Work Summary</th>
                          <th className="pb-3 text-right">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-surface-border">
                        {timeLogs.map((log) => (
                          <tr key={log.id} className="hover:bg-surface-muted/30">
                            <td className="py-3 font-medium">{new Date(log.startTime).toLocaleDateString()}</td>
                            <td className="py-3 text-ink-500">{new Date(log.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                            <td className="py-3 text-ink-500">{log.endTime ? new Date(log.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "Running..."}</td>
                            <td className="py-3 font-semibold text-brand-600">{Math.round(log.duration / 60)} mins</td>
                            <td className="py-3 text-ink-600 italic">{log.notes || "No notes registered"}</td>
                            <td className="py-3 text-right"><Badge tone="success">{log.status.toUpperCase()}</Badge></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Manual Time Logging Modal */}
              {showManualTimeModal && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
                  <div className="w-full max-w-md rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-4">
                    <h3 className="text-lg font-bold text-ink-900">Log Manual Hours</h3>
                    <div className="space-y-3">
                      <Input
                        label="Duration (Hours)"
                        type="number"
                        min={1}
                        max={12}
                        value={manualHours}
                        onChange={(e) => setManualHours(Number(e.target.value))}
                      />
                      <div>
                        <label className="block text-xs font-bold uppercase text-ink-700 mb-1.5">Notes / Work Done</label>
                        <textarea
                          placeholder="Refactoring visual styles..."
                          value={manualNotes}
                          onChange={(e) => setManualNotes(e.target.value)}
                          className="w-full h-20 rounded-xl border border-surface-border p-3 text-xs outline-none bg-surface-card"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2 pt-2">
                        <Button variant="ghost" onClick={() => setShowManualTimeModal(false)}>Cancel</Button>
                        <Button isLoading={manualTimeMutation.isPending} onClick={() => manualTimeMutation.mutate()}>Log Hours</Button>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 6: FILES ── */}
          {tab === "Files" && (
            <div className="space-y-6">
              <div className="flex justify-between items-center">
                <div>
                  <h2 className="text-lg font-bold text-ink-900">Project Drive & Attachments</h2>
                  <p className="text-xs text-ink-500">Shared visual designs, layout agreements, and PDF documentation.</p>
                </div>
                <label className="flex items-center gap-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white px-4 py-2 text-xs font-bold cursor-pointer transition-colors shadow-sm">
                  <UploadCloud className="h-4 w-4" /> Upload File
                  <input type="file" className="hidden" onChange={handleFileUpload} />
                </label>
              </div>

              {loadingFiles ? (
                <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
              ) : files.length === 0 ? (
                <div className="rounded-3xl border border-surface-border bg-surface-card p-8 text-center text-ink-500">
                  No files added to this project repository yet.
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 md:grid-cols-3">
                  {files.map((file) => {
                    const isImage = file.mimetype?.startsWith("image/");
                    const canDelete =
                      user?.role === "admin" ||
                      (typeof file.uploadedBy === "object" && (file.uploadedBy as any)?.id === myId);
                    return (
                      <div key={file.id} className="rounded-3xl border border-surface-border bg-surface-card p-4 shadow-sm hover:shadow-card transition-all flex flex-col justify-between min-h-[128px]">
                        <div className="flex items-start gap-3">
                          {isImage && file.thumbnailUrl ? (
                            <img src={file.thumbnailUrl} alt={file.name} className="h-10 w-10 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="rounded-lg bg-brand-50 p-2 text-brand-600 shrink-0">
                              {isImage ? <ImageIcon className="h-5 w-5" /> : <FileText className="h-5 w-5" />}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-xs text-ink-900 truncate leading-snug">{file.name}</p>
                            <p className="text-[10px] text-ink-400 mt-0.5">{file.size}</p>
                            {typeof file.uploadedBy === "object" && file.uploadedBy?.fullName && (
                              <p className="text-[10px] text-ink-400 mt-0.5">by {file.uploadedBy.fullName}</p>
                            )}
                          </div>
                        </div>

                        <div className="flex justify-end gap-1.5 pt-2 border-t border-surface-border">
                          <a href={file.url} target="_blank" rel="noreferrer" className="rounded-lg p-1.5 bg-surface-muted hover:bg-surface-border text-ink-500 hover:text-ink-900 transition-colors" title="Preview">
                            <Eye className="h-4 w-4" />
                          </a>
                          <a href={file.url} download className="rounded-lg p-1.5 bg-surface-muted hover:bg-surface-border text-ink-500 hover:text-ink-900 transition-colors" title="Download">
                            <Download className="h-4 w-4" />
                          </a>
                          {canDelete && (
                            <button
                              onClick={() => deleteFileMutation.mutate(file.id)}
                              disabled={deleteFileMutation.isPending}
                              className="rounded-lg p-1.5 bg-surface-muted hover:bg-danger/10 text-ink-500 hover:text-danger transition-colors"
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* ── TAB 7: MESSAGES ── */}
          {tab === "Messages" && (
            <div className="rounded-3xl border border-surface-border bg-surface-card shadow-card flex flex-col h-[600px]">

              {/* Header: presence + search */}
              <div className="flex items-center justify-between gap-3 p-4 border-b border-surface-border">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <Avatar src={otherUser?.avatar} name={otherUser?.fullName || "User"} size="sm" />
                    <span
                      className={cn(
                        "absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full border-2 border-surface-card",
                        otherOnline ? "bg-emerald-500" : "bg-ink-300"
                      )}
                    />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-ink-900">{otherUser?.fullName || "User"}</p>
                    <p className="text-[10px] text-ink-400">
                      {otherOnline
                        ? "Online"
                        : otherLastSeen
                        ? `Last seen ${new Date(otherLastSeen).toLocaleString([], { dateStyle: "short", timeStyle: "short" })}`
                        : "Offline"}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-surface-border bg-surface-muted px-3 py-1.5 w-56">
                  <Search className="h-3.5 w-3.5 text-ink-400 shrink-0" />
                  <input
                    placeholder="Search messages..."
                    value={messageSearch}
                    onChange={(e) => setMessageSearch(e.target.value)}
                    className="w-full text-xs outline-none bg-transparent text-ink-900 placeholder:text-ink-400"
                  />
                </div>
              </div>

              {/* Message log area */}
              <div className="flex-1 p-6 overflow-y-auto space-y-4">
                {loadingMessages || searchingMessages ? (
                  <div className="flex h-20 items-center justify-center"><Loader2 className="h-6 w-6 animate-spin text-brand-600" /></div>
                ) : displayedMessages.length === 0 ? (
                  <p className="text-xs text-ink-400 text-center py-20">
                    {messageSearch.trim() ? "No messages match your search." : "No messages exchanged yet. Say hello!"}
                  </p>
                ) : (
                  displayedMessages.map((msg) => {
                    const senderId = msg.senderId || (typeof msg.sender === "object" ? msg.sender?.id : undefined);
                    const senderName = msg.senderName || (typeof msg.sender === "object" ? msg.sender?.fullName : undefined);
                    const senderAvatar = msg.senderAvatar || (typeof msg.sender === "object" ? msg.sender?.avatar : undefined);
                    const isSelf = senderId === myId;
                    return (
                      <div key={msg.id} className={cn("flex gap-3 max-w-[80%]", isSelf ? "ml-auto flex-row-reverse" : "")}>
                        <Avatar
                          src={isSelf ? user?.avatar || user?.avatarUrl : senderAvatar}
                          name={isSelf ? (user?.fullName || "User") : (senderName || "User")}
                          size="sm"
                        />
                        <div className={cn("rounded-2xl p-3 text-xs leading-relaxed", isSelf ? "bg-brand-600 text-white rounded-tr-none" : "bg-surface-muted text-ink-800 rounded-tl-none")}>
                          <p>{msg.content}</p>
                          <span className={cn("flex items-center gap-1 justify-end mt-1", isSelf ? "text-white/70" : "text-ink-400")}>
                            <span className="text-[9px]">
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            {isSelf && (msg.read ? <CheckCheck className="h-3 w-3" /> : <Check className="h-3 w-3" />)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
                {otherTyping && !messageSearch.trim() && (
                  <div className="flex items-center gap-2 text-xs text-ink-400 italic">
                    <Avatar src={otherUser?.avatar} name={otherUser?.fullName || "User"} size="sm" />
                    {otherUser?.fullName || "They"} are typing...
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Chat Input */}
              <form onSubmit={handleSendMessage} className="p-4 border-t border-surface-border bg-surface-muted/50 flex gap-2">
                <input
                  placeholder="Type your message here..."
                  value={newMessage}
                  onChange={(e) => handleMessageInputChange(e.target.value)}
                  className="flex-1 h-11 rounded-xl border border-surface-border px-4 text-xs outline-none bg-surface-card text-ink-900"
                  required
                />
                <Button type="submit" isLoading={sendingMessage} icon={<Send className="h-4 w-4" />} />
              </form>
            </div>
          )}

          {/* ── TAB: PROJECT TIMELINE (internal value "Activity") ── */}
          {tab === "Activity" && (
            <div className="space-y-6">
              <div>
                <h2 className="text-lg font-bold text-ink-900">Project Timeline</h2>
                <p className="text-xs text-ink-500">
                  Complete activity history — project creation, proposal acceptance, milestone and task
                  updates, file uploads, chat activity, and completion — sorted by latest.
                </p>
              </div>

              {loadingTimeline ? (
                <div className="flex h-32 items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-brand-600" /></div>
              ) : timelineActivity.length === 0 ? (
                <div className="rounded-3xl border border-surface-border bg-surface-card p-8 text-center text-ink-500">
                  No activity recorded for this project yet.
                </div>
              ) : (
                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card">
                  <div className="relative border-l border-surface-border pl-6 ml-3 space-y-6">
                    {timelineActivity.map((a) => (
                      <div key={a.id} className="relative">
                        <span className="absolute -left-[31px] top-1 flex h-4 w-4 items-center justify-center rounded-full border-2 border-brand-500 bg-surface-card" />
                        <p className="text-sm text-ink-800">{a.message}</p>
                        <p className="text-[11px] text-ink-400 mt-0.5">
                          {a.actor?.fullName || "System"} • {new Date(a.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ── TAB 8: AI ASSISTANT ── */}
          {tab === "AI Assistant" && (
            <div className="space-y-6">
              
              {/* Promo Title banner */}
              <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-brand-600 to-brand-indigo p-6 text-white shadow-card">
                <Cpu className="absolute -right-3 -bottom-3 h-24 w-24 text-white/10" />
                <h3 className="text-lg font-bold flex items-center gap-2">
                  <Zap className="h-5 w-5 fill-white text-white" /> Nexora AI Smart Workspace Agent
                </h3>
                <p className="text-xs text-white/80 mt-1.5 max-w-xl">
                  Using real project metrics, visual board speed, milestone due logs, and chat inputs to predict delivery blockages and estimate sprint targets automatically.
                </p>
              </div>

              {/* AI Cards metrics */}
              <div className="grid gap-6 md:grid-cols-2">
                
                {/* Prediction Risk Card */}
                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-4">
                  <h4 className="font-bold text-sm text-ink-900 flex items-center gap-1.5">
                    <AlertTriangle className="h-4 w-4 text-warning" /> Deadline Risk Analysis
                  </h4>
                  
                  {activeMilestone ? (
                    <div className="space-y-3">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-ink-500">Upcoming Milestone:</span>
                        <span className="font-bold text-ink-800">{activeMilestone.title}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-ink-500">Scheduled Due:</span>
                        <span className="font-semibold text-brand-600">{new Date(activeMilestone.dueDate).toLocaleDateString()}</span>
                      </div>
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-ink-500">Smart Forecast:</span>
                        <span className="font-extrabold text-emerald-500 uppercase">Low Risk (On Track)</span>
                      </div>
                      
                      <div className="rounded-xl bg-emerald-500/5 p-3 text-xs text-emerald-600 border border-emerald-500/20">
                        Milestone progress is estimated at {activeMilestone.progress}%. Velocity indicates mockups and board tasks are matching standard sprint timelines.
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-ink-500">No active milestones found to calculate risks.</p>
                  )}
                </div>

                {/* Progress predictions */}
                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-4">
                  <h4 className="font-bold text-sm text-ink-900 flex items-center gap-1.5">
                    <TrendingUp className="h-4 w-4 text-brand-600" /> Completion Estimation
                  </h4>
                  <div className="space-y-3 text-xs">
                    <div className="flex justify-between">
                      <span className="text-ink-500">Projected Delivery Date:</span>
                      <span className="font-bold text-ink-800">
                        {new Date(Date.now() + 22 * 24 * 3600 * 1000).toLocaleDateString()}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-ink-500">Confidence Score:</span>
                      <span className="font-bold text-brand-600">92%</span>
                    </div>
                    
                    <div className="rounded-xl bg-surface-muted p-3 text-xs text-ink-600 border border-surface-border">
                      AI agent suggests refactoring task lists: based on your seeder hours log, backend architecture schema models are completed ahead of schedule. Recommend starting frontend integrations.
                    </div>
                  </div>
                </div>

                {/* Task suggestions */}
                <div className="rounded-3xl border border-surface-border bg-surface-card p-6 shadow-card space-y-3 md:col-span-2">
                  <h4 className="font-bold text-sm text-ink-900">AI Suggested Tasks (Add to Board)</h4>
                  <ul className="space-y-2 text-xs text-ink-700">
                    <li className="flex justify-between items-center p-2.5 bg-surface-muted rounded-xl border border-surface-border">
                      <span>Mock Stripe payment integration controller tests</span>
                      <Button size="sm" variant="outline" onClick={() => { setNewTaskTitle("Stripe payment integration controller tests"); setNewTaskLabel("Backend"); createTaskMutation.mutate(); }}>Add Task</Button>
                    </li>
                    <li className="flex justify-between items-center p-2.5 bg-surface-muted rounded-xl border border-surface-border">
                      <span>Refactor responsive sidebar layouts for client dashboards</span>
                      <Button size="sm" variant="outline" onClick={() => { setNewTaskTitle("Refactor responsive sidebar layouts"); setNewTaskLabel("Frontend"); createTaskMutation.mutate(); }}>Add Task</Button>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          )}

        </div>
      ) : (
        
        /* ───────────────────────────────────────────────────────────────────────
            CASE 2: PROJECTS DIRECTORY / LIST VIEW
            ─────────────────────────────────────────────────────────────────────── */
        <div className="grid gap-6 lg:grid-cols-4">
          
          {/* Left Column Sidebar: Filters */}
          <div className="lg:col-span-1 space-y-5">
            <div className="rounded-3xl border border-surface-border bg-surface-card p-5 shadow-card space-y-4">
              <h3 className="font-bold text-sm text-ink-900 uppercase tracking-wider">Project Folder Filters</h3>
              
              {/* Selection Tabs Active vs Completed */}
              <div className="flex rounded-xl bg-surface-muted p-1 w-full text-xs font-semibold">
                <button
                  onClick={() => setSearchParams({ tab: "Active" })}
                  className={cn("flex-1 py-2 rounded-lg transition-colors", tabParam === "Active" ? "bg-surface-card text-brand-600 shadow-sm" : "text-ink-500")}
                >
                  Active
                </button>
                <button
                  onClick={() => setSearchParams({ tab: "Completed" })}
                  className={cn("flex-1 py-2 rounded-lg transition-colors", tabParam === "Completed" ? "bg-surface-card text-brand-600 shadow-sm" : "text-ink-500")}
                >
                  Completed
                </button>
              </div>

              {/* Price Type */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-ink-600">Contract Type</label>
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-surface-border px-3 text-xs outline-none bg-surface-card text-ink-900"
                >
                  <option value="all">All Types</option>
                  <option value="fixed">Fixed Price</option>
                  <option value="hourly">Hourly Contract</option>
                </select>
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-ink-600">Project Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-surface-border px-3 text-xs outline-none bg-surface-card text-ink-900"
                >
                  <option value="all">All Priorities</option>
                  <option value="high">High (₹1,00,000+)</option>
                  <option value="normal">Normal Priority</option>
                </select>
              </div>

              {/* Sorting */}
              <div className="space-y-2">
                <label className="block text-xs font-semibold text-ink-600">Sort By</label>
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as any)}
                  className="w-full h-10 rounded-xl border border-surface-border px-3 text-xs outline-none bg-surface-card text-ink-900"
                >
                  <option value="newest">Recently Initiated</option>
                  <option value="deadline">Project Title</option>
                  <option value="progress">Max Budget</option>
                  <option value="budget">Value</option>
                </select>
              </div>
            </div>

            {/* Platform statistics summary */}
            <div className="rounded-3xl border border-surface-border bg-surface-card p-5 shadow-card space-y-3">
              <h4 className="font-bold text-xs text-ink-900 uppercase">Workbase Summary</h4>
              <div className="flex justify-between text-xs text-ink-600">
                <span>Active Projects</span>
                <span className="font-bold text-brand-600">
                  {allProjects.filter((p: Contract) => p.status !== "completed").length}
                </span>
              </div>
              <div className="flex justify-between text-xs text-ink-600">
                <span>Completed Projects</span>
                <span className="font-bold text-emerald-500">
                  {allProjects.filter((p: Contract) => p.status === "completed").length}
                </span>
              </div>
              <div className="flex justify-between text-xs text-ink-600 border-t border-surface-border pt-2">
                <span>Total Earnings Released</span>
                <span className="font-bold text-ink-900">{formatCurrency(totalEarnedCompleted)}</span>
              </div>
            </div>
          </div>

          {/* Right Column: Search Bar + Roster Cards */}
          <div className="lg:col-span-3 space-y-5">
            <div className="flex items-center gap-3 bg-surface-card rounded-2xl border border-surface-border px-4 py-2.5 shadow-sm">
              <Search className="h-5 w-5 text-ink-400 shrink-0" />
              <input
                placeholder="Search workspaces by contract title or client name..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full text-xs outline-none bg-surface-card text-ink-900 placeholder:text-ink-400"
              />
            </div>

            {loadingContracts ? (
              <div className="flex h-64 items-center justify-center">
                <Loader2 className="h-10 w-10 animate-spin text-brand-600" />
              </div>
            ) : filteredProjects.length === 0 ? (
              <div className="rounded-3xl border border-surface-border bg-surface-card p-12 text-center text-ink-500 shadow-card">
                <FolderOpen className="h-12 w-12 text-ink-300 mx-auto mb-3" />
                <h4 className="font-bold text-ink-900 mb-1">No Projects Found</h4>
                <p className="text-xs">Try adjustments to search queries or filter categories.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {filteredProjects.map((project: Contract) => (
                  <div
                    key={project.id}
                    className="rounded-3xl border border-surface-border bg-surface-card p-5 shadow-card hover:-translate-y-0.5 transition-transform flex flex-col md:flex-row md:items-center justify-between gap-5"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <Badge tone={project.status === "completed" ? "success" : "brand"}>
                          {project.status.toUpperCase()}
                        </Badge>
                        <Badge tone={project.budget >= 100000 ? "danger" : "info"}>
                          {project.budget >= 100000 ? "HIGH PRIORITY" : "NORMAL"}
                        </Badge>
                      </div>
                      
                      <h3 className="font-black text-ink-900 text-base leading-snug">{project.title}</h3>
                      
                      <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-ink-500">
                        <span className="flex items-center gap-1">
                          <Users className="h-4 w-4 text-ink-400" /> Client: {project.client?.fullName}
                        </span>
                        <span className="flex items-center gap-1">
                          <Wallet className="h-4 w-4 text-ink-400" /> {formatCurrency(project.budget)}
                        </span>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4 text-ink-400" /> Date: {new Date(project.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2 items-center justify-end shrink-0">
                      <Button
                        size="sm"
                        icon={<ChevronRight className="h-4 w-4" />}
                        iconPosition="right"
                        onClick={() => navigate(`/workspace/${project.id}`)}
                      >
                        Open Workspace
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      )}
    </DashboardLayout>
  );
}
