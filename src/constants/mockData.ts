import type {
  ActivityItem,
  AdminUserRow,
  ComplaintItem,
  Conversation,
  ChatMessage,
  FreelancerProfile,
  Job,
  ServerNode,
  StatCardData,
  User,
  WorkspaceFile,
  WorkspaceFolder,
  WorkspaceTask,
} from "@/types";

export const MOCK_USERS: User[] = [
  {
    id: "u_client_1",
    fullName: "Alex Rivera",
    email: "client@nexora.com",
    role: "client",
    avatarUrl: "https://i.pravatar.cc/150?img=12",
    title: "Head of Product",
    location: "New York, US",
    createdAt: "2024-01-10T00:00:00Z",
  },
  {
    id: "u_freelancer_1",
    fullName: "Alex Sterling",
    email: "freelancer@nexora.com",
    role: "freelancer",
    avatarUrl: "https://i.pravatar.cc/150?img=33",
    title: "Expert Freelancer",
    location: "Austin, US",
    createdAt: "2023-11-02T00:00:00Z",
  },
  {
    id: "u_admin_1",
    fullName: "Nexora Admin",
    email: "admin@nexora.com",
    role: "admin",
    avatarUrl: "https://i.pravatar.cc/150?img=68",
    title: "Global Admin",
    location: "Remote",
    createdAt: "2023-01-01T00:00:00Z",
  },
];

export const CLIENT_STATS: StatCardData[] = [
  { id: "1", label: "Active Jobs", value: "12", delta: "+2 this week", icon: "briefcase", tone: "brand" },
  { id: "2", label: "Open Proposals", value: "48", delta: "15 new", icon: "file-text", tone: "info" },
  { id: "3", label: "Running Projects", value: "8", icon: "rocket", tone: "success" },
  { id: "4", label: "Total Spending", value: "$24,500.00", icon: "wallet", tone: "warning" },
];

export const FREELANCER_STATS: StatCardData[] = [
  { id: "1", label: "Total Earnings", value: "$12,450.00", delta: "+12%", icon: "wallet", tone: "brand" },
  { id: "2", label: "Active Projects", value: "4", icon: "folder", tone: "info" },
  { id: "3", label: "Completed Jobs", value: "28", icon: "badge-check", tone: "success" },
  { id: "4", label: "Profile Strength", value: "95%", icon: "zap", tone: "warning" },
];

export const RECENT_ACTIVITY: ActivityItem[] = [
  {
    id: "1",
    title: "New proposal received",
    description: 'Aero Fleet invited you to bid on "Mobile App Redesign"',
    timestamp: "2 hours ago",
    icon: "proposal",
  },
  {
    id: "2",
    title: "Payment cleared",
    description: "Your payment of $1,200 for 'Project Alpha' is now available.",
    timestamp: "Yesterday",
    icon: "payment",
  },
  {
    id: "3",
    title: "5-Star Review",
    description: 'Client "Cloud Scale" left a review: "Amazing attention to detail!"',
    timestamp: "2 days ago",
    icon: "review",
  },
  {
    id: "4",
    title: "Message from Client",
    description: '"Hey, can we hop on a quick sync tomorrow morning?"',
    timestamp: "3 days ago",
    icon: "message",
  },
];

