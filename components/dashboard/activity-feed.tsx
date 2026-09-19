import { CheckCircle2, ClipboardPlus, LogIn, Mail, UserPlus } from "lucide-react";
import type { ActivityFeedItem } from "@/types";
import { cn } from "@/lib/utils";

const iconMap: Record<ActivityFeedItem["icon"], { icon: typeof CheckCircle2; tone: string }> = {
  applied: { icon: ClipboardPlus, tone: "bg-info-muted text-info" },
  "checked-in": { icon: LogIn, tone: "bg-brand-muted text-brand" },
  completed: { icon: CheckCircle2, tone: "bg-success-muted text-success" },
  new: { icon: UserPlus, tone: "bg-warning-muted text-warning" },
  message: { icon: Mail, tone: "bg-muted text-muted-foreground" },
};

export function ActivityFeed({ items }: { items: ActivityFeedItem[] }) {
  return (
    <ul className="space-y-4">
      {items.map((item) => {
        const { icon: Icon, tone } = iconMap[item.icon];
        return (
          <li key={item.id} className="flex items-start gap-3">
            <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone)}>
              <Icon className="size-4" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-foreground">{item.actorName}</p>
              <p className="truncate text-xs text-muted-foreground">{item.action}</p>
            </div>
            <span className="shrink-0 text-xs text-muted-foreground/80">{item.timestamp}</span>
          </li>
        );
      })}
    </ul>
  );
}