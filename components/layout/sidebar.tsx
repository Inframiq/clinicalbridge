"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronsLeft, ChevronsRight, HeadphonesIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/layout/logo";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import type { NavItem } from "@/lib/nav-config";
import { PLATFORM } from "@/lib/config/brand";

interface SidebarProps {
  navItems: NavItem[];
  collapsed?: boolean;
  onCollapsedChange?: (collapsed: boolean) => void;
  onNavigate?: () => void;
  className?: string;
}

export function Sidebar({
  navItems,
  collapsed = false,
  onCollapsedChange,
  onNavigate,
  className,
}: SidebarProps) {
  const pathname = usePathname();

  return (
    <aside
      className={cn(
        "flex h-full flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200",
        collapsed ? "w-[76px]" : "w-64",
        className
      )}
    >
      <div
        className={cn(
          "flex h-16 shrink-0 items-center border-b border-sidebar-border px-4",
          collapsed && "justify-center px-0"
        )}
      >
        <Logo collapsed={collapsed} className="[&_span]:text-sidebar-foreground" />
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto px-3 py-4">
        {navItems.map((item) => {
          const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
          const Icon = item.icon;
          const link = (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "group flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                collapsed && "justify-center px-0",
                isActive
                  ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-sm"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              )}
            >
              <Icon className="size-[18px] shrink-0" strokeWidth={2} />
              {!collapsed && <span className="truncate">{item.label}</span>}
            </Link>
          );

          if (collapsed) {
            return (
              <Tooltip key={item.href}>
                <TooltipTrigger asChild>{link}</TooltipTrigger>
                <TooltipContent side="right">{item.label}</TooltipContent>
              </Tooltip>
            );
          }
          return link;
        })}
      </nav>

      <div className="shrink-0 border-t border-sidebar-border p-3">
        {!collapsed ? (
          <div className="rounded-xl bg-sidebar-accent/60 p-3.5">
            <div className="flex items-center gap-2 text-sm font-medium text-sidebar-foreground">
              <HeadphonesIcon className="size-4 text-sidebar-primary" />
              Need Help?
            </div>
            <p className="mt-1 text-xs text-sidebar-foreground/60">
              Our support team is here to help.
            </p>
            <p className="mt-2 truncate text-xs text-sidebar-foreground/70">
              {PLATFORM.supportEmail}
            </p>
            <p className="text-xs text-sidebar-foreground/70">{PLATFORM.supportPhone}</p>
            <Button size="sm" variant="secondary" className="mt-3 w-full">
              Contact Support
            </Button>
          </div>
        ) : (
          <Tooltip>
            <TooltipTrigger asChild>
              <Button size="icon" variant="secondary" className="mx-auto flex">
                <HeadphonesIcon className="size-4" />
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Contact Support</TooltipContent>
          </Tooltip>
        )}

        {onCollapsedChange && (
          <Button
            variant="ghost"
            size="sm"
            className="mt-2 w-full justify-center text-sidebar-foreground/60 hover:text-sidebar-foreground"
            onClick={() => onCollapsedChange(!collapsed)}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : (
              <>
                <ChevronsLeft className="size-4" />
                <span className="ml-1.5 text-xs">Collapse</span>
              </>
            )}
          </Button>
        )}
      </div>
    </aside>
  );
}
