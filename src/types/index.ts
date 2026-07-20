// ==================== AUTH & USERS ====================

export type UserRole = "client" | "freelancer" | "admin";

export interface UserExperience {
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface UserEducation {
  degree: string;
  institution: string;
  period: string;
}

export interface UserCertification {
  name: string;
  issuedDate: string;
}

export interface UserLanguage {
  name: string;
  level: string;
}

export interface UserPortfolio {
  title: string;
  description: string;
  url?: string;
  imageUrl?: string;
  category?: string;
}

export interface User {
  _id?: string;
  id?: string;
  fullName: string;
  email: string;
  role: UserRole;
  provider?: "local" | "google" | "github" | "firebase";
  avatar?: string;
  avatarUrl?: string;
  title?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  hourlyRate?: number;
  portfolio?: UserPortfolio[];
  experience?: UserExperience[];
  education?: UserEducation[];
  certifications?: UserCertification[];
  languages?: UserLanguage[];
  createdAt: string;
  updatedAt?: string;
}

export interface AuthCredentials {
  email: string;
  password: string;
}

export interface RegisterPayload {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
  role: UserRole;
}

// ==================== JOBS ====================

export type ExperienceLevel = "entry" | "intermediate" | "expert";
export type JobStatus = "draft" | "open" | "in_progress" | "completed" | "closed";
export type PriceType = "fixed" | "hourly";
export type WorkType  = "remote" | "hybrid" | "onsite";

export interface Job {
  id: string;
  title: string;
  company?: string;
  companyLogoUrl?: string;
  category: string;
  description: string;
  budgetMin: number;
  budgetMax: number;
  priceType: PriceType;
  duration: string;
  experienceLevel: ExperienceLevel;
  skills: string[];
  // extended fields
  location?: string;
  workType?: WorkType;
  clientRating?: number;
  paymentVerified?: boolean;
  deadline?: string;
  // legacy / optional
  rating?: number;
  reviewCount?: number;
  aiVerified?: boolean;
  status: JobStatus;
  postedAt?: string;
  createdAt?: string;
  proposalsCount?: number;
  client?: {
    id: string;
    fullName: string;
    avatar?: string;
  };
}

// ==================== SAVED JOBS ====================

export interface SavedJobItem {
  savedId: string;
  savedAt: string;
  job:     Job;
}

// ==================== JOB ALERTS ====================

export interface JobAlert {
  id:              string;
  name:            string;
  keywords:        string[];
  skills:          string[];
  category:        string;
  budgetMin:       number;
  budgetMax:       number;
  experienceLevel: string;
  priceType:       string;
  location:        string;
  workType:        string;
  frequency:       "instant" | "daily" | "weekly";
  notifyEmail:     boolean;
  notifyInApp:     boolean;
  active:          boolean;
  lastTriggeredAt?: string;
  createdAt:       string;
}

// ==================== PROPOSALS ====================

export type ProposalStatus = "draft" | "submitted" | "shortlisted" | "accepted" | "rejected";

export interface Milestone {
  id: string;
  name: string;
  amount: number;
}

export interface Proposal {
  id: string;
  jobId: string;
  jobTitle: string;
  freelancerId: string;
  description: string;
  bidAmount: number;
  serviceFeePercent: number;
  estimatedDelivery: string;
  milestones: { name: string; amount: number; id?: string; }[];
  matchScore?: number;
  status: ProposalStatus;
  submittedAt: string;
  createdAt: string;
  freelancer?: User;
  job?: {
    title: string;
    client?: {
      fullName: string;
    };
  };
}

// ==================== FREELANCER PROFILE ====================

export interface Review {
  id: string;
  reviewerName: string;
  reviewerTitle: string;
  rating: number;
  comment: string;
  createdAt: string;
}

export interface ExperienceEntry {
  id: string;
  role: string;
  company: string;
  period: string;
  description: string;
}

export interface EducationEntry {
  id: string;
  degree: string;
  institution: string;
}

export interface Certification {
  id: string;
  name: string;
  issuedDate: string;
}

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  imageUrl: string;
}

export interface FreelancerProfile {
  id: string;
  fullName: string;
  title: string;
  location: string;
  avatarUrl: string;
  bannerUrl?: string;
  hourlyRate: number;
  available: boolean;
  responseTime: string;
  lastActive: string;
  about: string;
  expertise: string[];
  languages: { name: string; level: string }[];
  portfolio: PortfolioItem[];
  experience: ExperienceEntry[];
  education: EducationEntry[];
  certifications: Certification[];
  reviews: Review[];
  rating: number;
  reviewCount: number;
}

// ==================== MESSAGING ====================

