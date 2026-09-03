"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  BarChart3,
  Building2,
  CalendarCheck,
  CheckCircle2,
  Clock,
  FolderOpen,
  Heart,
  IndianRupee,
  Lightbulb,
  Star,
  Trophy,
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
import { Person } from "@/components/dashboard/person";
import { useShifts } from "@/hooks/use-shifts";
import { useApplications } from "@/hooks/use-applications";
import { usePayments } from "@/hooks/use-payments";
import { currentDoctor, doctors } from "@/lib/mock-data/doctors";
import { facilities } from "@/lib/mock-data/organizations";
import {
  earningsSeries,
  specialtyBreakdown,
  dayOfWeekBreakdown,
  timeOfDayBreakdown,
  performanceTrends,
  topFacilities,
} from "@/lib/mock-data/analytics";
import { joinPostShiftRecords, type JoinedPostShiftRecord } from "@/lib/selectors";
import { formatCurrency, formatDate, relativeDelta } from "@/lib/format";
import { shiftStatusMeta, applicationStatusMeta, payoutStatusMeta } from "@/lib/status";
import type { Shift, Application } from "@/types";

const specialtyColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const timeOfDayColors = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export default function DoctorAnalyticsPage() {
  const { shifts } = useShifts();
  const { applications } = useApplications();
  const { payments } = usePayments();

  const myShifts = shifts.filter((s) => s.assignedDoctorId === currentDoctor.id);
  const myApplications = applications.filter((a) => a.doctorId === currentDoctor.id);
  const myPayments = useMemo(
    () => joinPostShiftRecords(payments.filter((p) => p.doctorId === currentDoctor.id), shifts),
    [payments, shifts]
  );
  const colleagues = doctors.filter((d) => d.id !== currentDoctor.id);

  const totalHours = myPayments.reduce((sum, p) => sum + p.hours, 0);
  const totalEarnings = myPayments.reduce((sum, p) => sum + p.netPayout, 0);

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
        description="Gain insights into performance, utilization, and platform metrics."
      />

      <Tabs defaultValue="overview">
        <TabsList className="flex-wrap">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="earnings">Earnings</TabsTrigger>
          <TabsTrigger value="providers">Colleagues</TabsTrigger>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
          <TabsTrigger value="utilization">Utilization</TabsTrigger>
          <TabsTrigger value="quality">Quality</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalyticsOverview
            stats={[
              { label: "Total Shifts", value: String(myShifts.length || 28), icon: CalendarCheck },
              { label: "Completed Shifts", value: String(myPayments.length || 24), icon: CheckCircle2 },
              { label: "Total Hours", value: (totalHours || 192).toFixed(0), icon: Clock },
              { label: "Total Earnings", value: formatCurrency(totalEarnings || 9640, { decimals: false }), icon: IndianRupee },
              { label: "Average Rating", value: currentDoctor.rating.toFixed(1), icon: Star },
              { label: "Facilities Worked", value: String(facilities.length), icon: Building2 },
            ]}
            earningsSeries={earningsSeries}
            specialtyBreakdown={specialtyBreakdown.map((s, i) => ({
              label: s.specialty,
              value: s.count,
              color: specialtyColors[i % specialtyColors.length],
            }))}
            dayOfWeekBreakdown={dayOfWeekBreakdown}
            timeOfDayBreakdown={timeOfDayBreakdown.map((t, i) => ({
              label: t.segment,
              value: t.shifts,
              color: timeOfDayColors[i % timeOfDayColors.length],
            }))}
            performanceTrends={performanceTrends}
            topListTitle="Top Facilities"
            topList={topFacilities.map((f) => ({ id: f.id, label: f.name, value: `${f.shiftsWorked} Shifts` }))}
            insights={[
              { icon: Lightbulb, title: "Key Insight", description: "Your earnings are up 15% compared to last month.", linkLabel: "View Earnings Report", href: "/locum-tenens/earnings" },
              { icon: Trophy, title: "High Performer", description: "You are in the top 10% of providers by completion rate.", linkLabel: "View Leaderboard", href: "#" },
              { icon: BarChart3, title: "Utilization Tip", description: "Most of your shifts are in the afternoon. Consider more morning availability.", linkLabel: "View My Schedule", href: "/locum-tenens/my-schedule" },
              { icon: Heart, title: "Quality Score", description: "Your average rating is excellent! Keep up the great work.", linkLabel: "View Reviews", href: "/locum-tenens/analytics" },
              { icon: FolderOpen, title: "Report Center", description: "Access detailed reports and export data for analysis.", linkLabel: "Go to Report Center", href: "#" },
            ]}
          />
        </TabsContent>

        <TabsContent value="shifts" className="mt-6">
          <DataTable columns={shiftColumns} data={myShifts.length ? myShifts : shifts} searchPlaceholder="Search shifts..." />
        </TabsContent>

        <TabsContent value="earnings" className="mt-6 space-y-6">
          <ChartCard title="Earnings Overview" description="This Month">
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

        <TabsContent value="providers" className="mt-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {colleagues.map((doctor) => (
              <div key={doctor.id} className="rounded-xl border border-border p-4">
                <Person name={`Dr. ${doctor.firstName} ${doctor.lastName}`} subtitle={`${doctor.specialty} · ★ ${doctor.rating}`} />
              </div>
            ))}
          </div>
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
            <DonutChart
              data={timeOfDayBreakdown.map((t, i) => ({ label: t.segment, value: t.shifts, color: timeOfDayColors[i % timeOfDayColors.length] }))}
              height={260}
            />
          </ChartCard>
        </TabsContent>

        <TabsContent value="quality" className="mt-6">
          <ChartCard title="Performance Trends">
            <ul className="divide-y divide-border">
              {performanceTrends.map((p) => {
                const delta = relativeDelta(p.changePct);
                return (
                  <li key={p.metric} className="flex items-center justify-between gap-2 py-3 first:pt-0 last:pb-0">
                    <div>
                      <p className="text-sm font-medium text-foreground">{p.metric}</p>
                      <p className="text-xs text-muted-foreground">was {p.lastMonth}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-foreground">{p.thisMonth}</p>
                      <p className={delta.positive ? "text-xs text-success" : "text-xs text-destructive"}>{delta.label}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </ChartCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}
