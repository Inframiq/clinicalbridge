"use client";

import { Bell, CheckCircle2, Info, TriangleAlert, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/dashboard/empty-state";
import { useAppData } from "@/context/app-data-provider";
import { cn } from "@/lib/utils";
import type { AppNotification } from "@/types";

const typeMeta: Record<AppNotification["type"], { icon: typeof Info; className: string }> = {
  info: { icon: Info, className: "bg-info-muted text-info" },
  success: { icon: CheckCircle2, className: "bg-success-muted text-success" },
  warning: { icon: TriangleAlert, className: "bg-warning-muted text-warning" },
  danger: { icon: XCircle, className: "bg-danger-muted text-destructive" },
};

export default function LocumNotificationsPage() {
  const { notifications, markNotificationRead } = useAppData();
  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div>
      <PageHeader
        title="Notifications"
        description={`${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`}
      />

      {notifications.length === 0 ? (
        <EmptyState icon={Bell} title="You're all caught up" description="New opportunities and updates will appear here." />
      ) : (
        <div className="space-y-3">
          {notifications.map((notification) => {
            const meta = typeMeta[notification.type];
            const Icon = meta.icon;
            return (
              <Card key={notification.id} className={cn(!notification.read && "ring-1 ring-brand/30")}>
                <CardContent className="flex items-start gap-3">
                  <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", meta.className)}>
                    <Icon className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium text-foreground">{notification.title}</p>
                      <span className="shrink-0 text-xs text-muted-foreground">{notification.timestamp}</span>
                    </div>
                    <p className="text-sm text-muted-foreground">{notification.body}</p>
                  </div>
                  {!notification.read && (
                    <Button size="sm" variant="ghost" onClick={() => markNotificationRead(notification.id)}>
                      Mark as read
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
