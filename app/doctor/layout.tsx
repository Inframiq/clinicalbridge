"use client";

import { AppShell } from "@/components/layout/app-shell";
import { doctorNavItems } from "@/lib/nav-config";
import { PLATFORM } from "@/lib/config/brand";

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell navItems={doctorNavItems} rootLabel={PLATFORM.name} requiredRole="doctor">
      {children}
    </AppShell>
  );
}