export interface Conversation {
  id: string;
  participantName: string;
  participantAvatarUrl: string;
  online: boolean;
  lastMessage: string;
  lastMessageAt: string;
  unreadCount?: number;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  senderAvatarUrl: string;
  content: string;
  attachment?: { name: string; size: string };
  createdAt: string;
  isOwn: boolean;
  read?: boolean;
}

// ==================== WORKSPACE ====================

export type TaskColumnKey = "todo" | "in_progress" | "review";

export interface WorkspaceTask {
  id: string;
  title: string;
  label: string;
  labelColor: string;
  assigneeAvatarUrl: string;
  column: TaskColumnKey;
  meta: { icon: "comment" | "attachment" | "eye" | "timer"; value: string; tone?: "default" | "danger" }[];
  assignee?: {
    avatar?: string;
    fullName?: string;
  } | null;
  commentsCount?: number;
  attachmentsCount?: number;
}

export interface WorkspaceFile {
  id: string;
  name: string;
  size: string;
  updatedAt: string;
  thumbnailUrl?: string;
  url?: string;
}

export interface WorkspaceFolder {
  id: string;
  name: string;
  fileCount: number;
  size: string;
  color: string;
  itemsCount?: number;
}

// ==================== DASHBOARD / STATS ====================

export interface StatCardData {
  id: string;
  label: string;
  value: string;
  delta?: string;
  icon: string;
  tone?: "brand" | "success" | "warning" | "danger" | "info";
}

export interface ActivityItem {
  id: string;
  title: string;
  description: string;
  timestamp: string;
  icon: "proposal" | "payment" | "review" | "message";
}

// ==================== ACTIVITY FEED ====================

export type ActivityEventType =
  | "proposal_submitted"
  | "proposal_accepted"
  | "proposal_rejected"
  | "contract_started"
  | "contract_completed"
  | "payment_received"
  | "message_received"
  | "review_received"
  | "notification"
  | "job_saved"
  | "ai_insight";

export type ActivityCategory = "projects" | "payments" | "messages" | "ai" | "portfolio" | "all";

export interface FeedActivityItem {
  id: string;
  type: ActivityEventType;
  category: ActivityCategory;
  title: string;
  description: string;
  meta?: string;
  amount?: number;
  createdAt: string;
}

// ==================== DASHBOARD STATS ====================

export interface FreelancerDashboardStats {
  activeProjects: number;
  pendingProposals: number;
  unreadMessages: number;
  totalEarnings: number;
  profileCompletion: number;
  jobSuccessScore: number;
  totalContracts: number;
  completedContracts: number;
  inEscrow: number;
  avgRating: number;
  reviewCount: number;
  acceptanceRate: number;
}

// ==================== ADMIN ====================

export interface AdminUserRow {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  role: UserRole;
  status: "active" | "pending" | "banned";
  lastActive: string;
  amount: number;
  amountLabel: string;
}

export interface ComplaintItem {
  id: string;
  severity: "low" | "medium" | "high";
  title: string;
  description: string;
  reportedAt: string;
  avatarUrl?: string;
}

export interface ServerNode {
  id: string;
  name: string;
  location: string;
  status: "online" | "degraded" | "optimized";
  uptime: string;
  ping: string;
}

// ==================== AI ASSISTANT ====================

export interface AiChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  createdAt: string;
}

export interface AiQuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
}

// ==================== CONTRACTS ====================

export type ContractStatus = "pending" | "active" | "completed" | "cancelled" | "disputed";
export type EscrowStatus = "none" | "funded" | "released" | "refunded";

export interface Contract {
  id: string;
  _id?: string;
  job: string | Job;
  proposal: string | Proposal;
  client: User;
  freelancer: User;
  title: string;
  budget: number;
  status: ContractStatus;
  escrowStatus: EscrowStatus;
  stripePaymentIntentId?: string | null;
  createdAt: string;
  updatedAt: string;
}

// ==================== API ====================

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

// ==================== WORKSPACE EXTENSIONS ====================

export interface WorkspaceMilestone {
  id: string;
  contract: string;
  title: string;
  description?: string;
  budget: number;
  dueDate: string;
  status: "pending" | "in_progress" | "submitted" | "approved" | "rejected" | "completed";
  submissionText?: string;
  submissionUrl?: string;
  clientFeedback?: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceDeliverable {
  id: string;
  contract: string;
  milestone: string | { id: string; title: string; name?: string };
  name: string;
  fileType: string;
  fileSize: string;
  fileUrl?: string;
  gitRepoUrl?: string;
  liveSiteUrl?: string;
  version: number;
  feedback?: string;
  status: "pending" | "approved" | "rejected";
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceTimeLog {
  id: string;
  contract: string;
  freelancer: string | User;
  startTime: string;
  endTime?: string;
  duration: number;
  notes?: string;
  status: "logged" | "billed" | "paid";
  createdAt: string;
  updatedAt: string;
}
