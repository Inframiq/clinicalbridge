"use client";

import { AppShell } from "@/components/layout/app-shell";
import { adminNavItems } from "@/lib/nav-config";
import { PLATFORM } from "@/lib/config/brand";

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navItems={adminNavItems} rootLabel={PLATFORM.name} requiredRole="admin">
      {children}
    </AppShell>
  );
}
