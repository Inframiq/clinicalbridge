"use client";

import { AppShell } from "@/components/layout/app-shell";
import { workingDoctorNavItems } from "@/lib/nav-config";
import { PLATFORM } from "@/lib/config/brand";

export default function WorkingDoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <AppShell
      navItems={workingDoctorNavItems}
      rootLabel={PLATFORM.name}
      requiredRole="working_doctor"
    >
      {children}
    </AppShell>
  );
}
