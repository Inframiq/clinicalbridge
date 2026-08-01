import { Check, AlertTriangle } from "lucide-react";
import { cn } from "@/lib/utils";
import type { TimelineEvent } from "@/types";
import { timelineStatusMeta, toneDotClassNames } from "@/lib/status";

export function Timeline({ events, className }: { events: TimelineEvent[]; className?: string }) {
  return (
    <ol className={cn("relative space-y-6 pl-2", className)}>
      {events.map((event, idx) => {
        const meta = timelineStatusMeta[event.status];
        const isLast = idx === events.length - 1;
        return (
          <li key={event.id} className="relative flex gap-3">
            {!isLast && (
              <span
                className="absolute top-5 left-[9px] h-[calc(100%+0.5rem)] w-px bg-border"
                aria-hidden
              />
            )}
            <span
              className={cn(
                "z-10 mt-0.5 flex size-[18px] shrink-0 items-center justify-center rounded-full border-2 border-background",
                event.status === "done"
                  ? "bg-success text-success-foreground"
                  : event.status === "current"
                  ? "bg-brand text-brand-foreground"
                  : event.status === "alert"
                  ? "bg-destructive text-white"
                  : cn(toneDotClassNames[meta.tone], "opacity-40")
              )}
            >
              {event.status === "done" && <Check className="size-3" strokeWidth={3} />}
              {event.status === "alert" && <AlertTriangle className="size-3" strokeWidth={3} />}
            </span>
            <div className="min-w-0 flex-1 pb-0.5">
              <p
                className={cn(
                  "text-sm font-medium",
                  event.status === "upcoming" ? "text-muted-foreground" : "text-foreground"
                )}
              >
                {event.label}
              </p>
              {event.description && (
                <p className="mt-0.5 text-xs text-muted-foreground">{event.description}</p>
              )}
              <p className="mt-0.5 text-xs text-muted-foreground/80">{event.timestamp}</p>
            </div>
          </li>
        );
      })}
    </ol>
  );
}
