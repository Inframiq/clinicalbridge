"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Award,
  BarChart3,
  Building2,
  CalendarCheck,
  ClipboardList,
  Lightbulb,
  ShieldCheck,
  Star,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table/data-table";
import { AnalyticsOverview } from "@/components/dashboard/analytics-overview";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Person } from "@/components/dashboard/person";
import { useShifts } from "@/hooks/use-shifts";
import { useApplications } from "@/hooks/use-applications";
import { useDoctors } from "@/hooks/use-doctors";
import { useFacilities } from "@/hooks/use-facilities";
import { usePayments } from "@/hooks/use-payments";
import { useRatings } from "@/hooks/use-ratings";
import { formatDate } from "@/lib/format";
import { shiftStatusMeta, applicationStatusMeta } from "@/lib/status";
import { getDoctorName } from "@/lib/selectors";
import { startHour24, timeSegmentFor, dayOfWeekBuckets } from "@/lib/analytics-time";
import type { Doctor, Shift, Application } from "@/types";
import type { Facility } from "@/lib/supabase/services/facilities";

const specialtyColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const timeOfDayColors = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const TIME_SEGMENTS = ["Morning (6AM-12PM)", "Afternoon (12PM-6PM)", "Evening (6PM-12AM)", "Night (12AM-6AM)"];

