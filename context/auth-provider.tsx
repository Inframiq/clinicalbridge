"use client";

import * as React from "react";
import type { UserRole } from "@/types";
import {
  currentLocumDoctor,
  currentWorkingDoctor,
  currentIntern,
} from "@/lib/mock-data/doctors";
import { currentFacility } from "@/lib/mock-data/organizations";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";
import { createClient } from "@/lib/supabase/client";
import type { User } from "@supabase/supabase-js";

export interface UserProfile {
  id: string;
  email: string;
  role: UserRole;
  full_name?: string;
  verified: boolean;
  completed_onboarding: boolean;
  verification_status: string; // 'Pending' | 'Submitted' | 'Under Review' | 'Needs Changes' | 'Rejected' | 'Approved'
}

interface AuthSession {
  role: UserRole | null;
  name: string;
  title: string;
  user: User | null;
  profile: UserProfile | null;
}

interface AuthContextValue extends AuthSession {
  login: (role: UserRole) => void;
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
  ) => Promise<{ error: Error | null; user: User | null; hasSession: boolean }>;
  signInWithOAuth: (provider: "google" | "azure") => Promise<{ error: Error | null }>;
  resendConfirmationEmail: (email: string) => Promise<{ error: Error | null }>;
  resetPasswordForEmail: (email: string) => Promise<{ error: Error | null }>;
  updatePassword: (password: string) => Promise<{ error: Error | null }>;
  refreshProfile: () => Promise<UserProfile | null>;
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
  const [loading, setLoading] = React.useState<boolean>(true);

  const supabase = React.useMemo(() => createClient(), []);

  const fetchProfile = React.useCallback(
    async (userId: string, userEmail?: string, userRole?: UserRole, fullName?: string): Promise<UserProfile | null> => {
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
          console.warn("Profile fetch warning:", error.message);
        }

        // If profile doesn't exist yet, insert a fallback profile record
        const fallbackRole = userRole || "locum_doctor";
        const fallbackEmail = userEmail || "";
        const fallbackName = fullName || fallbackEmail.split("@")[0] || "User";

        const { data: newProfile, error: insertError } = await supabase
          .from("profiles")
          .insert({
            id: userId,
            email: fallbackEmail,
            role: fallbackRole,
            full_name: fallbackName,
            verified: false,
            completed_onboarding: false,
            verification_status: "Pending",
          })
          .select("*")
          .single();

        if (!insertError && newProfile) {
          return newProfile as UserProfile;
        }
      } catch (e) {
        console.warn("Fetch profile exception:", e);
      }
      return null;
    },
    [supabase]
  );

  // Listen to Supabase Auth State Changes
  React.useEffect(() => {
    async function checkUser() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const profile = await fetchProfile(user.id, user.email, undefined, user.user_metadata?.full_name);
          const role = profile ? profile.role : (user.user_metadata?.role as UserRole) || "locum_doctor";

          setSession({
            user,
            role,
            profile,
            name: profile?.full_name || user.email?.split("@")[0] || "User",
            title: role.replace("_", " ").toUpperCase(),
          });
        }
      } catch (err) {
        console.warn("Supabase auth check notice:", err);
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
          const role = profile ? profile.role : (authUser.user_metadata?.role as UserRole) || "locum_doctor";

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

  const login = React.useCallback(
    (role: UserRole) => {
      const identityByRole: Record<UserRole, { name: string; title: string }> = {
        hospital: { name: currentFacility.name, title: "Hospital Administrator" },
        working_doctor: {
          name: `Dr. ${currentWorkingDoctor.firstName} ${currentWorkingDoctor.lastName}`,
          title: currentWorkingDoctor.specialty,
        },
        locum_doctor: {
          name: `Dr. ${currentLocumDoctor.firstName} ${currentLocumDoctor.lastName}`,
          title: currentLocumDoctor.specialty,
        },
        intern: {
          name: `Dr. ${currentIntern.firstName} ${currentIntern.lastName}`,
          title: `Intern — ${currentIntern.specialty}`,
        },
        super_admin: { name: "Platform Admin", title: "Super Admin" },
      };

      const mockProfile: UserProfile = {
        id: "mock-user-id",
        email: `${role}@clinicalbridge.com`,
        role,
        full_name: identityByRole[role].name,
        verified: true,
        completed_onboarding: true,
        verification_status: "Approved",
      };

      setSession({
        role,
        user: null,
        profile: mockProfile,
        ...identityByRole[role],
      });
    },
    [setSession]
  );

  const signInWithSupabase = React.useCallback(
    async (email: string, password: string, expectedRole?: UserRole) => {
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

          if (expectedRole && profile && profile.role !== expectedRole) {
            const roleLabels: Record<UserRole, string> = {
              hospital: "Hospital / Clinic",
              working_doctor: "Working Doctor",
              locum_doctor: "Locum Doctor",
              intern: "Intern",
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

          const role = profile?.role || expectedRole || "locum_doctor";
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
          console.error("Supabase Signup Error:", error);

          return {
            error,
            user: null,
            hasSession: false,
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
      await supabase.auth.signOut();
    } catch {
      // ignore
    }
    setSession(defaultSession);
  }, [supabase, setSession]);

  const value = React.useMemo(
    () => ({
      ...session,
      login,
      logout,
      signInWithSupabase,
      signUpWithSupabase,
      signInWithOAuth,
      resendConfirmationEmail,
      resetPasswordForEmail,
      updatePassword,
      refreshProfile,
      loading,
    }),
    [
      session,
      login,
      logout,
      signInWithSupabase,
      signUpWithSupabase,
      signInWithOAuth,
      resendConfirmationEmail,
      resetPasswordForEmail,
      updatePassword,
      refreshProfile,
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
