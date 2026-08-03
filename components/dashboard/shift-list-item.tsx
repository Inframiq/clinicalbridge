import { cn } from "@/lib/utils";
import { StatusBadge } from "@/components/dashboard/status-badge";
import type { Shift } from "@/types";
import { shiftStatusMeta } from "@/lib/status";
import { formatDate } from "@/lib/format";

export function ShiftListItem({
  shift,
  selected,
  onClick,
}: {
  shift: Shift;
  selected?: boolean;
  onClick?: () => void;
}) {
  const meta = shiftStatusMeta[shift.status];
  return (
    <button
      onClick={onClick}
      className={cn(
        "w-full rounded-xl border p-3.5 text-left transition-colors",
        selected ? "border-brand bg-brand-muted/40" : "border-border hover:bg-accent"
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-foreground">{shift.title}</p>
        {shift.codeRed ? (
          <StatusBadge label="Code Red" tone="danger" dot={false} />
        ) : (
          <StatusBadge label={meta.label} tone={meta.tone} dot={false} />
        )}
      </div>
      <p className="mt-1 text-xs text-muted-foreground">{shift.department}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {formatDate(shift.date)} · {shift.startTime} - {shift.endTime}
      </p>
    </button>
  );
}
