"use client";

import { AppShell } from "@/components/layout/app-shell";
import { hospitalNavItems } from "@/lib/nav-config";
import { PLATFORM } from "@/lib/config/brand";

export default function HospitalLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navItems={hospitalNavItems} rootLabel={PLATFORM.name} requiredRole="hospital">
      {children}
    </AppShell>
  );
}
