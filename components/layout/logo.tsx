import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { PLATFORM } from "@/lib/config/brand";

export function Logo({
  collapsed = false,
  className,
  withTagline = false,
}: {
  collapsed?: boolean;
  className?: string;
  withTagline?: boolean;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
        <Plus className="size-5" strokeWidth={2.75} />
      </div>
      {!collapsed && (
        <div className="flex flex-col leading-none">
          <span className="text-[15px] font-semibold tracking-tight text-foreground">
            {PLATFORM.name}
          </span>
          {withTagline && (
            <span className="text-[11px] text-muted-foreground">{PLATFORM.tagline}</span>
          )}
        </div>
      )}
    </div>
  );
}
