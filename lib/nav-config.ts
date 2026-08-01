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
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

export const adminNavItems: NavItem[] = [
  { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
  { label: "Broadcast Shift", href: "/admin/broadcast-shift", icon: Radio },
  { label: "Active Shifts", href: "/admin/active-shifts", icon: Activity },
  { label: "Applications", href: "/admin/applications", icon: ClipboardList },
  { label: "Smart Matches", href: "/admin/smart-matches", icon: Sparkles },
  { label: "Post-Shift", href: "/admin/post-shift", icon: ClipboardCheck },
  { label: "Payments & Wallet", href: "/admin/payments-wallet", icon: Wallet },
  { label: "Ratings", href: "/admin/ratings", icon: Star },
  { label: "Analytics", href: "/admin/analytics", icon: BarChart3 },
  { label: "Settings", href: "/admin/settings", icon: Settings },
];

export const doctorNavItems: NavItem[] = [
  { label: "Dashboard", href: "/doctor/dashboard", icon: LayoutDashboard },
  { label: "Shift Hub", href: "/doctor/shift-hub", icon: Activity },
  { label: "My Shifts", href: "/doctor/my-shifts", icon: CalendarCheck },
  { label: "Applications", href: "/doctor/applications", icon: ClipboardList },
  { label: "My Schedule", href: "/doctor/my-schedule", icon: CalendarDays },
  { label: "Post-Shift", href: "/doctor/post-shift", icon: ClipboardCheck },
  { label: "Earnings", href: "/doctor/earnings", icon: DollarSign },
  { label: "Analytics & Reports", href: "/doctor/analytics", icon: BarChart3 },
  { label: "Wallet & Payouts", href: "/doctor/wallet-payouts", icon: Wallet },
  { label: "Documents", href: "/doctor/documents", icon: FileText },
  { label: "Messages", href: "/doctor/messages", icon: MessageSquare },
  { label: "Settings", href: "/doctor/settings", icon: Settings },
];
