"use client";

import * as React from "react";
import type { UserRole } from "@/types";
import { useLocalStorageState, clearAllLocalStorageState } from "@/hooks/use-local-storage-state";
import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { reportSupabase } from "@/lib/supabase/log";
import { SELF_SERVE_ROLES } from "@/lib/roles";
import type { SupabaseClient, User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  phone?: string;
  avatar_url?: string;
  verified: boolean;
  completed_onboarding: boolean;
  verification_status: string; // 'Pending' | 'Submitted' | 'Under Review' | 'Needs Changes' | 'Rejected' | 'Approved'
  created_at?: string;
}

interface AuthSession {
  role: UserRole | null;
  name: string;
  title: string;
  user: User | null;
  profile: UserProfile | null;
}

interface AuthContextValue extends AuthSession {
  logout: () => Promise<void>;
  signInWithSupabase: (
    email: string,
    password: string,
    expectedRole?: UserRole
  ) => Promise<{ error: Error | null; profile: UserProfile | null }>;
  signUpWithSupabase: (
    email: string,
    password: string,
    role: UserRole,
    fullName: string
  ) => Promise<{
    error: Error | null;
    user: User | null;
    hasSession: boolean;
    isDuplicateEmail?: boolean;
  }>;
  signInWithOAuth: (provider: "google" | "azure") => Promise<{ error: Error | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<UserProfile | null>;
  updateAccountProfile: (patch: { full_name?: string; phone?: string }) => Promise<{ error: Error | null }>;
  loading: boolean;
}

const defaultSession: AuthSession = {
  role: null,
  name: "",
  title: "",
  user: null,
  profile: null,
};

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useLocalStorageState<AuthSession>(
    "lt-auth-session",
    defaultSession
  );
  // Offline mode has no async auth bootstrap, so there is nothing to wait for.
  const [loading, setLoading] = React.useState<boolean>(isSupabaseConfigured);

  const supabase = React.useMemo<SupabaseClient | null>(
    () => (isSupabaseConfigured ? createClient() : null),
    []
  );

  const fetchProfile = React.useCallback(
    async (userId: string, userEmail?: string, userRole?: UserRole, fullName?: string): Promise<UserProfile | null> => {
      if (!supabase) return null;
      try {
        const { data, error } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", userId)
          .maybeSingle();

        if (data) {
          return data as UserProfile;
        }

        if (error && error.code !== "PGRST116") {
          reportSupabase("auth.fetchProfile", error);
        }

        // If profile doesn't exist yet, insert a fallback profile record.
        // `userRole` traces back to `auth.users.user_metadata.role`, which the
        // signed-in user controls (it's whatever they sent at signup) - never
        // trust it for a privileged role. This mirrors the same allowlist the
        // `handle_new_user` DB trigger enforces server-side, so this client
        // fallback can't be used to insert a row the trigger would have refused.
        const fallbackRole =
          userRole && (SELF_SERVE_ROLES as string[]).includes(userRole) ? userRole : "locum_tenens";
        const fallbackEmail = userEmail || "";
        const fallbackName = fullName || fallbackEmail.split("@")[0] || "User";

        const { data: newProfile, error: upsertError } = await supabase
          .from("profiles")
          .upsert(
            {
              id: userId,
              email: fallbackEmail,
              role: fallbackRole,
              full_name: fallbackName,
              verified: false,
              completed_onboarding: false,
              verification_status: "Pending",
            },
            { onConflict: "id", ignoreDuplicates: true }
          )
          .select("*")
          .maybeSingle();

        if (!upsertError && newProfile) {
          return newProfile as UserProfile;
        }
      } catch (e) {
        reportSupabase("auth.fetchProfile", e);
      }
      return null;
    },
    [supabase]
  );

  // Listen to Supabase Auth State Changes
  React.useEffect(() => {
    if (!supabase) return;

    async function checkUser() {
      if (!supabase) return;
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await fetchProfile(user.id, user.email, undefined, user.user_metadata?.full_name);
          const role = profile ? profile.role : (user.user_metadata?.role as UserRole) || "locum_tenens";

          setSession({
            user,
            role,
            profile,
            name: profile?.full_name || user.email?.split("@")[0] || "User",
            title: role.replace("_", " ").toUpperCase(),
          });
        }
      } catch (err) {
        reportSupabase("auth.checkUser", err);
      } finally {
        setLoading(false);
      }
    }

    checkUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, authSession) => {
        const authUser = authSession?.user;
        if (authUser) {
          const profile = await fetchProfile(authUser.id, authUser.email, authUser.user_metadata?.role, authUser.user_metadata?.full_name);
          const role = profile ? profile.role : (authUser.user_metadata?.role as UserRole) || "locum_tenens";

          setSession({
            user: authUser,
            role,
            profile,
            name: profile?.full_name || authUser.email?.split("@")[0] || "User",
            title: role.replace("_", " ").toUpperCase(),
          });
        } else if (event === "SIGNED_OUT") {
          setSession(defaultSession);
        }
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, [supabase, setSession, fetchProfile]);

  const refreshProfile = React.useCallback(async () => {
    if (!supabase) return null;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;
    const profile = await fetchProfile(user.id, user.email);
    if (profile) {
      setSession((prev) => ({
        ...prev,
        user,
        role: profile.role,
        profile,
        name: profile.full_name || user.email?.split("@")[0] || prev.name,
      }));
    }
    return profile;
  }, [supabase, fetchProfile, setSession]);

  // Account-level fields only (full_name, phone) - the privileged-column guard
  // trigger on public.profiles (migration 012) rejects any attempt to change
  // role/verified/verification_status through a plain UPDATE, so this can't
  // be misused to self-approve or escalate.
  const updateAccountProfile = React.useCallback(
    async (patch: { full_name?: string; phone?: string }) => {
      if (!supabase) return { error: new Error("Supabase is not configured") };
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { error: new Error("Not signed in") };
      try {
        const { error } = await supabase.from("profiles").update(patch).eq("id", user.id);
        if (error) {
          reportSupabase("auth.updateAccountProfile", error);
          return { error: new Error(error.message) };
        }
        await refreshProfile();
        return { error: null };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        return { error };
      }
    },
    [supabase, refreshProfile]
  );

  const signInWithSupabase = React.useCallback(
    async (email: string, password: string, expectedRole?: UserRole) => {
      if (!supabase) {
        return { error: new Error("Supabase is not configured"), profile: null };
      }
      try {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) return { error, profile: null };

        if (data.user) {
          let profile = await fetchProfile(data.user.id, data.user.email);

          if (!profile && expectedRole) {
            profile = {
              id: data.user.id,
              email: data.user.email || email,
              role: expectedRole,
              verified: false,
              completed_onboarding: false,
              verification_status: "Pending",
            };
          }

          // The designated super-admin account has no dedicated login tile (see
          // login-form.tsx) - it signs in through whichever of the three regular
          // role tiles was clicked. Its real `profile.role` (set server-side,
          // never client-controlled) always wins over whatever tile was
          // selected, so skip the mismatch check in that one case.
          if (expectedRole && profile && profile.role !== expectedRole && profile.role !== "super_admin") {
            const roleLabels: Record<UserRole, string> = {
              hospital: "Hospital / Clinic",
              working_doctor: "Working Doctor",
              locum_tenens: "Locum Tenens",
              super_admin: "Super Admin",
            };
            const expectedLabel = roleLabels[expectedRole] || expectedRole;
            const storedLabel = roleLabels[profile.role] || profile.role;
            const roleMismatchError = new Error(
              `Selected role (${expectedLabel}) does not match your registered account role (${storedLabel}). Please select ${storedLabel} to log in.`
            );
            await supabase.auth.signOut();
            return { error: roleMismatchError, profile: null };
          }

          const role = profile?.role || expectedRole || "locum_tenens";
          setSession({
            user: data.user,
            role,
            profile,
            name: profile?.full_name || data.user.email || "User",
            title: role.replace("_", " ").toUpperCase(),
          });
          return { error: null, profile };
        }
        return { error: new Error("User sign-in returned no user object"), profile: null };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        return { error, profile: null };
      }
    },
    [supabase, setSession, fetchProfile]
  );

  const signUpWithSupabase = React.useCallback(
    async (email: string, password: string, role: UserRole, fullName: string) => {
      if (!supabase) {
        return { error: new Error("Supabase is not configured"), user: null, hasSession: false };
      }
      try {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              role,
              full_name: fullName,
            },
          },
        });

        if (error) {
          const isDuplicateEmail =
            (error as { code?: string }).code === "user_already_exists" ||
            (error as { status?: number }).status === 422 ||
            /already registered|already exists/i.test(error.message);

          // A duplicate-email signup is an expected, user-facing outcome - the form prompts
          // the visitor to log in instead, so it is not logged at all. Everything else goes
          // through reportSupabase, the single Supabase log path, which emits one formatted
          // warning string rather than a raw error object that Next.js would escalate to a
          // full-screen dev overlay.
          if (!isDuplicateEmail) {
            reportSupabase("auth.signUp", error);
          }

          return {
            error,
            user: null,
            hasSession: false,
            isDuplicateEmail,
          };
        }
        // The database trigger "on_auth_user_created" automatically creates the profile row
        // with the correct role, full_name, and verification status, bypassing RLS.

        // If email confirmation is enabled, signUp() returns a user but no session
        // until the user clicks the confirmation link in their email.
        if (data.user && data.session) {
          setSession((prev) => ({
            ...prev,
            user: data.user,
            role,
            name: fullName || data.user!.email?.split("@")[0] || "User",
            title: role.replace("_", " ").toUpperCase(),
          }));
        }

        return { error: null, user: data.user, hasSession: !!data.session };
      } catch (err: unknown) {
        const error = err instanceof Error ? err : new Error(String(err));
        return { error, user: null, hasSession: false };
      }
    },
    [supabase, setSession]
  );

  const signInWithOAuth = React.useCallback(
    async (provider: "google" | "azure") => {
      if (!supabase) return { error: new Error("Supabase is not configured") };
      try {
        const redirectUrl = `${window.location.origin}/login`;
        const { error } = await supabase.auth.signInWithOAuth({
          provider,
          options: {
            redirectTo: redirectUrl,
          },
        });
        return { error: error ? new Error(error.message) : null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [supabase]
  );

  const resendConfirmationEmail = React.useCallback(
    async (email: string) => {
      if (!supabase) return { error: new Error("Supabase is not configured") };
      try {
        const { error } = await supabase.auth.resend({ type: "signup", email });
        return { error: error ? new Error(error.message) : null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [supabase]
  );

  const resetPasswordForEmail = React.useCallback(
    async (email: string) => {
      if (!supabase) return { error: new Error("Supabase is not configured") };
      try {
        const redirectUrl = `${window.location.origin}/reset-password`;
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: redirectUrl,
        });
        return { error: error ? new Error(error.message) : null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [supabase]
  );

  const updatePassword = React.useCallback(
    async (password: string) => {
      if (!supabase) return { error: new Error("Supabase is not configured") };
      try {
        const { error } = await supabase.auth.updateUser({ password });
        return { error: error ? new Error(error.message) : null };
      } catch (err: unknown) {
        return { error: err instanceof Error ? err : new Error(String(err)) };
      }
    },
    [supabase]
  );

  const logout = React.useCallback(async () => {
    try {
      if (supabase) await supabase.auth.signOut();
    } catch {
      // ignore
    }
    clearAllLocalStorageState();
    setSession(defaultSession);
  }, [supabase, setSession]);

  const value = React.useMemo(
    () => ({
      ...session,
      logout,
      signInWithSupabase,
      signUpWithSupabase,
      signInWithOAuth,
      resendConfirmationEmail,
      resetPasswordForEmail,
      updatePassword,
      refreshProfile,
      updateAccountProfile,
      loading,
    }),
    [
      session,
      logout,
      signInWithSupabase,
      signUpWithSupabase,
      signInWithOAuth,
      resendConfirmationEmail,
      resetPasswordForEmail,
      updatePassword,
      refreshProfile,
      updateAccountProfile,
      loading,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthRole() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuthRole must be used within AuthProvider");
  return ctx;
}
