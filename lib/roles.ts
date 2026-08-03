import {
  Building2,
  Stethoscope,
  Briefcase,
  GraduationCap,
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
  locum_doctor: {
    value: "locum_doctor",
    label: "Locum Doctor",
    description: "Browse and apply to open shifts",
    icon: Briefcase,
    homeHref: "/locum/dashboard",
    signupHref: "/onboarding/locum",
  },
  intern: {
    value: "intern",
    label: "Intern",
    description: "View supervised replacement opportunities",
    icon: GraduationCap,
    homeHref: "/intern/dashboard",
    signupHref: "/onboarding/intern",
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
  "locum_doctor",
  "intern",
  "super_admin",
];

export const ROLE_HOME: Record<UserRole, string> = Object.fromEntries(
  ROLE_ORDER.map((role) => [role, ROLE_CONFIG[role].homeHref])
) as Record<UserRole, string>;
