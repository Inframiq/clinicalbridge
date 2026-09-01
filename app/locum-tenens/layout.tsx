"use client";

import { AppShell } from "@/components/layout/app-shell";
import { locumNavItems } from "@/lib/nav-config";
import { PLATFORM } from "@/lib/config/brand";

export default function LocumLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navItems={locumNavItems} rootLabel={PLATFORM.name} requiredRole="locum_doctor">
      {children}
    </AppShell>
  );
}
