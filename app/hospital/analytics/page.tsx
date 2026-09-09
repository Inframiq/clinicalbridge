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
import { doctors } from "@/lib/mock-data/doctors";
import { facilities } from "@/lib/mock-data/organizations";
import {
  earningsSeries,
  specialtyBreakdown,
  dayOfWeekBreakdown,
  timeOfDayBreakdown,
  performanceTrends,
  topFacilities,
} from "@/lib/mock-data/analytics";
import { formatDate } from "@/lib/format";
import { shiftStatusMeta, applicationStatusMeta } from "@/lib/status";
import { getDoctorName } from "@/lib/selectors";
import type { Doctor, Shift, Application } from "@/types";
import type { Facility } from "@/lib/mock-data/organizations";

const specialtyColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const timeOfDayColors = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

export default function AdminAnalyticsPage() {
  const { shifts } = useShifts();
  const { applications } = useApplications();

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
          <Person name={`Dr. ${row.original.firstName} ${row.original.lastName}`} subtitle={row.original.specialty} size="sm" className="max-w-[220px]" />
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
        accessorFn: (row) => getDoctorName(row.doctorId),
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
    []
  );

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
              { label: "Avg. Rating", value: "4.8", icon: Star },
              { label: "Fill Rate", value: "94.2%", icon: BarChart3 },
            ]}
            earningsSeries={earningsSeries}
            earningsLabel="Platform Volume"
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
            topList={topFacilities.map((f) => ({
              id: f.id,
              label: f.name,
              value: `${f.shiftsWorked} shifts`,
            }))}
            insights={[
              {
                icon: Lightbulb,
                title: "Key Insight",
                description: "Fill rate is up 4.2% compared to last month.",
                linkLabel: "View Report",
                href: "#",
              },
              {
                icon: Award,
                title: "Top Facility",
                description: "City Medical Center has the highest shift volume.",
                linkLabel: "View Facilities",
                href: "#",
              },
              {
                icon: ShieldCheck,
                title: "Compliance",
                description: "100% of active doctors have verified credentials.",
                linkLabel: "View Providers",
                href: "#",
              },
              {
                icon: BarChart3,
                title: "Report Center",
                description: "Access detailed reports and export data for analysis.",
                linkLabel: "Go to Report Center",
                href: "#",
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