export const MOCK_JOBS: Job[] = [
  {
    id: "job_1",
    title: "Senior UI/UX Architect",
    company: "Aether Digital",
    category: "UI/UX Design",
    description:
      "We're seeking a visionary designer to lead the overhaul of our core enterprise platform. Deep expertise in design systems is required.",
    budgetMin: 8000,
    budgetMax: 12000,
    priceType: "fixed",
    duration: "4 Months",
    experienceLevel: "expert",
    skills: ["Design System", "Figma", "WCAG", "Prototyping"],
    rating: 4.9,
    reviewCount: 128,
    aiVerified: true,
    status: "open",
    postedAt: "2026-06-28T00:00:00Z",
  },
  {
    id: "job_2",
    title: "Full-Stack AI Integrator",
    company: "Nexus Finance",
    category: "AI & ML",
    description:
      "Help us integrate LLM capabilities into our customer service dashboard. Experience with LangChain, OpenAI API required.",
    budgetMin: 15000,
    budgetMax: 25000,
    priceType: "fixed",
    duration: "6 Months",
    experienceLevel: "expert",
    skills: ["LangChain", "Node.js", "Python"],
    rating: 5.0,
    reviewCount: 42,
    aiVerified: true,
    status: "open",
    postedAt: "2026-06-27T00:00:00Z",
  },
  {
    id: "job_3",
    title: "Brand Identity Consultant",
    company: "Lumens Studio",
    category: "Branding",
    description:
      "Defining the visual language for a new sustainable fashion brand. Needs to cover logo, typography, and social media.",
    budgetMin: 3000,
    budgetMax: 5000,
    priceType: "fixed",
    duration: "2 Weeks",
    experienceLevel: "intermediate",
    skills: ["Branding", "Illustration"],
    rating: 4.8,
    reviewCount: 89,
    status: "open",
    postedAt: "2026-06-25T00:00:00Z",
  },
  {
    id: "job_4",
    title: "Data Visualization Expert",
    company: "EcoMetrics AI",
    category: "Data Science",
    description:
      "Converting complex climate datasets into interactive web experiences. Proficiency in D3.js or Three.js is highly desired.",
    budgetMin: 12000,
    budgetMax: 18000,
    priceType: "fixed",
    duration: "3 Months",
    experienceLevel: "expert",
    skills: ["D3.js", "Three.js", "WebGL"],
    rating: 4.9,
    reviewCount: 31,
    aiVerified: true,
    status: "open",
    postedAt: "2026-06-20T00:00:00Z",
  },
  {
    id: "job_5",
    title: "Senior UX Designer for AI Dashboard",
    company: "Spark Labs",
    category: "UI/UX Design",
    description: "Enterprise-grade interface design for a new LLM monitoring tool.",
    budgetMin: 4500,
    budgetMax: 6000,
    priceType: "fixed",
    duration: "2 Months",
    experienceLevel: "expert",
    skills: ["Figma", "UX Research", "Design System"],
    rating: 4.7,
    reviewCount: 20,
    status: "open",
    postedAt: "2026-06-18T00:00:00Z",
  },
  {
    id: "job_6",
    title: "Product Branding & Visual Identity",
    company: "FinTech Pro",
    category: "Branding",
    description: "Comprehensive brand refresh for a high-growth fintech startup.",
    budgetMin: 85,
    budgetMax: 85,
    priceType: "hourly",
    duration: "6 Months",
    experienceLevel: "intermediate",
    skills: ["Branding", "Illustration", "Motion"],
    rating: 4.6,
    reviewCount: 15,
    status: "open",
    postedAt: "2026-06-15T00:00:00Z",
  },
];

