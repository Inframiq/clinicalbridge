import type { LucideIcon } from "lucide-react";
import type { UserRole } from "@/types";
import {
  LayoutDashboard,
  Radio,
  Activity,
  ClipboardList,
  Sparkles,
  ClipboardCheck,
  Wallet,
  Star,
  BarChart3,
  Settings,
  CalendarCheck,
  CalendarDays,
  DollarSign,
  FileText,
  MessageSquare,
  Building2,
  Users,
  RefreshCw,
  Store,
  Bell,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const hospitalNavItems: NavItem[] = [
  { label: "Dashboard", href: "/hospital/dashboard", icon: LayoutDashboard },
  { label: "Departments", href: "/hospital/departments", icon: Building2 },
  { label: "Doctor Management", href: "/hospital/doctors", icon: Users },
  { label: "Replacement Requests", href: "/hospital/replacement-requests", icon: RefreshCw },
  { label: "Broadcast Shift", href: "/hospital/broadcast-shift", icon: Radio },
  { label: "Shift Calendar", href: "/hospital/shift-calendar", icon: CalendarDays },
  { label: "Active Shifts", href: "/hospital/active-shifts", icon: Activity },
  { label: "Applications", href: "/hospital/applications", icon: ClipboardList },
  { label: "Smart Matches", href: "/hospital/smart-matches", icon: Sparkles },
  { label: "Post-Shift", href: "/hospital/post-shift", icon: ClipboardCheck },
  { label: "Payments & Wallet", href: "/hospital/payments-wallet", icon: Wallet },
  { label: "Ratings", href: "/hospital/ratings", icon: Star },
  { label: "Analytics", href: "/hospital/analytics", icon: BarChart3 },
  { label: "Messages", href: "/hospital/messages", icon: MessageSquare },
  { label: "Settings", href: "/hospital/settings", icon: Settings },
];

export const workingDoctorNavItems: NavItem[] = [
  { label: "Dashboard", href: "/working-doctor/dashboard", icon: LayoutDashboard },
  { label: "My Schedule", href: "/working-doctor/schedule", icon: CalendarDays },
  { label: "Replacement Requests", href: "/working-doctor/replacement-requests", icon: RefreshCw },
  { label: "Messages", href: "/working-doctor/messages", icon: MessageSquare },
  { label: "Settings", href: "/working-doctor/settings", icon: Settings },
];

export const locumTenensNavItems: NavItem[] = [
  { label: "Dashboard", href: "/locum-tenens/dashboard", icon: LayoutDashboard },
  { label: "Marketplace", href: "/locum-tenens/marketplace", icon: Store },
  { label: "Shift Hub", href: "/locum-tenens/shift-hub", icon: Activity },
  { label: "My Shifts", href: "/locum-tenens/my-shifts", icon: CalendarCheck },
  { label: "Applications", href: "/locum-tenens/applications", icon: ClipboardList },
  { label: "My Schedule", href: "/locum-tenens/my-schedule", icon: CalendarDays },
  { label: "Post-Shift", href: "/locum-tenens/post-shift", icon: ClipboardCheck },
  { label: "Earnings", href: "/locum-tenens/earnings", icon: DollarSign },
  { label: "Ratings", href: "/locum-tenens/ratings", icon: Star },
  { label: "Analytics & Reports", href: "/locum-tenens/analytics", icon: BarChart3 },
  { label: "Wallet & Payouts", href: "/locum-tenens/wallet-payouts", icon: Wallet },
  { label: "Documents", href: "/locum-tenens/documents", icon: FileText },
  { label: "Messages", href: "/locum-tenens/messages", icon: MessageSquare },
  { label: "Notifications", href: "/locum-tenens/notifications", icon: Bell },
  { label: "Settings", href: "/locum-tenens/settings", icon: Settings },
];

export const superAdminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
  { label: "Hospital Verification", href: "/super-admin/hospitals", icon: Building2 },
  { label: "Doctor Verification", href: "/super-admin/doctors", icon: Users },
  { label: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/super-admin/settings", icon: Settings },
];

/**
 * Nav items keyed by role. `NavItem.icon` is a lucide component reference, which
 * cannot cross the RSC → Client boundary — so the role layouts (async Server
 * Components) must NOT pass a nav array as a prop. They pass `requiredRole`
 * (a plain string) and the client `AppShell` looks the items up here.
 */
export const navItemsByRole: Record<UserRole, NavItem[]> = {
  hospital: hospitalNavItems,
  working_doctor: workingDoctorNavItems,
  locum_tenens: locumTenensNavItems,
  super_admin: superAdminNavItems,
};
