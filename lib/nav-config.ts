import type { LucideIcon } from "lucide-react";
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
  { label: "Settings", href: "/hospital/settings", icon: Settings },
];

export const workingDoctorNavItems: NavItem[] = [
  { label: "Dashboard", href: "/working-doctor/dashboard", icon: LayoutDashboard },
  { label: "My Schedule", href: "/working-doctor/schedule", icon: CalendarDays },
  { label: "Replacement Requests", href: "/working-doctor/replacement-requests", icon: RefreshCw },
  { label: "Settings", href: "/working-doctor/settings", icon: Settings },
];

export const locumNavItems: NavItem[] = [
  { label: "Dashboard", href: "/locum/dashboard", icon: LayoutDashboard },
  { label: "Marketplace", href: "/locum/marketplace", icon: Store },
  { label: "Shift Hub", href: "/locum/shift-hub", icon: Activity },
  { label: "My Shifts", href: "/locum/my-shifts", icon: CalendarCheck },
  { label: "Applications", href: "/locum/applications", icon: ClipboardList },
  { label: "My Schedule", href: "/locum/my-schedule", icon: CalendarDays },
  { label: "Post-Shift", href: "/locum/post-shift", icon: ClipboardCheck },
  { label: "Earnings", href: "/locum/earnings", icon: DollarSign },
  { label: "Ratings", href: "/locum/ratings", icon: Star },
  { label: "Analytics & Reports", href: "/locum/analytics", icon: BarChart3 },
  { label: "Wallet & Payouts", href: "/locum/wallet-payouts", icon: Wallet },
  { label: "Documents", href: "/locum/documents", icon: FileText },
  { label: "Messages", href: "/locum/messages", icon: MessageSquare },
  { label: "Notifications", href: "/locum/notifications", icon: Bell },
  { label: "Settings", href: "/locum/settings", icon: Settings },
];

export const internNavItems: NavItem[] = [
  { label: "Dashboard", href: "/intern/dashboard", icon: LayoutDashboard },
  { label: "Opportunities", href: "/intern/opportunities", icon: Store },
  { label: "My Assignments", href: "/intern/my-assignments", icon: CalendarCheck },
  { label: "Applications", href: "/intern/applications", icon: ClipboardList },
  { label: "Calendar", href: "/intern/calendar", icon: CalendarDays },
  { label: "Settings", href: "/intern/settings", icon: Settings },
];

export const superAdminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/super-admin/dashboard", icon: LayoutDashboard },
  { label: "Hospital Verification", href: "/super-admin/hospitals", icon: Building2 },
  { label: "Doctor Verification", href: "/super-admin/doctors", icon: Users },
  { label: "Analytics", href: "/super-admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/super-admin/settings", icon: Settings },
];
