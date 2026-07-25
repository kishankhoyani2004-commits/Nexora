import { Bell, Settings } from "lucide-react";
import type { ReactNode } from "react";
import { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { useAuth } from "@/context/AuthContext";
import { notificationService } from "@/services/notification.service";
import { connectSocket } from "@/lib/socket";
import { ROUTES } from "@/constants/routes";

interface DashboardTopbarProps {
  searchPlaceholder?: string;
  rightSlot?: ReactNode;
}

export function DashboardTopbar({ rightSlot }: DashboardTopbarProps) {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: countRes } = useQuery({
    queryKey: ["notifications-unread-count"],
    queryFn: () => notificationService.unreadCount(),
    staleTime: 30_000,
  });

  const unreadCount = countRes?.data.data.count ?? 0;

  // Live push: any new notification (message, file, milestone, task,
  // project, approval) bumps the badge instantly instead of waiting on the
  // 30s poll.
  useEffect(() => {
    const socket = connectSocket();
    const onNewNotification = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    };
    socket.on("notification:new", onNewNotification);
    return () => {
      socket.off("notification:new", onNewNotification);
    };
  }, [queryClient]);

  return (
    <header className="flex h-20 shrink-0 items-center gap-4 border-b border-blue-200 dark:border-blue-900 bg-gradient-to-r from-blue-50 via-purple-50 to-blue-50 dark:from-blue-950 dark:via-purple-950 dark:to-blue-950 px-8 shadow-sm">
      <div className="ml-auto flex items-center gap-3">
        {rightSlot}
        <ThemeToggle />
        <button
          type="button"
          onClick={() => navigate(ROUTES.NOTIFICATIONS)}
          aria-label={unreadCount > 0 ? `Notifications (${unreadCount} unread)` : "Notifications"}
          className="relative flex h-10 w-10 items-center justify-center rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-danger px-1 text-[10px] font-bold text-white">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </button>
        <Link
          to={ROUTES.SETTINGS}
          aria-label="Settings"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-900 transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Link>
        <Link to={ROUTES.PROFILE} className="flex items-center gap-2.5 pl-1 hover:opacity-90 transition-opacity">
          <Avatar src={user?.avatar || user?.avatarUrl} name={user?.fullName || "User"} size="sm" />
          <span className="hidden text-sm font-bold text-blue-900 dark:text-blue-100 sm:inline-block pr-1">
            {user?.fullName ? user.fullName.split(" ")[0] : "User"}
          </span>
        </Link>
      </div>
    </header>
  );
}