export const FREELANCER_PROFILE: FreelancerProfile = {
  id: "fl_elena_vance",
  fullName: "Elena Vance",
  title: "Senior AI/UX Designer",
  location: "San Francisco, CA",
  avatarUrl: "https://i.pravatar.cc/300?img=47",
  hourlyRate: 85,
  available: true,
  responseTime: "< 2h",
  lastActive: "15m ago",
  about:
    "I specialize in bridging the gap between complex AI systems and intuitive human experiences. With over 10 years of experience in product design, I focus on creating LLM-integrated interfaces that feel human, ethical, and seamless. My approach combines data-driven insights with empathetic design principles.",
  expertise: ["Figma", "AI Ethics", "LLM Integration", "React", "Prompt Engineering", "UX Research", "Visualization"],
  languages: [
    { name: "English", level: "Native" },
    { name: "French", level: "Professional" },
    { name: "Spanish", level: "Conversational" },
  ],
  portfolio: [
    { id: "p1", title: "NeuralNexus Dashboard", category: "AI Platform · UX Design", imageUrl: "https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&q=80" },
    { id: "p2", title: "LearnFlow Mobile App", category: "Education Tech · Mobile UI", imageUrl: "https://images.unsplash.com/photo-1512941937669-90a1b58e7e9c?w=600&q=80" },
    { id: "p3", title: "Visionary Creative AI", category: "SaaS Tool · Product Design", imageUrl: "https://images.unsplash.com/photo-1550439062-609e1531270e?w=600&q=80" },
    { id: "p4", title: "Ethos Design System", category: "Design System · Branding", imageUrl: "https://images.unsplash.com/photo-1558655146-d09347e92766?w=600&q=80" },
  ],
  experience: [
    {
      id: "e1",
      role: "Senior Product Designer",
      company: "OpenAI (Contract)",
      period: "2021 — Present",
      description:
        "Leading UX initiatives for next-gen multimodal interfaces. Focused on lowering barriers for complex prompt engineering through intuitive visual abstractions.",
    },
    {
      id: "e2",
      role: "UX Design Lead",
      company: "Stripe",
      period: "2018 — 2021",
      description:
        "Redesigned the core merchant dashboard to integrate predictive analytics and automated financial insights for global enterprises.",
    },
  ],
  education: [
    { id: "ed1", degree: "MFA Interaction Design", institution: "School of Visual Arts, NY" },
    { id: "ed2", degree: "BS Computer Science", institution: "Stanford University" },
  ],
  certifications: [
    { id: "c1", name: "Google AI Design Professional", issuedDate: "Issued March 2023" },
    { id: "c2", name: "DeepLearning.AI UX Specialization", issuedDate: "Issued June 2022" },
  ],
  reviews: [
    {
      id: "r1",
      reviewerName: "Marcus Thorne",
      reviewerTitle: "CEO, SynthLabs",
      rating: 5,
      comment:
        "Elena's ability to translate our complex ML models into a simple dashboard was incredible. A true professional.",
      createdAt: "2026-05-02T00:00:00Z",
    },
    {
      id: "r2",
      reviewerName: "Sarah Chen",
      reviewerTitle: "Product Manager, Meta",
      rating: 5,
      comment:
        "Outstanding attention to detail. Her understanding of AI ethics is a massive asset to any product team.",
      createdAt: "2026-04-18T00:00:00Z",
    },
  ],
  rating: 5.0,
  reviewCount: 48,
};

export const CONVERSATIONS: Conversation[] = [
  {
    id: "c1",
    participantName: "Alex Rivera",
    participantAvatarUrl: "https://i.pravatar.cc/150?img=12",
    online: true,
    lastMessage: "Is typing…",
    lastMessageAt: "now",
  },
  {
    id: "c2",
    participantName: "Sarah Chen",
    participantAvatarUrl: "https://i.pravatar.cc/150?img=45",
    online: true,
    lastMessage: "Sent an attachment",
    lastMessageAt: "1h",
  },
  {
    id: "c3",
    participantName: "Jordan Smith",
    participantAvatarUrl: "https://i.pravatar.cc/150?img=15",
    online: false,
    lastMessage: "Sounds good, talk soon.",
    lastMessageAt: "1d",
  },
];

