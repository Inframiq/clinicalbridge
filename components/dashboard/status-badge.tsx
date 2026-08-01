import { cn } from "@/lib/utils";
import { toneClassNames, toneDotClassNames, type StatusTone } from "@/lib/status";

export function StatusBadge({
  label,
  tone,
  className,
  dot = true,
}: {
  label: string;
  tone: StatusTone;
  className?: string;
  dot?: boolean;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium whitespace-nowrap",
        toneClassNames[tone],
        className
      )}
    >
      {dot && <span className={cn("size-1.5 rounded-full", toneDotClassNames[tone])} />}
      {label}
    </span>
  );
}
