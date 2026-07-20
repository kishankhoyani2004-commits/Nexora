import type { ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Bell, Settings, Download, LogOut } from "lucide-react";
import { ADMIN_NAV } from "@/constants/nav";
import { Avatar } from "@/components/ui/Avatar";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/constants/routes";
import { cn } from "@/utils/cn";

export function AdminLayout({ children, title, breadcrumb }: { children: ReactNode; title: string; breadcrumb?: string }) {
  const location = useLocation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen overflow-hidden bg-dark-bg text-dark-text">
      <aside className="flex w-64 shrink-0 flex-col border-r border-dark-border bg-dark-surface px-4 py-6">
        <div className="mb-6 flex items-center gap-2 px-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand-500 font-black text-white">
            N
          </span>
          <div>
            <p className="font-extrabold text-white">Nexora</p>
            <p className="text-[10px] uppercase tracking-wide text-dark-text-dim">Enterprise Control</p>
          </div>
        </div>
        <nav className="flex-1 space-y-1 overflow-y-auto scrollbar-thin">
          {ADMIN_NAV.map((item) => {
            const isActive = location.pathname === item.href;
            return (
              <Link
                key={item.label}
                to={item.href}
                className={cn(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium text-dark-text-dim transition-colors hover:bg-dark-surface-2",
                  isActive && "bg-brand-600 text-white"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                {item.label}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-3 border-t border-dark-border pt-4">
          <button className="flex w-full items-center justify-center gap-2 rounded-xl bg-brand-600 py-2.5 text-sm font-semibold text-white">
            <Download className="h-4 w-4" /> Generate Report
          </button>
          <div className="flex items-center gap-2.5 px-1">
            <Avatar src={user?.avatar || user?.avatarUrl} name={user?.fullName || "Admin"} size="sm" />
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
              <p className="text-[10px] uppercase tracking-wide text-dark-text-dim">Global Admin</p>
            </div>
            <button
              onClick={() => {
                logout();
                navigate(ROUTES.HOME);
              }}
              aria-label="Logout"
              className="ml-auto text-dark-text-dim hover:text-white"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col overflow-hidden">
        <header className="flex h-20 shrink-0 items-center gap-4 border-b border-dark-border bg-dark-surface px-8">
          <input
            placeholder="Search across enterprise data..."
            className="h-11 w-full max-w-md rounded-xl border border-dark-border bg-dark-surface-2 px-4 text-sm text-white placeholder:text-dark-text-dim outline-none"
          />
          <div className="ml-auto flex items-center gap-4">
            <span className="flex items-center gap-1.5 rounded-full bg-emerald-500/10 px-3 py-1.5 text-xs font-semibold text-emerald-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> NETWORK STABLE
            </span>
            <button aria-label="Notifications" className="relative text-dark-text-dim hover:text-white">
              <Bell className="h-5 w-5" />
              <span className="absolute -right-0.5 -top-0.5 h-2 w-2 rounded-full bg-danger" />
            </button>
            <Settings className="h-5 w-5 text-dark-text-dim hover:text-white" />
          </div>
        </header>
        <main className="flex-1 overflow-y-auto p-8">
          {breadcrumb && <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-dark-text-dim">{breadcrumb}</p>}
          <h1 className="mb-6 text-2xl font-extrabold text-white">{title}</h1>
          {children}
        </main>
      </div>
    </div>
  );
}
