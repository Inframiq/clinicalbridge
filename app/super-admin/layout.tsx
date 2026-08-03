"use client";

import { AppShell } from "@/components/layout/app-shell";
import { superAdminNavItems } from "@/lib/nav-config";
import { PLATFORM } from "@/lib/config/brand";

export default function SuperAdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navItems={superAdminNavItems} rootLabel={PLATFORM.name} requiredRole="super_admin">
      {children}
    </AppShell>
  );
}
