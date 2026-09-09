import type { LucideIcon } from "lucide-react";
import { TrendingDown, TrendingUp } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string;
  icon: LucideIcon;
  iconTone?: "brand" | "success" | "warning" | "info" | "neutral";
  delta?: { value: string; positive: boolean };
  helpText?: string;
  className?: string;
}

const iconToneClassNames: Record<NonNullable<StatCardProps["iconTone"]>, string> = {
  brand: "bg-brand-muted text-brand",
  success: "bg-success-muted text-success",
  warning: "bg-warning-muted text-warning-foreground",
  info: "bg-info-muted text-info",
  neutral: "bg-muted text-muted-foreground",
};

export function StatCard({
  label,
  value,
  icon: Icon,
  iconTone = "brand",
  delta,
  helpText,
  className,
}: StatCardProps) {
  return (
    <Card className={cn("gap-0 py-5", className)}>
      <CardContent className="flex items-start justify-between gap-3 px-5">
        <div className="min-w-0">
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="mt-1.5 text-2xl font-semibold leading-tight tracking-tight text-foreground break-words">
            {value}
          </p>
          {(delta || helpText) && (
            <p className="mt-1.5 flex items-center gap-1 text-xs">
              {delta && (
                <span
                  className={cn(
                    "flex items-center gap-0.5 font-medium",
                    delta.positive ? "text-success" : "text-destructive"
                  )}
                >
                  {delta.positive ? (
                    <TrendingUp className="size-3" />
                  ) : (
                    <TrendingDown className="size-3" />
                  )}
                  {delta.value}
                </span>
              )}
              {helpText && <span className="text-muted-foreground">{helpText}</span>}
            </p>
          )}
        </div>
        <div className={cn("flex size-10 shrink-0 items-center justify-center rounded-xl", iconToneClassNames[iconTone])}>
          <Icon className="size-5" />
        </div>
      </CardContent>
    </Card>
  );
}
