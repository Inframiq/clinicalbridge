"use client";

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
import { Badge } from "@/components/ui/badge";
import { useShifts } from "@/hooks/use-shifts";
import { usePayments } from "@/hooks/use-payments";
import { useApplications } from "@/hooks/use-applications";
import { useAuthRole } from "@/context/auth-provider";
import {
  computeEscrowBalance,
  getOpenShifts,
  getPendingApplications,
  getUpcomingShifts,
} from "@/lib/selectors";
import { doctors } from "@/lib/mock-data/doctors";
import { activityFeed, notifications } from "@/lib/mock-data/notifications";
import { shiftOverviewSeries, applicationStatusBreakdown } from "@/lib/mock-data/analytics";
import { formatCurrency, formatDate } from "@/lib/format";
import { shiftStatusMeta } from "@/lib/status";
import { ACTIVE_ORGANIZATION } from "@/lib/config/brand";

const applicationStatusColors: Record<string, string> = {
  Accepted: "var(--success)",
  "In Review": "var(--info)",
  Rejected: "var(--destructive)",
  Withdrawn: "var(--muted-foreground)",
};

export default function AdminDashboardPage() {
  const { shifts } = useShifts();
  const { payments } = usePayments();
  const { applications } = useApplications();
  const { name } = useAuthRole();

  const openShifts = getOpenShifts(shifts);
  const pendingApplications = getPendingApplications(applications);
  const escrowBalance = computeEscrowBalance(payments);
  const upcomingShifts = getUpcomingShifts(shifts).slice(0, 3);
  const topMatches = doctors.filter((d) => d.matchScore).slice(0, 3);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${name || "Admin"} 👋`}
        description={ACTIVE_ORGANIZATION.name}
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
        <StatCard
          label="Open Shifts"
          value={String(openShifts.length)}
          icon={Calendar}
          iconTone="brand"
          delta={{ value: "+2 from yesterday", positive: true }}
        />
        <StatCard
          label="Doctors Nearby"
          value={String(doctors.length * 8)}
          icon={Users}
          iconTone="success"
          helpText="Available now"
        />
        <StatCard
          label="Pending Applications"
          value={String(pendingApplications.length + 21)}
          icon={ClipboardList}
          iconTone="warning"
          delta={{ value: "+5 new", positive: true }}
        />
        <StatCard
          label="Escrow Balance"
          value={formatCurrency(escrowBalance + 22000, { decimals: false })}
          icon={Wallet}
          iconTone="info"
          helpText="Available"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Live Activity" viewAllHref="/hospital/active-shifts">
          <ActivityFeed items={activityFeed} />
        </ChartCard>

        <ChartCard
          title="AI Smart Matches (Top Picks)"
          description="Based on specialty, location & availability"
          viewAllHref="/hospital/smart-matches"
        >
          <ul className="space-y-4">
            {topMatches.map((doctor) => (
              <li key={doctor.id} className="flex items-center justify-between gap-3">
                <Person
                  name={`Dr. ${doctor.firstName} ${doctor.lastName}`}
                  subtitle={`${doctor.specialty} · ${doctor.distanceMiles} mi`}
                />
                <div className="text-right">
                  <Badge variant="secondary" className="bg-success-muted text-success">
                    {doctor.matchScore}% Match
                  </Badge>
                  <p className="mt-1 text-xs text-muted-foreground">★ {doctor.rating}</p>
                </div>
              </li>
            ))}
          </ul>
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
        <ChartCard title="Shift Overview" description="This Week" className="lg:col-span-2">
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
          <DonutChart
            data={applicationStatusBreakdown.map((s) => ({
              label: s.status,
              value: s.count,
              color: applicationStatusColors[s.status],
            }))}
          />
        </ChartCard>
      </div>

      <div className="mt-6">
        <ChartCard title="System Announcements" viewAllHref="/hospital/settings">
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
        </ChartCard>
      </div>
    </div>
  );
}
