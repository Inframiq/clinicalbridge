"use client";

import Link from "next/link";
import { toast } from "sonner";
import {
  Activity,
  Bell,
  CalendarCheck,
  ClipboardList,
  Clock3,
  IndianRupee,
  Star,
  Store,
  UserCheck,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TrendAreaChart } from "@/components/dashboard/charts/trend-area-chart";
import { useShifts } from "@/hooks/use-shifts";
import { useApplications } from "@/hooks/use-applications";
import { usePayments } from "@/hooks/use-payments";
import { useDoctors } from "@/hooks/use-doctors";
import { useAppData } from "@/context/app-data-provider";
import { useAuthRole } from "@/context/auth-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import { shiftStatusMeta, applicationStatusMeta } from "@/lib/status";
import type { Doctor } from "@/types";

function profileCompletionPct(myDoctor: Doctor | undefined) {
  if (!myDoctor) return 0;
  const checks = [
    !!myDoctor.firstName,
    !!myDoctor.email,
    !!myDoctor.phone,
    !!myDoctor.specialty,
    !!myDoctor.licenseNumber,
    !!myDoctor.licenseExpiry,
    myDoctor.preferredLocations.length > 0,
    !!(myDoctor.languages && myDoctor.languages.length > 0),
    !!myDoctor.replacementPreferences,
    !!myDoctor.verified,
  ];
  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}