export const CHAT_MESSAGES: ChatMessage[] = [
  {
    id: "m1",
    conversationId: "c1",
    senderId: "u_freelancer_1",
    senderName: "Alex Rivera",
    senderAvatarUrl: "https://i.pravatar.cc/150?img=12",
    content:
      "Hey team! I've finished the initial draft for the Nexora AI dashboard integration. Would love some feedback on the data visualization components.",
    createdAt: "2026-07-02T10:42:00Z",
    isOwn: false,
  },
  {
    id: "m2",
    conversationId: "c1",
    senderId: "u_freelancer_1",
    senderName: "Alex Rivera",
    senderAvatarUrl: "https://i.pravatar.cc/150?img=12",
    content: "",
    attachment: { name: "Dashboard_v2_Mockups.pdf", size: "4.2 MB" },
    createdAt: "2026-07-02T10:42:00Z",
    isOwn: false,
  },
  {
    id: "m3",
    conversationId: "c1",
    senderId: "me",
    senderName: "Me",
    senderAvatarUrl: "https://i.pravatar.cc/150?img=32",
    content:
      "Looking great, Alex! The glassmorphism on the sidebar really elevates the feel. I'll take a deeper look at the PDF now.",
    createdAt: "2026-07-02T10:45:00Z",
    isOwn: true,
    read: true,
  },
];

export const WORKSPACE_TASKS: WorkspaceTask[] = [
  {
    id: "t1",
    title: "Implement AI skill validation micro-service",
    label: "FEATURE",
    labelColor: "brand",
    assigneeAvatarUrl: "https://i.pravatar.cc/150?img=12",
    column: "todo",
    meta: [{ icon: "comment", value: "3" }],
  },
  {
    id: "t2",
    title: "Refine onboarding flow for enterprise clients",
    label: "DESIGN",
    labelColor: "violet",
    assigneeAvatarUrl: "https://i.pravatar.cc/150?img=32",
    column: "todo",
    meta: [{ icon: "attachment", value: "2" }],
  },
  {
    id: "t3",
    title: "Fix production latency on marketplace search",
    label: "CRITICAL",
    labelColor: "danger",
    assigneeAvatarUrl: "https://i.pravatar.cc/150?img=15",
    column: "in_progress",
    meta: [{ icon: "timer", value: "2h left", tone: "danger" }],
  },
  {
    id: "t4",
    title: "Finalize API documentation for external partners",
    label: "DOCUMENTATION",
    labelColor: "info",
    assigneeAvatarUrl: "https://i.pravatar.cc/150?img=45",
    column: "review",
    meta: [{ icon: "eye", value: "2/3" }],
  },
];

export const WORKSPACE_FOLDERS: WorkspaceFolder[] = [
  { id: "f1", name: "Design", fileCount: 124, size: "1.2 GB", color: "brand" },
  { id: "f2", name: "Development", fileCount: 45, size: "856 MB", color: "violet" },
  { id: "f3", name: "Legal", fileCount: 12, size: "15 MB", color: "info" },
  { id: "f4", name: "Brand Assets", fileCount: 89, size: "3.4 GB", color: "danger" },
];

export const WORKSPACE_FILES: WorkspaceFile[] = [
  { id: "wf1", name: "Nexora_Office_Render.jpg", size: "12.4 MB", updatedAt: "Updated Oct 24", thumbnailUrl: "https://images.unsplash.com/photo-1497366216548-37526070297c?w=400&q=80" },
  { id: "wf2", name: "Brand_Guidelines_V2.pdf", size: "4.2 MB", updatedAt: "Updated Oct 22" },
  { id: "wf3", name: "Mobile_App_Sprint_3.fig", size: "-- MB", updatedAt: "Updated Yesterday", thumbnailUrl: "https://images.unsplash.com/photo-1551650975-87deedd944c3?w=400&q=80" },
  { id: "wf4", name: "Source_Code_Archive.zip", size: "245 MB", updatedAt: "Updated Oct 18" },
];

