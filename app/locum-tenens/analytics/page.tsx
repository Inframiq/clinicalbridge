"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  IndianRupee,
  Star,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table/data-table";
import { AnalyticsOverview } from "@/components/dashboard/analytics-overview";
import { ChartCard } from "@/components/dashboard/chart-card";
import { CategoryBarChart } from "@/components/dashboard/charts/category-bar-chart";
import { DonutChart } from "@/components/dashboard/charts/donut-chart";
import { TrendAreaChart } from "@/components/dashboard/charts/trend-area-chart";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Star as StarIcon } from "lucide-react";
import { useShifts } from "@/hooks/use-shifts";
import { useApplications } from "@/hooks/use-applications";
import { usePayments } from "@/hooks/use-payments";
import { useRatings } from "@/hooks/use-ratings";
import { useFacilities } from "@/hooks/use-facilities";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuthRole } from "@/context/auth-provider";
import { joinPostShiftRecords, type JoinedPostShiftRecord } from "@/lib/selectors";
import { formatCurrency, formatDate } from "@/lib/format";
import { shiftStatusMeta, applicationStatusMeta, payoutStatusMeta } from "@/lib/status";
import type { Shift, Application } from "@/types";

const specialtyColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const timeOfDayColors = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function timeOfDaySegment(startTime: string): string {
  const [time, period] = startTime.split(" ");
  const hour = Number(time.split(":")[0]);
  const hour24 = period === "PM" && hour !== 12 ? hour + 12 : period === "AM" && hour === 12 ? 0 : hour;
  if (hour24 < 12) return "Morning";
  if (hour24 < 17) return "Afternoon";
  if (hour24 < 21) return "Evening";
  return "Night";
}

