"use client";

import * as React from "react";
import type { UserRole } from "@/types";
import { currentDoctor } from "@/lib/mock-data/doctors";
import { useLocalStorageState } from "@/hooks/use-local-storage-state";

interface AuthSession {
  role: UserRole | null;
  name: string;
  title: string;
}

interface AuthContextValue extends AuthSession {
  login: (role: UserRole) => void;
  logout: () => void;
}

const defaultSession: AuthSession = { role: null, name: "", title: "" };

const AuthContext = React.createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useLocalStorageState<AuthSession>(
    "lt-auth-session",
    defaultSession
  );

  const login = React.useCallback(
    (role: UserRole) => {
      if (role === "doctor") {
        setSession({
          role,
          name: `Dr. ${currentDoctor.firstName} ${currentDoctor.lastName}`,
          title: currentDoctor.specialty,
        });
      } else {
        setSession({ role, name: "Admin User", title: "Super Admin" });
      }
    },
    [setSession]
  );

  const logout = React.useCallback(() => {
    setSession(defaultSession);
  }, [setSession]);

  const value = React.useMemo(
    () => ({ ...session, login, logout }),
    [session, login, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthRole() {
  const ctx = React.useContext(AuthContext);
  if (!ctx) throw new Error("useAuthRole must be used within AuthProvider");
  return ctx;
}
