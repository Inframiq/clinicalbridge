"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { useAuthRole } from "@/context/auth-provider";
import type { UserProfile } from "@/context/auth-provider";
import { navItemsByRole } from "@/lib/nav-config";
import { ROLE_HOME } from "@/lib/roles";
import { consumePendingToast } from "@/lib/pending-toast";
import type { UserRole } from "@/types";

interface AppShellProps {
  rootLabel: string;
  requiredRole: UserRole;
  /**
   * Profile resolved on the server by the role layout. When present and
   * matching `requiredRole`, the session is already verified server-side, so
   * the client gate below can render `children` on the very first pass —
   * no blank-shell flash, no redirect. Null in offline/unconfigured mode.
   */
  initialProfile?: UserProfile | null;
  children: React.ReactNode;
}

export function AppShell({
  rootLabel,
  requiredRole,
  initialProfile,
  children,
}: AppShellProps) {
  const router = useRouter();
  const { role } = useAuthRole();
  const [collapsed, setCollapsed] = useLocalStorageState("lt-sidebar-collapsed", false);

  // `NavItem.icon` is a lucide component reference and can't cross the
  // RSC → Client boundary, so the async server layouts pass `requiredRole`
  // (a string) instead of a nav array and we resolve it here on the client.
  const navItems = navItemsByRole[requiredRole];

  // `role` is backed by localStorage via useSyncExternalStore, which renders
  // the SSR-safe null snapshot on the very first client pass before
  // resyncing to the real session. Gate the redirect decision behind a mount
  // flag so that first pass doesn't get misread as "logged out" and bounce
  // a real, already-authenticated user back to /login on a hard navigation.
  const mounted = useHasMounted();

  // `initialProfile` is a plain prop with the same value on the server render
  // and the client's first pass, so short-circuiting on it keeps hydration
  // identical while skipping the blank shell for a server-verified session.
  const isAuthorized = initialProfile?.role === requiredRole || (mounted && role === requiredRole);

  useEffect(() => {
    if (!mounted) return;
    if (role === requiredRole || initialProfile?.role === requiredRole) return;

    if (role !== null) {
      router.replace(ROLE_HOME[role]);
    } else {
      router.replace("/login");
    }
  }, [mounted, role, requiredRole, router, initialProfile]);

  // Fires once this dashboard is actually the thing on screen - not when
  // login/signup called router.push, which only starts the navigation. A
  // toast queued by queuePendingToast (e.g. "Signed in successfully") sits
  // in sessionStorage until this runs, so it never appears mid-redirect.
  useEffect(() => {
    if (!isAuthorized) return;
    const pending = consumePendingToast();
    if (pending) toast[pending.type](pending.message);
  }, [isAuthorized]);

  if (!isAuthorized) {
    return <div className="flex h-dvh items-center justify-center bg-background" />;
  }

  return (
    <div className="flex h-dvh overflow-hidden bg-muted/40">
      <div className="hidden shrink-0 lg:block">
        <Sidebar navItems={navItems} collapsed={collapsed} onCollapsedChange={setCollapsed} />
      </div>
      <div className="flex min-w-0 flex-1 flex-col">
        <Topbar navItems={navItems} rootLabel={rootLabel} initialProfile={initialProfile} />
        <main className="flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:px-8">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