export default function DoctorAnalyticsPage() {
  const { profile } = useAuthRole();
  const { doctors } = useDoctors();
  const myDoctor = doctors.find((d) => d.profileId === profile?.id);
  const myDoctorId = myDoctor?.id;
  const { shifts } = useShifts();
  const { applications } = useApplications();
  const { payments } = usePayments();
  const { ratings } = useRatings();
  const { facilities } = useFacilities();

  const myShifts = shifts.filter((s) => s.assignedDoctorId === myDoctorId);
  const myApplications = applications.filter((a) => a.doctorId === myDoctorId);
  const myPayments = joinPostShiftRecords(payments.filter((p) => p.doctorId === myDoctorId), shifts);
  const myRatingsReceived = ratings.filter((r) => r.direction === "hospital_to_doctor" && r.doctorId === myDoctorId);

  const totalHours = myPayments.reduce((sum, p) => sum + p.hours, 0);
  const totalEarnings = myPayments.reduce((sum, p) => sum + p.netPayout, 0);
  const facilitiesWorked = new Set(myShifts.map((s) => s.facilityId)).size;

  const earningsSeries = Object.values(
    myPayments.reduce<Record<string, { date: string; earnings: number; hours: number }>>((acc, p) => {
      const date = p.submittedAt.slice(0, 10);
      acc[date] ??= { date, earnings: 0, hours: 0 };
      acc[date].earnings += p.netPayout;
      acc[date].hours += p.hours;
      return acc;
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));

  const departmentBreakdown = Object.entries(
    myShifts.reduce<Record<string, number>>((acc, s) => {
      acc[s.department] = (acc[s.department] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([label, value], i) => ({
    label,
    value,
    color: specialtyColors[i % specialtyColors.length],
  }));

  const dayOfWeekCounts = new Array(7).fill(0);
  for (const s of myShifts) dayOfWeekCounts[new Date(s.date).getDay()] += 1;
  const dayOfWeekBreakdown = DAY_NAMES.map((day, i) => ({ day, shifts: dayOfWeekCounts[i] }));

  const timeOfDayBreakdown = Object.entries(
    myShifts.reduce<Record<string, number>>((acc, s) => {
      const segment = timeOfDaySegment(s.startTime);
      acc[segment] = (acc[segment] ?? 0) + 1;
      return acc;
    }, {})
  ).map(([label, value], i) => ({
    label,
    value,
    color: timeOfDayColors[i % timeOfDayColors.length],
  }));

  const topFacilities = Object.entries(
    myShifts.reduce<Record<string, { name: string; count: number }>>((acc, s) => {
      acc[s.facilityId] ??= { name: s.facilityName, count: 0 };
      acc[s.facilityId].count += 1;
      return acc;
    }, {})
  )
    .map(([id, v]) => ({ id, label: v.name, value: `${v.count} Shifts` }))
    .sort((a, b) => Number(b.value.split(" ")[0]) - Number(a.value.split(" ")[0]))
    .slice(0, 5);

  const shiftColumns: ColumnDef<Shift>[] = useMemo(
    () => [
      { accessorKey: "title", header: "Shift" },
      { accessorKey: "facilityName", header: "Facility" },
      { accessorKey: "date", header: "Date", cell: ({ row }: { row: { original: Shift } }) => formatDate(row.original.date) },
      {
        id: "status",
        header: "Status",
        cell: ({ row }: { row: { original: Shift } }) => {
          const meta = shiftStatusMeta[row.original.status];
          return <StatusBadge label={meta.label} tone={meta.tone} />;
        },
      },
    ],
    []
  );

  const earningsColumns: ColumnDef<JoinedPostShiftRecord>[] = useMemo(
    () => [
      { id: "shift", header: "Shift", accessorFn: (r: JoinedPostShiftRecord) => r.shift?.title ?? "", cell: ({ row }: { row: { original: JoinedPostShiftRecord } }) => row.original.shift?.title },
      { accessorKey: "hours", header: "Hours" },
      { accessorKey: "netPayout", header: "Payout", cell: ({ row }: { row: { original: JoinedPostShiftRecord } }) => formatCurrency(row.original.netPayout) },
      {
        id: "status",
        header: "Status",
        cell: ({ row }: { row: { original: JoinedPostShiftRecord } }) => {
          const meta = payoutStatusMeta[row.original.status];
          return <StatusBadge label={meta.label} tone={meta.tone} />;
        },
      },
    ],
    []
  );

  const applicationColumns: ColumnDef<Application>[] = useMemo(
    () => [
      {
        id: "shift",
        header: "Shift",
        accessorFn: (r: Application) => shifts.find((s) => s.id === r.shiftId)?.title ?? "",
      },
      { accessorKey: "matchScorePct", header: "Match Score", cell: ({ row }: { row: { original: Application } }) => `${row.original.matchScorePct}%` },
      {
        id: "status",
        header: "Status",
        cell: ({ row }: { row: { original: Application } }) => {
          const meta = applicationStatusMeta[row.original.status];
          return <StatusBadge label={meta.label} tone={meta.tone} />;
        },
      },
    ],
    [shifts]
  );

  return (
    <div>
      <PageHeader
        title="Analytics & Reports"
        description="Gain insights into your own shift, earnings, and rating history."
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalyticsOverview
            stats={[
              { label: "Total Shifts", value: String(myShifts.length), icon: CalendarCheck },
              { label: "Completed Shifts", value: String(myPayments.length), icon: CheckCircle2 },
              { label: "Total Hours", value: totalHours.toFixed(0), icon: Clock },
              { label: "Total Earnings", value: formatCurrency(totalEarnings, { decimals: false }), icon: IndianRupee },
              { label: "Average Rating", value: (myDoctor?.rating ?? 0).toFixed(1), icon: Star },
              { label: "Facilities Worked", value: String(facilitiesWorked), icon: Building2 },
            ]}
            earningsSeries={earningsSeries}
            specialtyBreakdown={departmentBreakdown}
            dayOfWeekBreakdown={dayOfWeekBreakdown}
            timeOfDayBreakdown={timeOfDayBreakdown}
            // Month-over-month performance trends and curated "insight" copy would
            // need historical snapshots this app doesn't collect yet - left empty
            // rather than showing fabricated numbers.
            performanceTrends={[]}
            topListTitle="Top Facilities"
            topList={topFacilities}
            insights={[]}
          />
        </TabsContent>

        <TabsContent value="shifts" className="mt-6">
          <DataTable columns={shiftColumns} data={myShifts} searchPlaceholder="Search shifts..." />
        </TabsContent>

        <TabsContent value="earnings" className="mt-6 space-y-6">
          <ChartCard title="Earnings Overview" description="All time">
            <TrendAreaChart
              data={earningsSeries}
              xKey="date"
              compactYAxis
              series={[
                { key: "earnings", label: "Earnings (INR)", color: "var(--chart-1)" },
                { key: "hours", label: "Hours Worked", color: "var(--chart-3)" },
              ]}
            />
          </ChartCard>
          <DataTable columns={earningsColumns} data={myPayments} searchPlaceholder="Search payments..." />
        </TabsContent>

        <TabsContent value="facilities" className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {facilities.map((f) => (
              <div key={f.id} className="flex items-center gap-3 rounded-xl border border-border p-4">
                <span className="flex size-9 items-center justify-center rounded-lg bg-brand-muted text-brand">
                  <Building2 className="size-4" />
                </span>
                <div>
                  <p className="text-sm font-medium text-foreground">{f.name}</p>
                  <p className="text-xs text-muted-foreground">{f.city}</p>
                </div>
              </div>
            ))}
            {facilities.length === 0 && (
              <EmptyState
                icon={Building2}
                title="No facilities yet"
                description="Facilities you've applied to or worked with will show up here."
                className="col-span-full border-none py-6"
              />
            )}
          </div>
        </TabsContent>

        <TabsContent value="applications" className="mt-6">
          <DataTable columns={applicationColumns} data={myApplications} searchPlaceholder="Search applications..." />
        </TabsContent>

        <TabsContent value="utilization" className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
          <ChartCard title="Shifts by Day of Week">
            <CategoryBarChart data={dayOfWeekBreakdown} xKey="day" valueKey="shifts" color="var(--chart-1)" height={280} />
          </ChartCard>
          <ChartCard title="Shifts by Time of Day">
            <DonutChart data={timeOfDayBreakdown} height={260} />
          </ChartCard>
        </TabsContent>

        <TabsContent value="quality" className="mt-6">
          <ChartCard title="Ratings You've Received">
            {myRatingsReceived.length === 0 ? (
              <EmptyState icon={StarIcon} title="No ratings yet" description="Hospitals rate you after each completed shift." />
            ) : (
              <ul className="divide-y divide-border">
                {myRatingsReceived.map((rating) => (
                  <li key={rating.id} className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{formatDate(rating.createdAt)}</p>
                      {rating.comment && <p className="text-xs text-muted-foreground italic">&quot;{rating.comment}&quot;</p>}
                    </div>
                    <p className="text-sm font-semibold text-foreground">{rating.overallScore.toFixed(1)} / 5</p>
                  </li>
                ))}
              </ul>
            )}
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
