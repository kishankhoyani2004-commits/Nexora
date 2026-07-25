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
  socialLinks?: {
    github?: string;
    linkedin?: string;
    twitter?: string; // used as "X" for company profiles
    facebook?: string;
    instagram?: string;
    website?: string;
  };
  createdAt: string;
  updatedAt?: string;
  // Aggregated review stats (computed server-side, present on populated freelancer refs)
  rating?: number;
  reviewCount?: number;
  // Freelancer-only: self-reported availability
  availability?: "available" | "busy" | "unavailable";
  // Computed server-side from the Contract collection (present on Saved
  // Freelancers / freelancer summary responses, not stored on the user doc)
  completedProjects?: number;
  successRate?: number;

  // ── Client Company Profile fields ─────────────────────────────────────────
  companyName?: string;
  ownerName?: string;
  phone?: string;
  website?: string;
  industry?: string;
  companySize?: string;
  country?: string;
  state?: string;
  city?: string;
  address?: string;
  gstId?: string;

  // ── Settings & Security ─────────────────────────────────────────────────
  notificationPreferences?: {
    emailNotifications: boolean;
    pushNotifications: boolean;
    emailDigest: "daily" | "weekly" | "monthly" | "never";
    jobAlerts: boolean;
    proposalUpdates: boolean;
    projectUpdates: boolean;
    paymentUpdates: boolean;
    messageNotifications: boolean;
    reviewNotifications: boolean;
  };
  privacySettings?: {
    profileVisibility: "public" | "private" | "connections";
    showEmail: boolean;
    showPhone: boolean;
    allowMessages: boolean;
    allowInvitations: boolean;
    showActivityStatus: boolean;
  };
  connectedAccounts?: {
    google?: string | null;
    github?: string | null;
  };
  twoFactorEnabled?: boolean;
  googleId?: string | null;
  githubId?: string | null;
  preferences?: {
    theme: "light" | "dark" | "system";
    language: string;
  };
  accountDeletionScheduled?: {
    scheduled: boolean;
    scheduledFor: string | null;
  };
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

export interface JobAttachment {
  filename: string;
  url:      string;
  mimetype: string;
}

export interface Job {
  id: string;
  _id?: string;
  title: string;
  company?: string;
  companyLogoUrl?: string;
  category: string;
  subcategory?: string;
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
  visibility?: "public" | "private";
  attachments?: JobAttachment[];
  views?: number;
  // legacy / optional
  rating?: number;
  reviewCount?: number;
  aiVerified?: boolean;
  status: JobStatus;
  postedAt?: string;
  createdAt?: string;
  updatedAt?: string;
  proposalsCount?: number;
  client?: {
    id: string;
    fullName: string;
    avatar?: string;
  };
  // Module 2: Professional Post Job fields
  englishLevel?: "basic" | "intermediate" | "advanced" | "fluent";
  freelancersNeeded?: number;
  currency?: string;
  estimatedHours?: number;
  featured?: boolean;
  urgent?: boolean;
  allowAIMatching?: boolean;
  allowMultipleProposals?: boolean;
  proposalDeadline?: string;
  projectStartDate?: string;
  expectedCompletionDate?: string;
  suggestedBudget?: number;
  suggestedSkills?: string[];
  suggestedDescription?: string;
}

// ==================== JOB CREATE PAYLOAD ====================

export interface JobCreatePayload {
  title:                 string;
  category:              string;
  subcategory?:          string;
  description:           string;
  skills:                string[];
  priceType:             PriceType;
  budgetMin:             number;
  budgetMax:             number;
  experienceLevel:       ExperienceLevel;
  duration:              string;
  deadline?:             string;
  visibility:            "public" | "private";
  location?:             string;
  workType?:             WorkType;
  // Module 2: Professional Post Job fields
  englishLevel?:         "basic" | "intermediate" | "advanced" | "fluent";
  freelancersNeeded?:    number;
  currency?:             string;
  estimatedHours?:       number;
  featured?:             boolean;
  urgent?:               boolean;
  allowAIMatching?:      boolean;
  allowMultipleProposals?: boolean;
  proposalDeadline?:     string;
  projectStartDate?:     string;
  expectedCompletionDate?: string;
}

// ==================== SAVED JOBS ====================

export interface SavedJobItem {
  savedId: string;
  savedAt: string;
  job:     Job;
}

// ==================== SAVED FREELANCERS ====================

export interface SavedFreelancerItem {
  savedId:    string;
  savedAt:    string;
  freelancer: User;
}

// ==================== INVITATIONS ====================

export type InvitationStatus = "pending" | "accepted" | "declined";

