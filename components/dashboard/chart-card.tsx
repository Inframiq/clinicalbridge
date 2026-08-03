import Link from "next/link";
import { Card, CardAction, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function ChartCard({
  title,
  description,
  viewAllHref,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  viewAllHref?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Card className={cn("gap-4", className)}>
      <CardHeader>
        <CardTitle className="text-base font-semibold">{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
        {(actions || viewAllHref) && (
          <CardAction className="flex items-center gap-2">
            {actions}
            {viewAllHref && (
              <Link
                href={viewAllHref}
                className="text-sm font-medium text-brand hover:underline"
              >
                View all
              </Link>
            )}
          </CardAction>
        )}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  );
}
