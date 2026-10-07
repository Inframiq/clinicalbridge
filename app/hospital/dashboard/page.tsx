"use client";

import { useMemo } from "react";
import { formatDistance } from "date-fns";
import Link from "next/link";
import { AlertOctagon, Calendar, ClipboardList, Radio, Users, Wallet } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { Person } from "@/components/dashboard/person";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { TrendAreaChart } from "@/components/dashboard/charts/trend-area-chart";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { BroadcastShiftDialog } from "@/components/forms/broadcast-shift-dialog";
import { useShifts } from "@/hooks/use-shifts";
import { usePayments } from "@/hooks/use-payments";
import { useApplications } from "@/hooks/use-applications";
import { useDoctors } from "@/hooks/use-doctors";
import { useFacilities } from "@/hooks/use-facilities";
import { useAppData } from "@/context/app-data-provider";
import { useAuthRole } from "@/context/auth-provider";
import {
  computeEscrowBalance,
  getOpenShifts,
  getPendingApplications,
  getUpcomingShifts,
} from "@/lib/selectors";
import { formatCurrency, formatDate } from "@/lib/format";
import { shiftStatusMeta } from "@/lib/status";
import type { ActivityFeedItem, ApplicationStatus } from "@/types";

const applicationStatusLabels: Record<ApplicationStatus, string> = {
  accepted: "Accepted",
  in_review: "In Review",
  rejected: "Rejected",
  withdrawn: "Withdrawn",
};

