import { FileText, DollarSign, Star, Mail, CheckCheck } from "lucide-react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { RECENT_ACTIVITY } from "@/constants/mockData";
import { useAuth } from "@/context/AuthContext";
import { CLIENT_NAV, FREELANCER_NAV, ADMIN_NAV } from "@/constants/nav";
import { Button } from "@/components/ui/Button";

const iconMap = { proposal: FileText, payment: DollarSign, review: Star, message: Mail };

export default function Notifications() {
  const { user } = useAuth();
  const navItems = user?.role === "admin" ? ADMIN_NAV : user?.role === "client" ? CLIENT_NAV : FREELANCER_NAV;

  return (
    <DashboardLayout navItems={navItems} tagline="Freelance Hub" searchPlaceholder="Search notifications...">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-extrabold text-ink-900">Notifications</h1>
        <Button variant="outline" size="sm" icon={<CheckCheck className="h-4 w-4" />} iconPosition="left">
          Mark all as read
        </Button>
      </div>
      <div className="space-y-3">
        {RECENT_ACTIVITY.map((item) => {
          const Icon = iconMap[item.icon];
          return (
            <div key={item.id} className="flex gap-4 rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                <Icon className="h-5 w-5" />
              </span>
              <div>
                <p className="font-semibold text-ink-900">{item.title}</p>
                <p className="text-sm text-ink-500">{item.description}</p>
                <p className="mt-1 text-xs text-ink-400">{item.timestamp}</p>
              </div>
            </div>
          );
        })}
      </div>
    </DashboardLayout>
  );
}
