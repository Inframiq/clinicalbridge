"use client";

import { AppShell } from "@/components/layout/app-shell";
import { internNavItems } from "@/lib/nav-config";
import { PLATFORM } from "@/lib/config/brand";

export default function InternLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navItems={internNavItems} rootLabel={PLATFORM.name} requiredRole="intern">
      {children}
    </AppShell>
  );
}
