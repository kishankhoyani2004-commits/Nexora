import { useState, useCallback, useEffect, useLayoutEffect, useRef } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { LogOut, HelpCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { Logo } from "@/components/layout/Logo";
import { LogoutConfirmModal } from "@/components/common/LogoutConfirmModal";
import { cn } from "@/utils/cn";
import { useAuth } from "@/context/AuthContext";
import { useQueryClient } from "@tanstack/react-query";
import { ROUTES } from "@/constants/routes";
import {
  LayoutGrid, Activity, BarChart3, PlusCircle, Briefcase, Users, ShieldCheck, UserPlus,
  FolderKanban, Flag, FileText, Paperclip, CheckCircle2, MessageSquare, Video, Bell,
  CreditCard, Wallet, Receipt, DollarSign, LineChart, TrendingUp, Award, Building2,
  Settings, Shield, Search, Zap, Bookmark, BellRing, History, MailOpen, Package, Clock,
  Layers, FileBadge, UserCheck, Sparkles, ArrowUpRight, Star, Mail,
} from "lucide-react";

// Each route is a separate lazy-loaded page that renders its own
// DashboardLayout/DashboardSidebar, so the sidebar fully unmounts and
// remounts on every navigation. Track its scroll position here, outside
// the component, so a fresh mount can restore exactly where the user left it.
let savedSidebarScrollTop = 0;

const SIDEBAR_COLLAPSED_KEY = "nexora:sidebar-collapsed";

export function DashboardSidebar() {
  const location   = useLocation();
  const { user, logout } = useAuth();
  const navigate   = useNavigate();
  const queryClient = useQueryClient();

  const [logoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isLoggingOut,    setIsLoggingOut]    = useState(false);
  const [collapsed, setCollapsed] = useState(() => {
    try {
      return localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
    } catch {
      return false;
    }
  });
  const navRef = useRef<HTMLElement>(null);
  const [tooltip, setTooltip] = useState<{ label: string; top: number; left: number } | null>(null);

  const role = user?.role || "freelancer";

  // ── Collapsed-mode tooltips render via a portal positioned with the
  // hovered element's own bounding rect, so they always sit cleanly to the
  // right of the icon instead of being clipped/squashed by the nav's
  // scrollable container.
  const showTooltip = useCallback((label: string, target: HTMLElement) => {
    const rect = target.getBoundingClientRect();
    setTooltip({ label, top: rect.top + rect.height / 2, left: rect.right + 10 });
  }, []);
  const hideTooltip = useCallback(() => setTooltip(null), []);

  useEffect(() => {
    try {
      localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
    } catch {
      // localStorage unavailable — collapse preference just won't persist
    }
  }, [collapsed]);

  // ── Restore scroll position on mount (this component remounts on every
  // route change) and keep the saved position updated as the user scrolls.
  // No automatic repositioning otherwise — the sidebar only moves when the
  // user scrolls it themselves.
  useLayoutEffect(() => {
    if (navRef.current) {
      navRef.current.scrollTop = savedSidebarScrollTop;
    }
  }, []);

  const handleNavScroll = useCallback((e: React.UIEvent<HTMLElement>) => {
    savedSidebarScrollTop = e.currentTarget.scrollTop;
  }, []);

  // ── Logo soft-refresh ──────────────────────────────────────────────────────
  // Invalidates all cached queries so every component re-fetches fresh data
  // without a full browser reload.  Scroll position / form state is preserved.
  const handleLogoClick = useCallback(() => {
    queryClient.invalidateQueries();
  }, [queryClient]);

  // ── Logout flow ────────────────────────────────────────────────────────────
  const handleLogoutConfirm = useCallback(async () => {
    setIsLoggingOut(true);
    try {
      await logout();
      navigate(ROUTES.HOME);
    } finally {
      setIsLoggingOut(false);
      setLogoutModalOpen(false);
    }
  }, [logout, navigate]);

  // ── Nav sections ───────────────────────────────────────────────────────────
  const clientSections = [
    {
      title: "Overview",
      items: [
        { label: "Dashboard",     href: ROUTES.CLIENT_DASHBOARD,                          icon: LayoutGrid },
        { label: "Activity Feed", href: ROUTES.CLIENT_ACTIVITY,                           icon: Activity   },
        { label: "Analytics",     href: ROUTES.CLIENT_ANALYTICS,                          icon: BarChart3  },
      ],
    },
    {
      title: "Upload Jobs",
      items: [
        { label: "Upload New Job",           href: ROUTES.POST_JOB,                                    icon: PlusCircle  },
        { label: "My Job Posts",             href: ROUTES.CLIENT_MY_JOBS,                              icon: Briefcase   },
        { label: "Applications",             href: ROUTES.CLIENT_APPLICATIONS,             icon: Users       },
        { label: "Shortlisted Freelancers",  href: ROUTES.CLIENT_SHORTLISTED_FREELANCERS,  icon: ShieldCheck },
        { label: "Hire Freelancer",          href: ROUTES.JOBS,                                        icon: UserPlus    },
        { label: "Saved Freelancers",        href: ROUTES.CLIENT_SAVED_FREELANCERS,                    icon: Bookmark    },
      ],
    },
    {
      title: "Project Management",
      items: [
        { label: "Active Projects",    href: ROUTES.CLIENT_ACTIVE_PROJECTS,                        icon: FolderKanban },
        { label: "Completed Project",  href: ROUTES.CLIENT_COMPLETED_PROJECTS,                     icon: CheckCircle2 },
        { label: "Milestones",         href: ROUTES.CLIENT_MILESTONES,                             icon: Flag         },
        { label: "Contracts",          href: ROUTES.CLIENT_CONTRACTS,                               icon: FileText     },
        { label: "Project Files",      href: ROUTES.CLIENT_PROJECT_FILES,                           icon: Paperclip    },
      ],
    },
    {
      title: "Finance",
      items: [
        { label: "Payments",     href: ROUTES.CLIENT_PAYMENTS,                        icon: CreditCard },
        { label: "Transactions", href: `${ROUTES.CLIENT_PAYMENTS}?tab=transactions`,  icon: Wallet     },
        { label: "Invoices",     href: `${ROUTES.CLIENT_PAYMENTS}?tab=invoices`,      icon: Receipt    },
        { label: "Billing",      href: `${ROUTES.CLIENT_PAYMENTS}?tab=billing`,       icon: DollarSign },
      ],
    },
    {
      title: "Insights",
      items: [
        { label: "Reports",             href: ROUTES.CLIENT_REPORTS,           icon: LineChart  },
        { label: "Spending Analytics",  href: ROUTES.CLIENT_ANALYTICS,         icon: TrendingUp },
        { label: "Team Performance",    href: ROUTES.CLIENT_TEAM_PERFORMANCE,  icon: Award      },
        { label: "Reviews",             href: ROUTES.CLIENT_REVIEWS,                    icon: Star       },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Company Profile", href: ROUTES.CLIENT_PROFILE,               icon: Building2 },
        { label: "Settings",        href: ROUTES.CLIENT_SETTINGS,              icon: Settings  },
        { label: "Help Center",     href: ROUTES.HELP,                         icon: HelpCircle },
      ],
    },
  ];

  const freelancerSections = [
    {
      title: "Overview",
      items: [
        { label: "Dashboard",     href: ROUTES.FREELANCER_DASHBOARD,   icon: LayoutGrid },
        { label: "Activity Feed", href: ROUTES.FREELANCER_ACTIVITY,    icon: Activity   },
        { label: "Invitations",   href: ROUTES.FREELANCER_INVITATIONS, icon: Mail       },
        { label: "Analytics",     href: ROUTES.FREELANCER_ANALYTICS,   icon: BarChart3  },
      ],
    },
    {
      title: "Find Work",
      items: [
        { label: "Browse Jobs",      href: ROUTES.JOBS,             icon: Search    },
        { label: "Recommended Jobs", href: ROUTES.RECOMMENDED_JOBS, icon: Zap       },
        { label: "Saved Jobs",       href: ROUTES.SAVED_JOBS,       icon: Bookmark  },
        { label: "Job Alerts",       href: ROUTES.JOB_ALERTS,       icon: BellRing  },
      ],
    },
    {
      title: "Proposals",
      items: [
        { label: "My Proposals",          href: ROUTES.PROPOSALS,                        icon: FileText  },
        { label: "Proposal History",      href: `${ROUTES.PROPOSALS}?tab=history`,       icon: History   },
        { label: "Interview Invitations", href: `${ROUTES.MESSAGES}?tab=interviews`,     icon: MailOpen  },
      ],
    },
    {
      title: "Workbase",
      items: [
        { label: "Active Projects",    href: ROUTES.FREELANCER_ACTIVE_PROJECTS,    icon: FolderKanban },
        { label: "Milestones",         href: ROUTES.FREELANCER_MILESTONES,         icon: Flag         },
        { label: "Deliverables",       href: ROUTES.FREELANCER_DELIVERABLES,       icon: Package      },
        { label: "Time Tracking",      href: ROUTES.FREELANCER_TIME_TRACKING,      icon: Clock        },
        { label: "Completed Projects", href: ROUTES.FREELANCER_COMPLETED_PROJECTS, icon: CheckCircle2 },
      ],
    },
    {
      title: "Portfolio",
      items: [
        { label: "Portfolio",        href: ROUTES.PROFILE,                          icon: Briefcase  },
        { label: "Services",         href: `${ROUTES.PROFILE}?tab=Services`,        icon: Layers     },
        { label: "Skills",           href: `${ROUTES.PROFILE}?tab=Skills`,          icon: Award      },
        { label: "Certifications",   href: `${ROUTES.PROFILE}?tab=Certifications`,  icon: FileBadge  },
      ],
    },
    {
      title: "Earnings",
      items: [
        { label: "Earnings",        href: ROUTES.FREELANCER_EARNINGS,                       icon: Wallet       },
        { label: "Transactions",    href: `${ROUTES.FREELANCER_EARNINGS}?tab=transactions`, icon: History      },
        { label: "Withdraw Funds",  href: `${ROUTES.FREELANCER_EARNINGS}?tab=withdraw`,     icon: ArrowUpRight },
        { label: "Invoices",        href: `${ROUTES.FREELANCER_EARNINGS}?tab=invoices`,     icon: Receipt      },
      ],
    },
    {
      title: "Growth",
      items: [
        { label: "Reviews",               href: ROUTES.FREELANCER_REVIEWS,                         icon: Star       },
        { label: "Profile Completion",    href: `${ROUTES.PROFILE}?tab=Completion`,                icon: UserCheck  },
        { label: "Performance Insights",  href: `${ROUTES.FREELANCER_ANALYTICS}?tab=insights`,     icon: TrendingUp },
        { label: "AI Career Assistant",   href: ROUTES.AI_ASSISTANT,                               icon: Sparkles   },
      ],
    },
    {
      title: "Account",
      items: [
        { label: "Profile Settings", href: ROUTES.SETTINGS,                   icon: Settings   },
        { label: "Security",         href: ROUTES.SETTINGS_SECURITY,          icon: Shield     },
        { label: "Help Center",      href: ROUTES.HELP,                       icon: HelpCircle },
      ],
    },
  ];

  const adminSections = [
    {
      title: "Admin Control",
      items: [
        { label: "Dashboard",           href: ROUTES.ADMIN_DASHBOARD,    icon: LayoutGrid },
        { label: "Analytics",           href: ROUTES.ADMIN_ANALYTICS,    icon: BarChart3  },
        { label: "User Management",     href: ROUTES.ADMIN_USERS,        icon: Users      },
        { label: "Reports",             href: ROUTES.ADMIN_REPORTS,      icon: FileText   },
        { label: "AI Usage Statistics", href: ROUTES.ADMIN_AI_USAGE,     icon: Zap        },
        { label: "System Health",       href: ROUTES.ADMIN_SYSTEM_HEALTH,icon: Activity   },
        { label: "Settings",            href: ROUTES.SETTINGS,           icon: Settings   },
        { label: "Help Center",         href: ROUTES.HELP,               icon: HelpCircle },
      ],
    },
  ];

  const sections =
    role === "admin"
      ? adminSections
      : role === "client"
      ? clientSections
      : freelancerSections;

  // A nav item is active only when BOTH the path and the exact query string
  // match. The previous check also matched on pathname alone, which made the
  // plain "Active Projects" (no query) light up together with every one of
  // its `?tab=` sibling links (Milestones, Files, Contracts, ...) since they
  // all share the same /workspace pathname — so several items appeared
  // active at once instead of just the one actually selected.
  const isItemActive = (href: string) => {
    const [path, query = ""] = href.split("?");
    const currentQuery = location.search.replace(/^\?/, "");
    return location.pathname === path && currentQuery === query;
  };

  return (
    <>
      <aside
        className={cn(
          "flex h-screen shrink-0 flex-col border-r border-surface-border dark:border-blue-900 bg-surface-card dark:bg-gradient-to-b dark:from-blue-950 dark:to-purple-950 py-6 shadow-lg transition-[width] duration-300 ease-in-out",
          collapsed ? "w-20" : "w-64"
        )}
      >
        {/* ── Brand Header ── */}
        <div className={cn("mb-4 flex items-center transition-all duration-300 ease-in-out", collapsed ? "flex-col gap-3 px-2" : "justify-between px-6")}>
          {collapsed ? (
            <button
              type="button"
              onClick={handleLogoClick}
              aria-label="Refresh dashboard"
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-brand-600 text-white font-black text-lg"
            >
              X
            </button>
          ) : (
            <div className="min-w-0">
              <Logo onClick={handleLogoClick} />
              <span
                className={cn(
                  "inline-block rounded-full px-2.5 py-1 mt-2 text-[10px] font-bold tracking-wider uppercase border shadow-sm",
                  role === "client"
                    ? "border-blue-400 dark:border-blue-600 bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-200"
                    : role === "admin"
                    ? "border-violet-400 dark:border-violet-600 bg-violet-100 dark:bg-violet-900 text-violet-700 dark:text-violet-200"
                    : "border-emerald-400 dark:border-emerald-600 bg-emerald-100 dark:bg-emerald-900 text-emerald-700 dark:text-emerald-200"
                )}
              >
                {role === "client"
                  ? "Client Portal"
                  : role === "admin"
                  ? "Admin Control"
                  : "Freelancer Hub"}
              </span>
            </div>
          )}
          <button
            type="button"
            onClick={() => setCollapsed((c) => !c)}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            aria-pressed={collapsed}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-ink-500 dark:text-blue-300 hover:bg-surface-muted dark:hover:bg-blue-900 transition-colors"
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>

        {/* ── Scrollable Navigation ── */}
        <nav ref={navRef} onScroll={handleNavScroll} className="flex-1 overflow-y-auto px-4 py-2 space-y-5 scrollbar-thin select-none">
          {sections.map((section) => (
            <div key={section.title} className="space-y-1">
              {!collapsed && (
                <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-ink-400 dark:text-blue-300">
                  {section.title}
                </h3>
              )}
              <div className="space-y-0.5">
                {section.items.map((item) => {
                  const isActive = isItemActive(item.href);

                  return (
                    <Link
                      key={item.label}
                      to={item.href}
                      onMouseEnter={collapsed ? (e) => showTooltip(item.label, e.currentTarget) : undefined}
                      onMouseLeave={collapsed ? hideTooltip : undefined}
                      className={cn(
                        "group relative flex items-center rounded-xl text-xs font-semibold text-ink-600 dark:text-blue-300 transition-all duration-200 ease-out hover:bg-surface-muted dark:hover:bg-blue-900 hover:text-ink-900 dark:hover:text-blue-100",
                        collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2 hover:translate-x-0.5",
                        isActive &&
                          cn(
                            "bg-brand-50 dark:bg-gradient-to-r dark:from-blue-800 dark:to-purple-800 text-brand-700 dark:text-blue-50 font-bold shadow-sm dark:shadow-md",
                            !collapsed && "translate-x-0.5"
                          )
                      )}
                    >
                      {/* Active indicator bar — animates in/out with the selection */}
                      {!collapsed && (
                        <span
                          className={cn(
                            "absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full bg-brand-600 transition-all duration-200 ease-out",
                            isActive ? "scale-y-100 opacity-100" : "scale-y-0 opacity-0"
                          )}
                        />
                      )}
                      <item.icon
                        className={cn(
                          "h-4 w-4 shrink-0 transition-transform duration-200",
                          isActive ? "text-brand-600 scale-110" : "group-hover:scale-110"
                        )}
                      />
                      {!collapsed && <span className="truncate">{item.label}</span>}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </nav>

        {/* ── Logout Footer ── */}
        <div className={cn("border-t border-surface-border dark:border-blue-800 pt-4 mt-auto", collapsed ? "mx-2" : "mx-4")}>
          <button
            onClick={() => setLogoutModalOpen(true)}
            onMouseEnter={collapsed ? (e) => showTooltip("Logout Account", e.currentTarget) : undefined}
            onMouseLeave={collapsed ? hideTooltip : undefined}
            className={cn(
              "flex w-full items-center rounded-xl text-xs font-bold text-ink-500 dark:text-blue-300 hover:bg-red-100 dark:hover:bg-red-900 hover:text-danger transition-colors",
              collapsed ? "justify-center px-0 py-2.5" : "gap-2.5 px-3 py-2.5"
            )}
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {!collapsed && "Logout Account"}
          </button>
        </div>
      </aside>

      {/* ── Collapsed-mode nav tooltip — portaled so it's never clipped by the
          nav's scrollable container, and always mounted (opacity-toggled) so
          it fades in/out smoothly instead of popping. ── */}
      {collapsed &&
        createPortal(
          <div
            className={cn(
              "pointer-events-none fixed z-[100] -translate-y-1/2 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-[11px] font-semibold transition-opacity duration-150",
              tooltip ? "opacity-100" : "opacity-0"
            )}
            style={{
              top: tooltip?.top ?? -9999,
              left: tooltip?.left ?? -9999,
              backgroundColor: "#172554",
              color: "#ffffff",
              boxShadow: "0 4px 16px rgba(0,0,0,0.35)",
            }}
          >
            {tooltip?.label}
          </div>,
          document.body
        )}

      {/* ── Logout Confirmation Modal (portal) ── */}
      <LogoutConfirmModal
        isOpen={logoutModalOpen}
        onCancel={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        isLoading={isLoggingOut}
      />
    </>
  );
}
