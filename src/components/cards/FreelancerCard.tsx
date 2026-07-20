import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import type { FreelancerProfile } from "@/types";

export function FreelancerCard({ freelancer }: { freelancer: Pick<FreelancerProfile, "id" | "fullName" | "title" | "avatarUrl" | "rating" | "hourlyRate" | "expertise"> }) {
  return (
    <div className="rounded-2xl border border-surface-border bg-surface-card p-5 shadow-card">
      <div className="flex items-center gap-3">
        <Avatar src={freelancer.avatarUrl} name={freelancer.fullName} size="lg" online />
        <div>
          <p className="font-bold text-ink-900">{freelancer.fullName}</p>
          <p className="text-sm text-ink-500">{freelancer.title}</p>
          <span className="mt-1 flex items-center gap-1 text-xs font-semibold text-ink-700">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            {freelancer.rating.toFixed(1)}
          </span>
        </div>
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {freelancer.expertise.slice(0, 3).map((skill) => (
          <Badge key={skill} tone="neutral">
            {skill}
          </Badge>
        ))}
      </div>
      <div className="mt-4 flex items-center justify-between">
        <span className="font-bold text-ink-900">${freelancer.hourlyRate}/hr</span>
        <Link to="/profile">
          <Button size="sm" variant="outline">
            View Profile
          </Button>
        </Link>
      </div>
    </div>
  );
}