export const ADMIN_USERS: AdminUserRow[] = [
  {
    id: "au1",
    name: "Elena Vance",
    email: "elena.v@example.com",
    avatarUrl: "https://i.pravatar.cc/150?img=47",
    role: "freelancer",
    status: "active",
    lastActive: "2 mins ago",
    amount: 14205,
    amountLabel: "Total Earnings",
  },
  {
    id: "au2",
    name: "Marcus Sterling",
    email: "m.sterling@globalcorp.io",
    avatarUrl: "https://i.pravatar.cc/150?img=13",
    role: "client",
    status: "active",
    lastActive: "15 mins ago",
    amount: 250000,
    amountLabel: "Total Spend",
  },
  {
    id: "au3",
    name: "Julian Kaine",
    email: "kaine.j@nexora.dev",
    avatarUrl: "https://i.pravatar.cc/150?img=51",
    role: "freelancer",
    status: "pending",
    lastActive: "1 hour ago",
    amount: 0,
    amountLabel: "Total Earnings",
  },
  {
    id: "au4",
    name: "Damon Sills",
    email: "sills_d@banned.com",
    avatarUrl: "https://i.pravatar.cc/150?img=60",
    role: "client",
    status: "banned",
    lastActive: "3 days ago",
    amount: 1450,
    amountLabel: "Refunded",
  },
];

export const COMPLAINTS: ComplaintItem[] = [
  {
    id: "cp1",
    severity: "high",
    title: "Disputed Escrow Release",
    description: "Freelancer submitted incomplete work but client was auto-charged. Urgent intervention needed.",
    reportedAt: "2 mins ago",
    avatarUrl: "https://i.pravatar.cc/150?img=15",
  },
  {
    id: "cp2",
    severity: "medium",
    title: "Account Impersonation Report",
    description: "Possible automated bot profile detected using deepfake images for identity verification.",
    reportedAt: "15 mins ago",
    avatarUrl: "https://i.pravatar.cc/150?img=25",
  },
  {
    id: "cp3",
    severity: "low",
    title: "Payment Method Error",
    description: "User unable to add Mastercard from Singapore region. Returns code 402.",
    reportedAt: "42 mins ago",
  },
  {
    id: "cp4",
    severity: "high",
    title: "Data Privacy Violation Query",
    description: "Enterprise client requesting immediate GDPR data deletion log for historical records.",
    reportedAt: "1 hour ago",
    avatarUrl: "https://i.pravatar.cc/150?img=8",
  },
];

export const SERVER_NODES: ServerNode[] = [
  { id: "s1", name: "Server US-East-1", location: "Virginia Datacenter", status: "online", uptime: "99.9%", ping: "14ms" },
  { id: "s2", name: "Server EU-West-2", location: "London Hub", status: "online", uptime: "100%", ping: "43ms" },
  { id: "s3", name: "Server AP-South-1", location: "Mumbai Regional", status: "degraded", uptime: "97.4%", ping: "186ms" },
  { id: "s4", name: "Main DB Cluster", location: "Cassandra Replicas", status: "optimized", uptime: "8.4k q/s", ping: "Healthy" },
];

export const HIRING_GROWTH_DATA = [
  { month: "Jan", value: 8 },
  { month: "Feb", value: 14 },
  { month: "Mar", value: 11 },
  { month: "Apr", value: 18 },
  { month: "May", value: 22 },
  { month: "Jun", value: 27 },
];

export const REVENUE_AI_USAGE_DATA = [
  { label: "W1", revenue: 30, aiUsage: 45 },
  { label: "W2", revenue: 45, aiUsage: 38 },
  { label: "W3", revenue: 38, aiUsage: 55 },
  { label: "W4", revenue: 60, aiUsage: 70 },
  { label: "W5", revenue: 78, aiUsage: 62 },
  { label: "W6", revenue: 66, aiUsage: 80 },
  { label: "W7", revenue: 85, aiUsage: 75 },
];

export const SIGNUP_TRENDS_DATA = [
  { time: "00:00", value: 40 },
  { time: "04:00", value: 62 },
  { time: "08:00", value: 55 },
  { time: "12:00", value: 88 },
  { time: "16:00", value: 70 },
  { time: "20:00", value: 65 },
  { time: "23:59", value: 58 },
];
