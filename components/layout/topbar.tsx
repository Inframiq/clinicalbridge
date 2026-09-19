"use client";

import { useRouter } from "next/navigation";
import Link from "next/link";
import { useState } from "react";
import {
  Bell,
  Building2,
  ChevronDown,
  LogOut,
  MessageSquare,
  Menu,
  Settings,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import { Sidebar } from "@/components/layout/sidebar";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { ThemeToggle } from "@/components/layout/theme-toggle";
import type { NavItem } from "@/lib/nav-config";
import { useAuthRole } from "@/context/auth-provider";
import type { UserProfile } from "@/context/auth-provider";
import { useAppData } from "@/context/app-data-provider";
import { useMessages } from "@/context/messages-provider";
import { useFacilities } from "@/hooks/use-facilities";
import { initials } from "@/lib/format";

export function Topbar({
  navItems,
  rootLabel,
  initialProfile,
}: {
  navItems: NavItem[];
  rootLabel: string;
  /**
   * Server-resolved profile from the role layout. Used only as a display
   * fallback for the identity chip while the client `AuthProvider` is still
   * on its SSR-safe empty snapshot, so the avatar/name/title render on first
   * paint instead of flashing blank. The context always wins once populated.
   */
  initialProfile?: UserProfile | null;
}) {
  const router = useRouter();
  const { name: ctxName, title: ctxTitle, role: ctxRole, profile, logout } = useAuthRole();
  const name = ctxName || initialProfile?.full_name || "";
  const title =
    ctxTitle ||
    (initialProfile ? initialProfile.role.replace("_", " ").toUpperCase() : "");
  const role = ctxRole || initialProfile?.role;
  const { notifications, markNotificationRead } = useAppData();
  const { facilities } = useFacilities();
  const { threads, totalUnread } = useMessages();
  const [mobileOpen, setMobileOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;
  const myProfileId = profile?.id ?? initialProfile?.id;
  const myFacility = facilities.find((f) => f.profileId === myProfileId);
  const messagesHref =
    role === "hospital" ? "/hospital/messages" : role === "working_doctor" ? "/working-doctor/messages" : "/locum-tenens/messages";
  const settingsHref =
    role === "hospital"
      ? "/hospital/settings"
      : role === "working_doctor"
        ? "/working-doctor/settings"
        : role === "super_admin"
          ? "/super-admin/settings"
          : "/locum-tenens/settings";
  const profileHref =
    role === "hospital"
      ? "/hospital/profile"
      : role === "working_doctor"
        ? "/working-doctor/profile"
        : role === "super_admin"
          ? "/super-admin/profile"
          : "/locum-tenens/profile";

  const handleLogout = () => {
    logout();
    router.push("/login");
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 shrink-0 items-center gap-3 border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6">
      <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
        <SheetContent side="left" className="w-64 p-0">
          <SheetTitle className="sr-only">Navigation</SheetTitle>
          <Sidebar navItems={navItems} onNavigate={() => setMobileOpen(false)} />
        </SheetContent>
      </Sheet>
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={() => setMobileOpen(true)}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>

      <div className="hidden lg:block">
        <Breadcrumbs rootLabel={rootLabel} />
      </div>

      <div className="ml-auto flex items-center gap-1.5 sm:gap-2">
        {myFacility && (
          <span className="hidden items-center gap-2 rounded-md border border-input px-3 py-1.5 text-sm sm:flex">
            <Building2 className="size-4 text-muted-foreground" />
            <span className="max-w-[140px] truncate">{myFacility.name}</span>
          </span>
        )}

        <ThemeToggle />

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Messages">
              <MessageSquare className="size-[18px]" />
              {totalUnread > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full p-0 text-[10px]">
                  {totalUnread}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Messages</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {threads.length === 0 ? (
              <p className="p-2 text-xs text-muted-foreground">No conversations yet.</p>
            ) : (
              threads.slice(0, 5).map((t) => (
                <DropdownMenuItem key={t.id} asChild className="flex-col items-start gap-0.5">
                  <Link href={messagesHref}>
                    <span className="font-medium">{t.otherParticipantName}</span>
                  </Link>
                </DropdownMenuItem>
              ))
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={messagesHref} className="justify-center text-xs text-muted-foreground">
                View all messages
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Notifications">
              <Bell className="size-[18px]" />
              {unreadCount > 0 && (
                <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full p-0 text-[10px]">
                  {unreadCount}
                </Badge>
              )}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-80">
            <DropdownMenuLabel>Notifications</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {notifications.map((n) => (
              <DropdownMenuItem
                key={n.id}
                className="flex-col items-start gap-0.5"
                onClick={() => markNotificationRead(n.id)}
              >
                <div className="flex w-full items-center justify-between gap-2">
                  <span className="font-medium">{n.title}</span>
                  {!n.read && <span className="size-1.5 shrink-0 rounded-full bg-info" />}
                </div>
                <span className="text-xs text-muted-foreground">{n.body}</span>
                <span className="text-[11px] text-muted-foreground/70">{n.timestamp}</span>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-lg py-1 pl-1 pr-2 hover:bg-accent">
              <Avatar className="size-8">
                <AvatarFallback className="bg-brand-muted text-brand text-xs font-semibold">
                  {name ? initials(name.replace("Dr. ", "").split(" ")[0], name.split(" ").slice(-1)[0]) : "?"}
                </AvatarFallback>
              </Avatar>
              <span className="hidden flex-col items-start text-left sm:flex">
                <span className="text-sm font-medium leading-tight">{name}</span>
                <span className="text-xs leading-tight text-muted-foreground">{title}</span>
              </span>
              <ChevronDown className="hidden size-3.5 text-muted-foreground sm:block" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>My Account</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href={profileHref}>
                <User className="size-4" /> Profile
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href={settingsHref}>
                <Settings className="size-4" /> Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem variant="destructive" onClick={handleLogout}>
              <LogOut className="size-4" /> Log out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
