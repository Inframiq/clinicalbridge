"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Sidebar } from "@/components/layout/sidebar";
import { Topbar } from "@/components/layout/topbar";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { useHasMounted } from "@/hooks/use-has-mounted";
import { useAuthRole } from "@/context/auth-provider";
import type { UserProfile } from "@/context/auth-provider";
import { navItemsByRole } from "@/lib/nav-config";
import { ROLE_HOME } from "@/lib/roles";
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

// DEV-ONLY bypass: skips the login screen entirely so any /<role>/* section
// can be opened directly while building/testing. `NODE_ENV` is inlined at
// build time, so this branch (and the login/role-check it replaces) is
// dead-code-eliminated from production bundles — never ships live.
const DEV_BYPASS = process.env.NODE_ENV !== "production";

export function AppShell({
  rootLabel,
  requiredRole,
  initialProfile,
  children,
}: AppShellProps) {
  const router = useRouter();
  const { role, login } = useAuthRole();
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

  useEffect(() => {
    if (!mounted) return;
    if (role === requiredRole || initialProfile?.role === requiredRole) return;

    if (DEV_BYPASS) {
      // Auto sign-in as whichever role the current section needs, instead of
      // redirecting away — lets you deep-link into any admin/doctor page
      // during development without clicking through auth every time.
      login(requiredRole);
      return;
    }

    if (role !== null) {
      router.replace(ROLE_HOME[role]);
    } else {
      router.replace("/login");
    }
  }, [mounted, role, requiredRole, router, login, initialProfile]);

  // `initialProfile` is a plain prop with the same value on the server render
  // and the client's first pass, so short-circuiting on it keeps hydration
  // identical while skipping the blank shell for a server-verified session.
  if (initialProfile?.role !== requiredRole && (!mounted || role !== requiredRole)) {
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