export default function DoctorDashboardPage() {
  const { profile } = useAuthRole();
  const { doctors } = useDoctors();
  const myDoctor = doctors.find((d) => d.profileId === profile?.id);
  const myDoctorId = myDoctor?.id;
  const { shifts } = useShifts();
  const { applications, applyToShift } = useApplications();
  const { payments } = usePayments();
  const { notifications } = useAppData();

  const myApplications = applications.filter((a) => a.doctorId === myDoctorId);
  const myPayments = payments.filter((p) => p.doctorId === myDoctorId);
  const totalHoursWorked = myPayments.reduce((sum, p) => sum + p.hours, 0);
  const unreadNotifications = notifications.filter((n) => !n.read);
  const myShiftIds = new Set(myApplications.map((a) => a.shiftId));
  const currentShift = shifts.find(
    (s) => s.assignedDoctorId === myDoctorId && s.status === "active"
  );
  const upcoming = shifts.filter(
    (s) => s.assignedDoctorId === myDoctorId && (s.status === "confirmed" || s.status === "pending")
  );
  const availableShifts = shifts
    .filter((s) => s.status === "open" && s.title === currentShift?.title)
    .concat(shifts.filter((s) => s.status === "open"))
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
    .filter((s) => !myShiftIds.has(s.id))
    .slice(0, 4);

  const earningsSeries = Object.values(
    myPayments.reduce<Record<string, { date: string; earnings: number }>>((acc, p) => {
      const date = p.submittedAt.slice(0, 10);
      acc[date] ??= { date, earnings: 0 };
      acc[date].earnings += p.netPayout;
      return acc;
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));
  const thisWeekEarnings = earningsSeries[earningsSeries.length - 1]?.earnings ?? 0;

  return (
    <div>
      <PageHeader
        title={`Good morning${myDoctor ? `, Dr. ${myDoctor.lastName}` : ""} 👋`}
        description="Here's what's on your schedule today."
        actions={
          <Button asChild>
            <Link href="/locum-tenens/shift-hub">
              <Activity className="size-4" /> Go to Shift Hub
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This Week's Earnings"
          value={formatCurrency(thisWeekEarnings, { decimals: false })}
          icon={IndianRupee}
          iconTone="success"
        />
        <StatCard label="Upcoming Shifts" value={String(upcoming.length + (currentShift ? 1 : 0))} icon={CalendarCheck} iconTone="brand" />
        <StatCard
          label="Applications Pending"
          value={String(myApplications.filter((a) => a.status === "in_review").length)}
          icon={ClipboardList}
          iconTone="warning"
        />
        <StatCard label="Rating" value={(myDoctor?.rating ?? 0).toFixed(1)} icon={Star} iconTone="info" helpText={`${myDoctor?.reviewCount ?? 0} reviews`} />
      </div>

      <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Total Hours Worked" value={`${totalHoursWorked}h`} icon={Clock3} iconTone="neutral" />
        <StatCard
          label="Profile Completion"
          value={`${profileCompletionPct(myDoctor)}%`}
          icon={UserCheck}
          iconTone={profileCompletionPct(myDoctor) === 100 ? "success" : "warning"}
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Available Shifts For You" description="Matched to your specialty" viewAllHref="/locum-tenens/marketplace" className="lg:col-span-2">
          <ul className="divide-y divide-border">
            {availableShifts.length === 0 && (
              <EmptyState
                icon={Store}
                title="No new shifts available right now"
                description="Check back soon or browse the full Marketplace."
                className="border-none py-6"
              />
            )}
            {availableShifts.map((shift) => (
              <li key={shift.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{shift.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {shift.facilityName} · {formatDate(shift.date)} · {shift.startTime}–{shift.endTime} ·{" "}
                    {formatCurrency(shift.hourlyRate)}/hr
                  </p>
                </div>
                <Button
                  size="sm"
                  disabled={!myDoctorId}
                  onClick={() => {
                    if (!myDoctorId) return;
                    applyToShift(shift.id, myDoctorId);
                    toast.success(`Applied to ${shift.title}`);
                  }}
                >
                  Apply
                </Button>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard title="My Applications" viewAllHref="/locum-tenens/applications">
          <ul className="space-y-3">
            {myApplications.slice(0, 5).map((app) => {
              const shift = shifts.find((s) => s.id === app.shiftId);
              const meta = applicationStatusMeta[app.status];
              return (
                <li key={app.id} className="flex items-center justify-between gap-2">
                  <span className="truncate text-sm text-foreground">{shift?.title ?? "Shift"}</span>
                  <StatusBadge label={meta.label} tone={meta.tone} dot={false} />
                </li>
              );
            })}
            {myApplications.length === 0 && (
              <EmptyState
                icon={ClipboardList}
                title="No applications yet"
                description="Shifts you apply for will show up here."
                className="border-none py-6"
              />
            )}
          </ul>
        </ChartCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Earnings Trend" description="Last 30 days" className="lg:col-span-2">
          <TrendAreaChart
            data={earningsSeries}
            xKey="date"
            compactYAxis
            series={[{ key: "earnings", label: "Earnings (INR)", color: "var(--chart-1)" }]}
          />
        </ChartCard>

        <ChartCard title="Upcoming Shifts">
          <ul className="space-y-3">
            {(currentShift ? [currentShift, ...upcoming] : upcoming).map((shift) => (
              <li key={shift.id} className="flex items-center justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{shift.title}</p>
                  <p className="text-xs text-muted-foreground">{formatDate(shift.date)}</p>
                </div>
                <StatusBadge label={shiftStatusMeta[shift.status].label} tone={shiftStatusMeta[shift.status].tone} dot={false} />
              </li>
            ))}
            {!currentShift && upcoming.length === 0 && (
              <EmptyState
                icon={CalendarCheck}
                title="No upcoming shifts scheduled"
                description="Accepted shifts will appear here."
                className="border-none py-6"
              />
            )}
          </ul>
        </ChartCard>
      </div>

      <div className="mt-6">
        <ChartCard
          title="Notifications"
          description={`${unreadNotifications.length} unread`}
          viewAllHref="/locum-tenens/notifications"
        >
          <ul className="space-y-3">
            {notifications.slice(0, 3).map((n) => (
              <li key={n.id} className="flex items-start gap-2.5">
                <Bell className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate text-sm text-foreground">{n.title}</p>
                  <p className="truncate text-xs text-muted-foreground">{n.timestamp}</p>
                </div>
              </li>
            ))}
            {notifications.length === 0 && (
              <EmptyState
                icon={Bell}
                title="No notifications yet"
                description="Updates about your shifts and applications will show up here."
                className="border-none py-6"
              />
            )}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}