export interface Invitation {
  id:         string;
  client:     Pick<User, "id" | "fullName" | "avatar" | "companyName"> | string;
  freelancer: Pick<User, "id" | "fullName" | "avatar"> | string;
  job:        Pick<Job, "id" | "title" | "budgetMin" | "budgetMax" | "priceType" | "status"> | string;
  message?:   string;
  status:     InvitationStatus;
  createdAt:  string;
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
  attachments?: JobAttachment[];
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

export type TaskColumnKey = "todo" | "in_progress" | "review" | "completed";

export interface WorkspaceTask {
  id: string;
  title: string;
  label: string;
  labelColor: string;
  assigneeAvatarUrl: string;
  column: TaskColumnKey;
  meta: { icon: "comment" | "attachment" | "eye" | "timer"; value: string; tone?: "default" | "danger" }[];
  assignee?: {
    id?: string;
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
  createdAt?: string;
  thumbnailUrl?: string;
  url?: string;
  mimetype?: string;
  uploadedBy?: { id?: string; fullName?: string; avatar?: string } | string | null;
}

// A single chat message inside a project's workspace. Socket events emit a
// flattened senderId/senderName/senderAvatar shape; the REST endpoints
// return a populated Mongoose `sender` object — components normalize both
// into this shape before rendering.
export interface WorkspaceMessage {
  id: string;
  contractId?: string;
  contract?: string;
  sender?: { id?: string; fullName?: string; avatar?: string } | string;
  senderId?: string;
  senderName?: string;
  senderAvatar?: string;
  content: string;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
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

// ── Client dashboard KPIs ────────────────────────────────────────────────────
export interface ClientRecentJob {
  _id: string;
  id?: string;
  title: string;
  category: string;
  status: JobStatus;
  proposalsCount: number;
  budgetMin: number;
  priceType: PriceType;
  createdAt: string;
}

export interface ClientActivityItem {
  id: string;
  title: string;
  description: string;
  createdAt: string;
  read: boolean;
}

export interface ClientDashboardStats {
  // Job counts by status
  draftJobs:       number;
  openJobs:        number;
  inProgressJobs:  number;
  completedJobs:   number;
  closedJobs:      number;
  totalJobs:       number;
  // Aggregate counts
  totalProposals:    number;
  activeProjects:    number;
  completedProjects: number;
  // Financials
  totalSpending:  number;
  activeSpending: number;
  // Messaging
  unreadMessages: number;
  // Recent data
  recentJobs:     ClientRecentJob[];
  recentActivity: ClientActivityItem[];
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
  attachments?: { filename: string; mimetype?: string; extractedText?: string }[];
}

export interface AiQuickAction {
  id: string;
  title: string;
  description: string;
  icon: string;
}

/** Real multi-chat AI Assistant — one document per named conversation. */
export interface AiChatSummary {
  id: string;
  title: string;
  context: string;
  pinned: boolean;
  lastMessageAt: string;
  createdAt: string;
  messageCount: number;
  preview: string;
}

export interface AiChat {
  id: string;
  userId: string;
  title: string;
  context: string;
  pinned: boolean;
  lastMessageAt: string;
  createdAt: string;
  messages: AiChatMessage[];
}

export interface AiChatSearchResult {
  id: string;
  title: string;
  context: string;
  lastMessageAt: string;
  snippet: string;
}

// ==================== CONTRACTS ====================

export type ContractStatus = "pending" | "active" | "submitted" | "completed" | "cancelled" | "disputed";
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

// Lightweight contract reference attached to cross-project list items
// (my-milestones / my-files) — a subset of Contract, not the full document.
export interface WorkspaceContractRef {
  id: string;
  title: string;
  status: ContractStatus;
  client?: { id: string; fullName: string; avatar?: string };
  freelancer?: { id: string; fullName: string; avatar?: string };
  job?: string;
}

export interface MyMilestoneItem {
  milestone: WorkspaceMilestone;
  contract: WorkspaceContractRef | null;
}

export interface MyFileItem {
  file: WorkspaceFile;
  contract: Pick<WorkspaceContractRef, "id" | "title"> | null;
}

export interface MyDeliverableItem {
  deliverable: WorkspaceDeliverable;
  contract: WorkspaceContractRef | null;
}

export interface MyTimeLogItem {
  timeLog: WorkspaceTimeLog;
  contract: WorkspaceContractRef | null;
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

export interface WorkspaceRecord {
  id: string;
  contract: string;
  job: string;
  client: string;
  freelancer: string;
  status: "active" | "completed" | "cancelled";
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WorkspaceActivityItem {
  id: string;
  contract: string;
  actor?: { id?: string; fullName?: string; avatar?: string } | null;
  action: string;
  message: string;
  createdAt: string;
}

export interface WorkspaceMilestonesSummary {
  total: number;
  completed: number;
  inProgress: number;
  submitted: number;
}

export interface WorkspaceOverview {
  contract: Contract;
  workspace: WorkspaceRecord | null;
  dueDate: string | null;
  progress: number;
  milestonesSummary: WorkspaceMilestonesSummary;
  deliverablesCount: number;
  filesCount: number;
  recentActivity: WorkspaceActivityItem[];
}

// ==================== PROJECT SUBMISSION ====================

export type ProjectSubmissionStatus = "pending" | "approved" | "revision_requested";

export interface ProjectSubmissionFile {
  name: string;
  url: string;
  mimetype?: string;
  size?: string;
}

export interface ProjectSubmission {
  id: string;
  contract: string;
  freelancer: string;
  client: string;
  notes: string;
  links: string[];
  files: ProjectSubmissionFile[];
  status: ProjectSubmissionStatus;
  clientFeedback: string;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SubmittedProjectItem {
  contract: Contract;
  submission: ProjectSubmission | null;
}
