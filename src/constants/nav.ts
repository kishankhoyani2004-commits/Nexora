import type { LucideIcon } from "lucide-react";
import {
  LayoutGrid, PlusCircle, Briefcase, FileText, FolderKanban,
  MessageSquare, CreditCard, BarChart3, Settings, Search,
  Star, Wallet, Award, Users, Building2, ShieldCheck,
  Zap, ShieldAlert, Activity, TrendingUp, HelpCircle, Bell,
} from "lucide-react";
import { ROUTES } from "@/constants/routes";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
  badge?: string;
}

export const CLIENT_NAV: NavItem[] = [
  { label: "Dashboard",   href: ROUTES.CLIENT_DASHBOARD,  icon: LayoutGrid },
  { label: "Post Job",    href: ROUTES.POST_JOB,          icon: PlusCircle },
  { label: "My Jobs",     href: ROUTES.JOBS,              icon: Briefcase },
  { label: "Proposals",   href: ROUTES.PROPOSALS,         icon: FileText },
  { label: "Projects",    href: ROUTES.WORKSPACE,         icon: FolderKanban },
  { label: "Messages",    href: ROUTES.MESSAGES,          icon: MessageSquare },
  { label: "Payments",    href: ROUTES.CLIENT_PAYMENTS,   icon: CreditCard },
  { label: "Analytics",   href: ROUTES.CLIENT_ANALYTICS,  icon: BarChart3 },
  { label: "Notifications", href: ROUTES.NOTIFICATIONS,   icon: Bell },
  { label: "Settings",    href: ROUTES.SETTINGS,          icon: Settings },
  { label: "Help Center", href: ROUTES.HELP,              icon: HelpCircle },
];

export const FREELANCER_NAV: NavItem[] = [
  { label: "Dashboard",    href: ROUTES.FREELANCER_DASHBOARD, icon: LayoutGrid },
  { label: "Browse Jobs",  href: ROUTES.JOBS,                 icon: Search },
  { label: "My Proposals", href: ROUTES.PROPOSALS,            icon: FileText },
  { label: "Projects",     href: ROUTES.WORKSPACE,            icon: FolderKanban },
  { label: "Portfolio",    href: ROUTES.PROFILE,              icon: Briefcase },
  { label: "Messages",     href: ROUTES.MESSAGES,             icon: MessageSquare },
  { label: "Reviews",      href: ROUTES.FREELANCER_REVIEWS,   icon: Star },
  { label: "Earnings",     href: ROUTES.FREELANCER_EARNINGS,  icon: Wallet },
  { label: "Notifications", href: ROUTES.NOTIFICATIONS,       icon: Bell },
  { label: "Settings",     href: ROUTES.SETTINGS,             icon: Settings },
  { label: "Help Center",  href: ROUTES.HELP,                 icon: HelpCircle },
];

export const ADMIN_NAV: NavItem[] = [
  { label: "Analytics",             href: ROUTES.ADMIN_ANALYTICS,     icon: BarChart3 },
  { label: "User Management",       href: ROUTES.ADMIN_USERS,         icon: Users },
  { label: "Client Management",     href: `${ROUTES.ADMIN_USERS}?role=client`,     icon: Building2 },
  { label: "Freelancer Management", href: `${ROUTES.ADMIN_USERS}?role=freelancer`, icon: Award },
  { label: "Reports",               href: ROUTES.ADMIN_REPORTS,       icon: FileText },
  { label: "Revenue",               href: ROUTES.ADMIN_ANALYTICS,     icon: TrendingUp },
  { label: "Pending Approvals",     href: ROUTES.ADMIN_DASHBOARD,     icon: ShieldCheck },
  { label: "AI Usage Statistics",   href: ROUTES.ADMIN_AI_USAGE,      icon: Zap },
  { label: "System Health",         href: ROUTES.ADMIN_SYSTEM_HEALTH, icon: Activity },
  { label: "Complaints",            href: ROUTES.ADMIN_REPORTS,       icon: ShieldAlert },
  { label: "Settings",              href: ROUTES.SETTINGS,            icon: Settings },
];