export default function AdminAnalyticsPage() {
  const { shifts } = useShifts();
  const { applications } = useApplications();
  const { doctors } = useDoctors();
  const { facilities } = useFacilities();
  const { payments } = usePayments();
  const { ratings } = useRatings();

  const shiftColumns: ColumnDef<Shift>[] = useMemo(
    () => [
      { accessorKey: "title", header: "Shift" },
      { accessorKey: "department", header: "Department" },
      {
        accessorKey: "date",
        header: "Date",
        cell: ({ row }) => formatDate(row.original.date),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.status,
        cell: ({ row }) => {
          const meta = shiftStatusMeta[row.original.status];
          return <StatusBadge label={meta.label} tone={meta.tone} />;
        },
      },
    ],
    []
  );

  const providerColumns: ColumnDef<Doctor>[] = useMemo(
    () => [
      {
        id: "doctor",
        header: "Doctor",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ row }) => (
          <Person name={`Dr. ${row.original.firstName} ${row.original.lastName}`} subtitle={row.original.specialty} size="sm" />
        ),
      },
      { accessorKey: "rating", header: "Rating" },
      { accessorKey: "yearsOfExperience", header: "Experience" },
      { accessorKey: "employmentType", header: "Type" },
    ],
    []
  );

  const facilityColumns: ColumnDef<Facility>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Facility" },
      { accessorKey: "city", header: "Location" },
    ],
    []
  );

  const applicationColumns: ColumnDef<Application>[] = useMemo(
    () => [
      {
        id: "doctor",
        header: "Doctor",
        accessorFn: (row) => getDoctorName(doctors, row.doctorId),
      },
      {
        accessorKey: "matchScorePct",
        header: "Match Score",
        cell: ({ row }) => `${row.original.matchScorePct}%`,
      },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => {
          const meta = applicationStatusMeta[row.original.status];
          return <StatusBadge label={meta.label} tone={meta.tone} />;
        },
      },
    ],
    [doctors]
  );

  const earningsSeries = useMemo(() => {
    const byDate = new Map<string, { earnings: number; hours: number }>();
    for (const p of payments) {
      const date = formatDate(p.submittedAt);
      const entry = byDate.get(date) ?? { earnings: 0, hours: 0 };
      entry.earnings += p.grossPay;
      entry.hours += p.hours;
      byDate.set(date, entry);
    }
    return Array.from(byDate.entries())
      .sort((a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime())
      .map(([date, v]) => ({ date, earnings: v.earnings, hours: v.hours }));
  }, [payments]);

  const specialtyBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const d of doctors) counts.set(d.specialty, (counts.get(d.specialty) ?? 0) + 1);
    return Array.from(counts.entries()).map(([specialty, count], i) => ({
      label: specialty,
      value: count,
      color: specialtyColors[i % specialtyColors.length],
    }));
  }, [doctors]);

  const dayOfWeekBreakdown = useMemo(() => dayOfWeekBuckets(shifts.map((s) => s.date)), [shifts]);

  const timeOfDayBreakdown = useMemo(() => {
    const counts = [0, 0, 0, 0];
    for (const s of shifts) counts[timeSegmentFor(startHour24(s.startTime))] += 1;
    return TIME_SEGMENTS.map((label, i) => ({ label, value: counts[i], color: timeOfDayColors[i] }));
  }, [shifts]);

  const avgRating =
    doctors.length === 0 ? 0 : doctors.reduce((sum, d) => sum + d.rating, 0) / doctors.length;
  const completedShifts = shifts.filter((s) => s.status === "completed").length;
  const cancelledShifts = shifts.filter((s) => s.status === "cancelled").length;
  const completionRatePct =
    completedShifts + cancelledShifts === 0
      ? 0
      : (completedShifts / (completedShifts + cancelledShifts)) * 100;
  const fillRatePct = shifts.length === 0 ? 0 : ((shifts.length - shifts.filter((s) => s.status === "open").length) / shifts.length) * 100;

  const performanceTrends = useMemo(
    () => [
      { metric: "Completion Rate", thisMonth: `${completionRatePct.toFixed(1)}%`, lastMonth: "—", changePct: 0 },
      { metric: "Fill Rate", thisMonth: `${fillRatePct.toFixed(1)}%`, lastMonth: "—", changePct: 0 },
      { metric: "Average Doctor Rating", thisMonth: avgRating.toFixed(1), lastMonth: "—", changePct: 0 },
      { metric: "Ratings Submitted", thisMonth: String(ratings.length), lastMonth: "—", changePct: 0 },
    ],
    [completionRatePct, fillRatePct, avgRating, ratings.length]
  );

  const topFacilities = useMemo(() => {
    const counts = new Map<string, { name: string; count: number }>();
    for (const s of shifts) {
      const entry = counts.get(s.facilityId) ?? { name: s.facilityName, count: 0 };
      entry.count += 1;
      counts.set(s.facilityId, entry);
    }
    return Array.from(counts.entries())
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 5)
      .map(([id, v]) => ({ id, label: v.name, value: `${v.count} shifts` }));
  }, [shifts]);

  const verifiedDoctorCount = doctors.filter((d) => d.verified).length;

  return (
    <div>
      <PageHeader
        title="Analytics & Reports"
        description="Track performance, utilization, and platform metrics."
      />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="shifts">Shifts</TabsTrigger>
          <TabsTrigger value="providers">Providers</TabsTrigger>
          <TabsTrigger value="facilities">Facilities</TabsTrigger>
          <TabsTrigger value="applications">Applications</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalyticsOverview
            stats={[
              { label: "Total Shifts", value: String(shifts.length), icon: CalendarCheck },
              { label: "Providers", value: String(doctors.length), icon: Users },
              { label: "Facilities", value: String(facilities.length), icon: Building2 },
              { label: "Applications", value: String(applications.length), icon: ClipboardList },
              { label: "Avg. Rating", value: avgRating.toFixed(1), icon: Star },
              { label: "Fill Rate", value: `${fillRatePct.toFixed(1)}%`, icon: BarChart3 },
            ]}
            earningsSeries={earningsSeries}
            earningsLabel="Platform Volume"
            specialtyBreakdown={specialtyBreakdown}
            dayOfWeekBreakdown={dayOfWeekBreakdown}
            timeOfDayBreakdown={timeOfDayBreakdown}
            performanceTrends={performanceTrends}
            topListTitle="Top Facilities"
            topList={topFacilities}
            insights={[
              {
                icon: Lightbulb,
                title: "Fill Rate",
                description: `${fillRatePct.toFixed(1)}% of posted shifts have been filled.`,
                linkLabel: "View Shifts",
                href: "/hospital/active-shifts",
              },
              {
                icon: Award,
                title: "Top Facility",
                description: topFacilities[0]
                  ? `${topFacilities[0].label} has the highest shift volume.`
                  : "No shift volume yet.",
                linkLabel: "View Facilities",
                href: "#",
              },
              {
                icon: ShieldCheck,
                title: "Compliance",
                description: `${verifiedDoctorCount} of ${doctors.length} doctors have verified credentials.`,
                linkLabel: "View Providers",
                href: "/hospital/doctors",
              },
              {
                icon: BarChart3,
                title: "Applications",
                description: `${applications.length} applications received across all shifts.`,
                linkLabel: "View Applications",
                href: "/hospital/applications",
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="shifts" className="mt-6">
          <DataTable columns={shiftColumns} data={shifts} searchPlaceholder="Search shifts..." pageSize={8} />
        </TabsContent>
        <TabsContent value="providers" className="mt-6">
          <DataTable columns={providerColumns} data={doctors} searchPlaceholder="Search providers..." pageSize={8} />
        </TabsContent>
        <TabsContent value="facilities" className="mt-6">
          <DataTable columns={facilityColumns} data={facilities} searchPlaceholder="Search facilities..." pageSize={8} />
        </TabsContent>
        <TabsContent value="applications" className="mt-6">
          <DataTable columns={applicationColumns} data={applications} searchPlaceholder="Search applications..." pageSize={8} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
