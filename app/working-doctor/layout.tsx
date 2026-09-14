import { AppShell } from "@/components/layout/app-shell";
import { PLATFORM } from "@/lib/config/brand";
import { requireApprovedRole } from "@/lib/auth/require-approved-role";

const REQUIRED_ROLE = "working_doctor" as const;

export default async function WorkingDoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const initialProfile = await requireApprovedRole(REQUIRED_ROLE);

  return (
    <AppShell
      rootLabel={PLATFORM.name}
      requiredRole={REQUIRED_ROLE}
      initialProfile={initialProfile}
    >
      {children}
    </AppShell>
  );
}
