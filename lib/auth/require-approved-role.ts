import { redirect } from "next/navigation";
import type { UserProfile } from "@/context/auth-provider";
import { ROLE_HOME, ROLE_ONBOARDING } from "@/lib/roles";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createClient } from "@/lib/supabase/server";
import type { UserRole } from "@/types";

/**
 * Server-side guard shared by every role layout. Confirms the signed-in
 * user's profile matches `requiredRole`, then applies the same
 * onboarding/verification-status decision tree login-form.tsx uses right
 * after sign-in (kept in sync with it deliberately - diverging would mean
 * a user could reach a status here that login just told them was fine, or
 * vice versa).
 *
 * Without this, RLS alone doesn't stop an unapproved account from reaching
 * its dashboard: RLS scopes rows by ownership, not by verification_status,
 * so a hospital or doctor sitting on "Submitted" could still fully use the
 * product just by navigating straight to the dashboard URL (bookmark, back
 * button, typed address) instead of going through login's redirect.
 */
export async function requireApprovedRole(requiredRole: UserRole): Promise<UserProfile | null> {
  // Fail closed. NEXT_PUBLIC_* are inlined at build time, so a build made
  // without them would otherwise skip this gate and expose every role section.
  if (!isSupabaseConfigured) {
    throw new Error(
      "Supabase is not configured: NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY must be set at build time."
    );
  }

  const supabase = await createClient();
  // Verified locally against the cached JWKS - no Auth server round trip.
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims.sub;
  if (!userId) redirect("/login");

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", userId).single();
  if (!profile) redirect("/login");

  if (profile.role !== requiredRole) {
    redirect(ROLE_HOME[profile.role as UserRole] ?? "/login");
  }

  if (requiredRole !== "super_admin") {
    const status = profile.verification_status as string | null;
    if (!profile.completed_onboarding || status === "Needs Changes") {
      redirect(ROLE_ONBOARDING[requiredRole]);
    } else if (status === "Submitted") {
      redirect("/verification/status?status=Submitted");
    } else if (status === "Under Review") {
      redirect("/verification/status?status=UnderReview");
    } else if (status === "Rejected") {
      redirect("/verification/status?status=Rejected");
    }
  }

  return profile as UserProfile;
}
