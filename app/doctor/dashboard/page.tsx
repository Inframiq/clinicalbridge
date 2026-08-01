"use client";

import Link from "next/link";
import { toast } from "sonner";
import { Activity, CalendarCheck, ClipboardList, DollarSign, Star } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { TrendAreaChart } from "@/components/dashboard/charts/trend-area-chart";
import { useShifts } from "@/hooks/use-shifts";
import { useApplications } from "@/hooks/use-applications";
import { currentDoctor } from "@/lib/mock-data/doctors";
import { earningsSeries } from "@/lib/mock-data/analytics";
import { formatCurrency, formatDate } from "@/lib/format";
import { shiftStatusMeta, applicationStatusMeta } from "@/lib/status";

export default function DoctorDashboardPage() {
  const { shifts } = useShifts();
  const { applications, applyToShift } = useApplications();

  const myApplications = applications.filter((a) => a.doctorId === currentDoctor.id);
  const myShiftIds = new Set(myApplications.map((a) => a.shiftId));
  const currentShift = shifts.find(
    (s) => s.assignedDoctorId === currentDoctor.id && s.status === "active"
  );
  const upcoming = shifts.filter(
    (s) => s.assignedDoctorId === currentDoctor.id && (s.status === "confirmed" || s.status === "pending")
  );
  const availableShifts = shifts
    .filter((s) => s.status === "open" && s.title === currentShift?.title)
    .concat(shifts.filter((s) => s.status === "open"))
    .filter((s, i, arr) => arr.findIndex((x) => x.id === s.id) === i)
    .filter((s) => !myShiftIds.has(s.id))
    .slice(0, 4);

  const thisWeekEarnings = earningsSeries[earningsSeries.length - 1]?.earnings ?? 0;

  return (
    <div>
      <PageHeader
        title={`Good morning, Dr. ${currentDoctor.lastName} 👋`}
        description="Here's what's on your schedule today."
        actions={
          <Button asChild>
            <Link href="/doctor/shift-hub">
              <Activity className="size-4" /> Go to Shift Hub
            </Link>
          </Button>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="This Week's Earnings"
          value={formatCurrency(thisWeekEarnings, { decimals: false })}
          icon={DollarSign}
          iconTone="success"
          delta={{ value: "+15%", positive: true }}
        />
        <StatCard label="Upcoming Shifts" value={String(upcoming.length + (currentShift ? 1 : 0))} icon={CalendarCheck} iconTone="brand" />
        <StatCard
          label="Applications Pending"
          value={String(myApplications.filter((a) => a.status === "in_review").length)}
          icon={ClipboardList}
          iconTone="warning"
        />
        <StatCard label="Rating" value={currentDoctor.rating.toFixed(1)} icon={Star} iconTone="info" helpText={`${currentDoctor.reviewCount} reviews`} />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard title="Available Shifts For You" description="Matched to your specialty" viewAllHref="/doctor/my-shifts" className="lg:col-span-2">
          <ul className="divide-y divide-border">
            {availableShifts.length === 0 && (
              <p className="py-4 text-sm text-muted-foreground">No new shifts available right now.</p>
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
                  onClick={() => {
                    applyToShift(shift.id, currentDoctor.id);
                    toast.success(`Applied to ${shift.title}`);
                  }}
                >
                  Apply
                </Button>
              </li>
            ))}
          </ul>
        </ChartCard>

        <ChartCard title="My Applications" viewAllHref="/doctor/applications">
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
              <p className="text-sm text-muted-foreground">No applications yet.</p>
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
            series={[{ key: "earnings", label: "Earnings (USD)", color: "var(--chart-1)" }]}
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
              <p className="text-sm text-muted-foreground">No upcoming shifts scheduled.</p>
            )}
          </ul>
        </ChartCard>
      </div>
    </div>
  );
}
