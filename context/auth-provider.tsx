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
      setSession({ role, ...identityByRole[role] });
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
