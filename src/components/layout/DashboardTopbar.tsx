import { Bell, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { SearchBar } from "@/components/ui/SearchBar";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { ROUTES } from "@/constants/routes";

interface DashboardTopbarProps {
  searchPlaceholder?: string;
  rightSlot?: ReactNode;
}

export function DashboardTopbar({ searchPlaceholder = "Search…", rightSlot }: DashboardTopbarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [query, setQuery] = useState("");

  const handleSearchSubmit = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && query.trim()) {
      navigate(`${ROUTES.JOBS}?q=${encodeURIComponent(query.trim())}`);
    }
  };

  return (
    <header className="flex h-20 shrink-0 items-center gap-4 border-b border-surface-border bg-surface-header px-8">
      <SearchBar
        placeholder={searchPlaceholder}
        containerClassName="max-w-md"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        onKeyDown={handleSearchSubmit}
      />
      <div className="ml-auto flex items-center gap-3">
        {rightSlot}
        <ThemeToggle />
        <button
          aria-label="Notifications"
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-ink-500 hover:bg-surface-muted"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-2.5 top-2.5 h-2 w-2 rounded-full bg-danger" />
        </button>
        <Link
          to={ROUTES.SETTINGS}
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-ink-500 hover:bg-surface-muted"
        >
          <Settings className="h-5 w-5" />
        </Link>
        <Link to={ROUTES.PROFILE} className="flex items-center gap-2.5 pl-1 hover:opacity-90 transition-opacity">
          <Avatar src={user?.avatar || user?.avatarUrl} name={user?.fullName || "User"} size="sm" />
          <span className="hidden text-sm font-bold text-ink-900 sm:inline-block pr-1">
            {user?.fullName ? user.fullName.split(" ")[0] : "User"}
          </span>
        </Link>
      </div>
    </header>
  );
}