const applicationStatusColors: Record<string, string> = {
  Accepted: "var(--success)",
  "In Review": "var(--info)",
  Rejected: "var(--destructive)",
  Withdrawn: "var(--muted-foreground)",
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export default function AdminDashboardPage() {
  const { shifts } = useShifts();
  const { payments } = usePayments();
  const { applications } = useApplications();
  const { doctors } = useDoctors();
  const { facilities } = useFacilities();
  const { notifications } = useAppData();
  const { name, profile } = useAuthRole();

  const myFacility = facilities.find((f) => f.profileId === profile?.id);

  const openShifts = getOpenShifts(shifts);
  const pendingApplications = getPendingApplications(applications);
  const escrowBalance = computeEscrowBalance(payments);
  const upcomingShifts = getUpcomingShifts(shifts).slice(0, 3);
  const activeDoctorCount = doctors.filter((d) => d.status === "active").length;
  const topRatedDoctors = [...doctors]
    .filter((d) => d.status === "active")
    .sort((a, b) => b.rating - a.rating)
    .slice(0, 3);

  const activityFeed = useMemo<ActivityFeedItem[]>(() => {
    const now = new Date();
    const applicationEvents: ActivityFeedItem[] = applications
      .slice()
      .sort((a, b) => new Date(b.appliedAt).getTime() - new Date(a.appliedAt).getTime())
      .slice(0, 5)
      .map((a) => {
        const doctor = doctors.find((d) => d.id === a.doctorId);
        const shift = shifts.find((s) => s.id === a.shiftId);
        return {
          id: `application-${a.id}`,
          actorName: doctor ? `Dr. ${doctor.firstName} ${doctor.lastName}` : "A doctor",
          action: `applied to ${shift?.title ?? "a shift"}`,
          timestamp: formatDistance(new Date(a.appliedAt), now, { addSuffix: true }),
          icon: "applied" as const,
        };
      });

    const completedShiftEvents: ActivityFeedItem[] = shifts
      .filter((s) => s.status === "completed")
      .slice(0, 5)
      .map((s) => ({
        id: `shift-${s.id}`,
        actorName: s.title,
        action: "was completed",
        timestamp: formatDate(s.date),
        icon: "completed" as const,
      }));

    return [...applicationEvents, ...completedShiftEvents].slice(0, 6);
  }, [applications, doctors, shifts]);

  const shiftOverviewSeries = useMemo(() => {
    const buckets = DAY_LABELS.map((day) => ({ day, openShifts: 0, filledShifts: 0 }));
    for (const shift of shifts) {
      const dayIndex = new Date(shift.date).getDay();
      if (Number.isNaN(dayIndex)) continue;
      if (shift.status === "open") buckets[dayIndex].openShifts += 1;
      else buckets[dayIndex].filledShifts += 1;
    }
    return buckets;
  }, [shifts]);

  const applicationStatusBreakdown = useMemo(() => {
    const counts: Record<ApplicationStatus, number> = {
      accepted: 0,
      in_review: 0,
      rejected: 0,
      withdrawn: 0,
    };
    for (const a of applications) counts[a.status] += 1;
    return (Object.keys(counts) as ApplicationStatus[])
      .filter((status) => counts[status] > 0)
      .map((status) => ({ status: applicationStatusLabels[status], count: counts[status] }));
  }, [applications]);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${name || "Admin"} 👋`}
        description={myFacility?.name ?? "Your hospital"}
        actions={
          <>
            <BroadcastShiftDialog
              trigger={
                <Button>
                  <Radio className="size-4" /> Instant Shift Broadcasting
                </Button>
              }
            />
            <Button variant="destructive" asChild>
              <Link href="/hospital/broadcast-shift">
                <AlertOctagon className="size-4" /> Code Red Emergency
              </Link>
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Open Shifts" value={String(openShifts.length)} icon={Calendar} iconTone="brand" />
        <StatCard
          label="Active Doctors"
          value={String(activeDoctorCount)}
          icon={Users}
          iconTone="success"
          helpText="On your roster"
        />
        <StatCard
          label="Pending Applications"
          value={String(pendingApplications.length)}
          icon={ClipboardList}
          iconTone="warning"
        />
        <StatCard
          label="Escrow Balance"
          value={formatCurrency(escrowBalance, { decimals: false })}
          icon={Wallet}
          iconTone="info"
          helpText="Available"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Live Activity" viewAllHref="/hospital/active-shifts">
          {activityFeed.length === 0 ? (
            <EmptyState icon={Calendar} title="No activity yet" description="Applications and completed shifts will show up here." className="border-none py-6" />
          ) : (
            <ActivityFeed items={activityFeed} />
          )}
        </ChartCard>

        <ChartCard
          title="Top Rated Doctors"
          description="Your highest-rated active doctors"
          viewAllHref="/hospital/smart-matches"
        >
          {topRatedDoctors.length === 0 ? (
            <EmptyState icon={Users} title="No doctors yet" description="Approved doctors will appear here." className="border-none py-6" />
          ) : (
            <ul className="space-y-4">
              {topRatedDoctors.map((doctor) => (
                <li key={doctor.id} className="flex items-center justify-between gap-3">
                  <Person name={`Dr. ${doctor.firstName} ${doctor.lastName}`} subtitle={doctor.specialty} />
                  <p className="text-xs text-muted-foreground">★ {doctor.rating.toFixed(1)} ({doctor.reviewCount})</p>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Upcoming Shifts" viewAllHref="/hospital/active-shifts">
          <ul className="space-y-4">
            {upcomingShifts.map((shift) => (
              <li key={shift.id} className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{shift.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {shift.department} · {formatDate(shift.date)}
                  </p>
                </div>
                <StatusBadge
                  label={shiftStatusMeta[shift.status].label}
                  tone={shiftStatusMeta[shift.status].tone}
                  dot={false}
                />
              </li>
            ))}
            {upcomingShifts.length === 0 && (
              <EmptyState
                icon={Calendar}
                title="No upcoming shifts"
                description="Shifts you broadcast will appear here."
                className="border-none py-6"
              />
            )}
          </ul>
        </ChartCard>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Shift Overview" description="By Day of Week" className="lg:col-span-2">
          <TrendAreaChart
            data={shiftOverviewSeries}
            xKey="day"
            series={[
              { key: "openShifts", label: "Open Shifts", color: "var(--chart-1)" },
              { key: "filledShifts", label: "Filled Shifts", color: "var(--chart-3)" },
            ]}
          />
        </ChartCard>

        <ChartCard title="Application Status">
          {applicationStatusBreakdown.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No applications yet" className="border-none py-6" />
          ) : (
            <DonutChart
              data={applicationStatusBreakdown.map((s) => ({
                label: s.status,
                value: s.count,
                color: applicationStatusColors[s.status],
              }))}
            />
          )}
        </ChartCard>
      </div>

      <div className="mt-6">
        <ChartCard title="System Announcements" viewAllHref="/hospital/settings">
          {notifications.length === 0 ? (
            <EmptyState icon={ClipboardList} title="No announcements" className="border-none py-6" />
          ) : (
            <ul className="divide-y divide-border">
              {notifications.map((n) => (
                <li key={n.id} className="flex items-start justify-between gap-4 py-3 first:pt-0 last:pb-0">
                  <div>
                    <p className="text-sm font-medium text-foreground">{n.title}</p>
                    <p className="mt-0.5 text-sm text-muted-foreground">{n.body}</p>
                  </div>
                  <span className="shrink-0 text-xs text-muted-foreground/80">{n.timestamp}</span>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
