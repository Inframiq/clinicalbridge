import {
  Building2,
  Stethoscope,
  Briefcase,
  ShieldCheck,
  type LucideIcon,
} from "lucide-react";
import type { UserRole } from "@/types";

export interface RoleConfig {
  value: UserRole;
  label: string;
  description: string;
  icon: LucideIcon;
  homeHref: string;
  /** Where the "Sign up" link on the login screen should send this role, if anywhere. */
  signupHref?: string;
}

export const ROLE_CONFIG: Record<UserRole, RoleConfig> = {
  hospital: {
    value: "hospital",
    label: "Hospital / Clinic",
    description: "Manage departments, staff and shifts",
    icon: Building2,
    homeHref: "/hospital/dashboard",
    signupHref: "/onboarding/hospital",
  },
  working_doctor: {
    value: "working_doctor",
    label: "Working Doctor",
    description: "View your schedule and request replacements",
    icon: Stethoscope,
    homeHref: "/working-doctor/dashboard",
  },
  locum_tenens: {
    value: "locum_tenens",
    label: "Locum Tenens",
    description: "Browse and apply to open shifts",
    icon: Briefcase,
    homeHref: "/locum-tenens/dashboard",
    signupHref: "/onboarding/locum-tenens",
  },
  super_admin: {
    value: "super_admin",
    label: "Super Admin",
    description: "Platform-wide verification and oversight",
    icon: ShieldCheck,
    homeHref: "/super-admin/dashboard",
  },
};

export const ROLE_ORDER: UserRole[] = [
  "hospital",
  "working_doctor",
  "locum_tenens",
  "super_admin",
];

/**
 * Roles a visitor may pick for themselves at signup. `super_admin` is
 * deliberately excluded — it must only ever be granted by an existing admin,
 * never self-selected. Use this (not `ROLE_ORDER`) anywhere a role comes from
 * user input (a signup form, a `?role=` query param) rather than from an
 * already-authenticated profile.
 */
export const SELF_SERVE_ROLES: UserRole[] = ROLE_ORDER.filter((r) => r !== "super_admin");

/**
 * The one email the `handle_new_user` DB trigger (migration 018) force-
 * assigns `super_admin` to, regardless of which self-serve role was
 * requested. Mirrored here only so the client can make an immediate,
 * network-free redirect decision right after signup - the actual role
 * assignment is enforced server-side and this constant has no authority
 * of its own.
 */
export const SUPER_ADMIN_EMAIL = "chitrothusanjita@gmail.com";

export const ROLE_HOME: Record<UserRole, string> = Object.fromEntries(
  ROLE_ORDER.map((role) => [role, ROLE_CONFIG[role].homeHref])
) as Record<UserRole, string>;

/** Where an account of this role goes to complete/resume onboarding. */
export const ROLE_ONBOARDING: Record<UserRole, string> = {
  hospital: "/onboarding/hospital",
  working_doctor: "/onboarding/working-doctor",
  locum_tenens: "/onboarding/locum-tenens",
  super_admin: "/super-admin/dashboard",
};
