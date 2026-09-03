"use client";

import { AppShell } from "@/components/layout/app-shell";
import { locumTenensNavItems } from "@/lib/nav-config";
import { PLATFORM } from "@/lib/config/brand";

export default function LocumTenensLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navItems={locumTenensNavItems} rootLabel={PLATFORM.name} requiredRole="locum_tenens">
      {children}
    </AppShell>
  );
}
