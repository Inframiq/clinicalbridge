"use client";

import { useRouter } from "next/navigation";
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
import type { NavItem } from "@/lib/nav-config";
import { ACTIVE_ORGANIZATION } from "@/lib/config/brand";
import { facilities } from "@/lib/mock-data/organizations";
import { useAuthRole } from "@/context/auth-provider";
import { useAppData } from "@/context/app-data-provider";
import { initials } from "@/lib/format";

export function Topbar({
  navItems,
  rootLabel,
}: {
  navItems: NavItem[];
  rootLabel: string;
}) {
  const router = useRouter();
  const { name, title, logout } = useAuthRole();
  const { notifications, markNotificationRead } = useAppData();
  const [mobileOpen, setMobileOpen] = useState(false);
  const unreadCount = notifications.filter((n) => !n.read).length;

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
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm" className="hidden gap-2 sm:flex">
              <Building2 className="size-4 text-muted-foreground" />
              <span className="max-w-[140px] truncate">{ACTIVE_ORGANIZATION.name}</span>
              <ChevronDown className="size-3.5 text-muted-foreground" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel>Switch organization</DropdownMenuLabel>
            <DropdownMenuSeparator />
            {facilities.map((f) => (
              <DropdownMenuItem key={f.id}>
                <Building2 className="size-4 text-muted-foreground" />
                <div className="flex flex-col">
                  <span>{f.name}</span>
                  <span className="text-xs text-muted-foreground">{f.city}</span>
                </div>
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="relative" aria-label="Messages">
              <MessageSquare className="size-[18px]" />
              <Badge className="absolute -top-1 -right-1 h-4 min-w-4 justify-center rounded-full p-0 text-[10px]">
                2
              </Badge>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-72">
            <DropdownMenuLabel>Messages</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem className="flex-col items-start gap-0.5">
              <span className="font-medium">Nurse Team</span>
              <span className="text-xs text-muted-foreground">
                &ldquo;New patient arriving in 10 mins&rdquo;
              </span>
            </DropdownMenuItem>
            <DropdownMenuItem className="flex-col items-start gap-0.5">
              <span className="font-medium">Front Desk</span>
              <span className="text-xs text-muted-foreground">
                Timesheet approved for May 25
              </span>
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
            <DropdownMenuItem>
              <User className="size-4" /> Profile
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Settings className="size-4" /> Settings
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
