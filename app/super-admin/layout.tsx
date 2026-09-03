import { redirect } from "next/navigation";
import { AppShell } from "@/components/layout/app-shell";
import { superAdminNavItems } from "@/lib/nav-config";
import { PLATFORM } from "@/lib/config/brand";
import { ROLE_HOME } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { UserProfile } from "@/context/auth-provider";

const REQUIRED_ROLE = "super_admin" as const;

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialProfile: UserProfile | null = null;

  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .single();

    if (profile && profile.role !== REQUIRED_ROLE) {
      redirect(ROLE_HOME[profile.role as keyof typeof ROLE_HOME] ?? "/login");
    }
    initialProfile = (profile as UserProfile | null) ?? null;
  }

  return (
    <AppShell
      navItems={superAdminNavItems}
      rootLabel={PLATFORM.name}
      requiredRole={REQUIRED_ROLE}
      initialProfile={initialProfile}
    >
      {children}
    </AppShell>
  );
}
