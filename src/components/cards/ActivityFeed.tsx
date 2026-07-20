import { FileText, DollarSign, Star, Mail } from "lucide-react";
import type { ActivityItem } from "@/types";
import { cn } from "@/utils/cn";

const iconMap = {
  proposal: { icon: FileText, tone: "bg-brand-100 text-brand-600" },
  payment: { icon: DollarSign, tone: "bg-emerald-100 text-emerald-600" },
  review: { icon: Star, tone: "bg-amber-100 text-amber-600" },
  message: { icon: Mail, tone: "bg-sky-100 text-sky-600" },
};

export function ActivityFeed({ items }: { items: ActivityItem[] }) {
  return (
    <ul className="space-y-5">
      {items.map((item) => {
        const conf = iconMap[item.icon];
        const Icon = conf.icon;
        return (
          <li key={item.id} className="flex gap-3">
            <span className={cn("mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full", conf.tone)}>
              <Icon className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-ink-900">{item.title}</p>
              <p className="mt-0.5 text-sm text-ink-500 line-clamp-2">{item.description}</p>
              <p className="mt-1 text-xs text-ink-400">{item.timestamp}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
