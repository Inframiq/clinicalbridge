import { Check } from "lucide-react";
import { cn } from "@/lib/utils";

export interface Step {
  label: string;
}

export function Stepper({
  steps,
  currentIndex,
  className,
}: {
  steps: Step[];
  currentIndex: number;
  className?: string;
}) {
  return (
    <ol className={cn("flex w-full items-start", className)}>
      {steps.map((step, idx) => {
        const isDone = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const isLast = idx === steps.length - 1;
        return (
          <li key={step.label} className={cn("flex items-start", !isLast && "flex-1")}>
            <div className="flex w-8 shrink-0 flex-col items-center gap-1.5 sm:w-20">
              <div
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                  isDone && "border-brand bg-brand text-brand-foreground",
                  isCurrent && "border-brand bg-brand-muted text-brand",
                  !isDone && !isCurrent && "border-border bg-background text-muted-foreground"
                )}
              >
                {isDone ? <Check className="size-4" strokeWidth={3} /> : idx + 1}
              </div>
              <span
                className={cn(
                  "hidden min-h-8 text-center text-xs leading-tight font-medium text-balance sm:block",
                  isCurrent ? "text-foreground" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {!isLast && (
              <div
                className={cn(
                  "mx-2 mt-4 h-0.5 flex-1 rounded-full transition-colors",
                  isDone ? "bg-brand" : "bg-border"
                )}
              />
            )}
          </li>
        );
      })}
    </ol>
  );
}
