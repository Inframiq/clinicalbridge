import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { initials } from "@/lib/format";
import { cn } from "@/lib/utils";

export function Person({
  name,
  subtitle,
  size = "md",
  className,
}: {
  name: string;
  subtitle?: string;
  size?: "sm" | "md";
  className?: string;
}) {
  const [first, ...rest] = name.replace(/^Dr\.\s*/, "").split(" ");
  const last = rest[rest.length - 1] ?? "";

  return (
    <div className={cn("flex min-w-0 items-center gap-2.5", className)}>
      <Avatar className={size === "sm" ? "size-7" : "size-9"}>
        <AvatarFallback className="bg-brand-muted text-xs font-semibold text-brand">
          {initials(first, last)}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <p className="truncate text-sm font-medium text-foreground">{name}</p>
        {subtitle && <p className="truncate text-xs text-muted-foreground">{subtitle}</p>}
      </div>
    </div>
  );
}
