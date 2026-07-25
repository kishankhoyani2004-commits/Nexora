import { useEffect } from "react";
import { FileText, Package, Flag, MessageSquare, Briefcase, CheckCheck, Bell, Loader2, Send } from "lucide-react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/context/AuthContext";
import { CLIENT_NAV, FREELANCER_NAV, ADMIN_NAV } from "@/constants/nav";
import { Button } from "@/components/ui/Button";
import { notificationService, type NotificationDto } from "@/services/notification.service";
import { connectSocket } from "@/lib/socket";
import { cn } from "@/utils/cn";

const iconMap: Record<string, typeof FileText> = {
  message: MessageSquare,
  file: FileText,
  milestone: Flag,
  task: Package,
  project: Briefcase,
  approval: CheckCheck,
  invitation: Send,
  general: Bell,
};

export default function Notifications() {
  const { user } = useAuth();
  const navItems = user?.role === "admin" ? ADMIN_NAV : user?.role === "client" ? CLIENT_NAV : FREELANCER_NAV;
  const queryClient = useQueryClient();

  const { data: res, isLoading } = useQuery({
    queryKey: ["notifications"],
    queryFn: () => notificationService.list(),
  });

  const notifications: NotificationDto[] = res?.data.data || [];

  // Live updates so a notification created while this page is open appears
  // immediately, without a manual refresh.
  useEffect(() => {
    const socket = connectSocket();
    const onNew = () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    };
    socket.on("notification:new", onNew);
    return () => {
      socket.off("notification:new", onNew);
    };
  }, [queryClient]);

  const markReadMutation = useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const markAllReadMutation = useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
      queryClient.invalidateQueries({ queryKey: ["notifications-unread-count"] });
    },
  });

  const handleClick = (n: NotificationDto) => {
    if (!n.read) markReadMutation.mutate(n.id);
    if (n.link) window.location.assign(n.link);
  };

  return (
    <DashboardLayout navItems={navItems} tagline="Freelance Hub" searchPlaceholder="Search notifications...">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">Notifications</h1>
        <Button
          variant="outline"
          size="sm"
          icon={<CheckCheck className="h-4 w-4" />}
          iconPosition="left"
          onClick={() => markAllReadMutation.mutate()}
          isLoading={markAllReadMutation.isPending}
          disabled={notifications.every((n) => n.read)}
        >
          Mark all as read
        </Button>
      </div>

      {isLoading ? (
        <div className="flex h-40 items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-brand-600" />
        </div>
      ) : notifications.length === 0 ? (
        <div className="rounded-3xl border border-surface-border bg-surface-card p-12 text-center text-ink-500">
          <Bell className="h-10 w-10 text-ink-300 mx-auto mb-3" />
          No notifications yet.
        </div>
      ) : (
        <div className="space-y-3">
          {notifications.map((item) => {
            const Icon = iconMap[item.type || "general"] || Bell;
            return (
              <button
                key={item.id}
                onClick={() => handleClick(item)}
                className={cn(
                  "flex w-full gap-4 rounded-2xl border p-5 text-left shadow-card transition-colors",
                  item.read
                    ? "border-surface-border bg-surface-card"
                    : "border-brand-200 bg-brand-50/40 hover:bg-brand-50"
                )}
              >
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                  <Icon className="h-5 w-5" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink-900">{item.title}</p>
                  <p className="text-sm text-ink-500">{item.message}</p>
                  <p className="mt-1 text-xs text-ink-400">
                    {new Date(item.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                  </p>
                </div>
                {!item.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-brand-600" />}
              </button>
            );
          })}
        </div>
      )}
    </DashboardLayout>
  );
}
