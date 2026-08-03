"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import {
  Award,
  Building2,
  CalendarCheck,
  ClipboardList,
  Lightbulb,
  RefreshCw,
  ShieldCheck,
  Users,
} from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table/data-table";
import { AnalyticsOverview } from "@/components/dashboard/analytics-overview";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Person } from "@/components/dashboard/person";
import { useShifts } from "@/hooks/use-shifts";
import { useDoctors } from "@/hooks/use-doctors";
import { useFacilities } from "@/hooks/use-facilities";
import { useReplacementRequests } from "@/hooks/use-replacement-requests";
import {
  earningsSeries,
  specialtyBreakdown,
  dayOfWeekBreakdown,
  timeOfDayBreakdown,
  performanceTrends,
  topFacilities,
} from "@/lib/mock-data/analytics";
import { formatDate } from "@/lib/format";
import { getDoctorName } from "@/lib/selectors";
import type { Doctor, ReplacementRequest } from "@/types";
import type { Facility } from "@/lib/mock-data/organizations";

const specialtyColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const timeOfDayColors = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

const requestStatusMeta = {
  pending: { label: "Pending", tone: "warning" as const },
  approved: { label: "Approved", tone: "success" as const },
  rejected: { label: "Rejected", tone: "danger" as const },
  filled: { label: "Filled", tone: "info" as const },
};

export default function SuperAdminAnalyticsPage() {
  const { shifts } = useShifts();
  const { doctors } = useDoctors();
  const { facilities } = useFacilities();
  const { replacementRequests } = useReplacementRequests();

  const verifiedHospitals = facilities.filter((f) => f.status === "verified").length;
  const verifiedDoctors = doctors.filter((d) => d.verified).length;

  const hospitalColumns: ColumnDef<Facility>[] = useMemo(
    () => [
      { accessorKey: "name", header: "Hospital" },
      { accessorKey: "hospitalType", header: "Type" },
      { accessorKey: "city", header: "Location" },
      {
        id: "status",
        header: "Status",
        cell: ({ row }) => (
          <StatusBadge
            label={row.original.status === "verified" ? "Verified" : "Pending"}
            tone={row.original.status === "verified" ? "success" : "warning"}
          />
        ),
      },
    ],
    []
  );

  const doctorColumns: ColumnDef<Doctor>[] = useMemo(
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

  const requestColumns: ColumnDef<ReplacementRequest>[] = useMemo(
    () => [
      {
        id: "doctor",
        header: "Requested By",
        accessorFn: (row) => getDoctorName(row.requestingDoctorId),
      },
      { accessorKey: "preferredReplacementType", header: "Preferred Type" },
      {
        accessorKey: "requestedAt",
        header: "Requested",
        cell: ({ row }) => formatDate(row.original.requestedAt),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.status,
        cell: ({ row }) => {
          const meta = requestStatusMeta[row.original.status];
          return <StatusBadge label={meta.label} tone={meta.tone} />;
        },
      },
    ],
    []
  );

  return (
    <div>
      <PageHeader title="Platform Analytics" description="Trust, safety, and utilization metrics across every hospital." />

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Overview</TabsTrigger>
          <TabsTrigger value="hospitals">Hospitals</TabsTrigger>
          <TabsTrigger value="doctors">Doctors</TabsTrigger>
          <TabsTrigger value="requests">Replacement Requests</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-6">
          <AnalyticsOverview
            stats={[
              { label: "Total Shifts", value: String(shifts.length), icon: CalendarCheck },
              { label: "Doctors", value: String(doctors.length), icon: Users },
              { label: "Hospitals", value: String(facilities.length), icon: Building2 },
              { label: "Replacement Requests", value: String(replacementRequests.length), icon: ClipboardList },
              { label: "Verified Hospitals", value: `${verifiedHospitals}/${facilities.length}`, icon: ShieldCheck },
              { label: "Verified Doctors", value: `${verifiedDoctors}/${doctors.length}`, icon: ShieldCheck },
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
                description: "Replacement request approvals are keeping shift fill rates high.",
                linkLabel: "View Requests",
                href: "#",
              },
              {
                icon: Award,
                title: "Top Facility",
                description: "City Medical Center has the highest shift volume.",
                linkLabel: "View Hospitals",
                href: "#",
              },
              {
                icon: ShieldCheck,
                title: "Compliance",
                description: `${verifiedDoctors} of ${doctors.length} doctors have verified credentials.`,
                linkLabel: "View Doctors",
                href: "#",
              },
              {
                icon: RefreshCw,
                title: "Replacement Workflow",
                description: `${replacementRequests.filter((r) => r.status === "pending").length} requests awaiting hospital review.`,
                linkLabel: "View Requests",
                href: "#",
              },
            ]}
          />
        </TabsContent>

        <TabsContent value="hospitals" className="mt-6">
          <DataTable columns={hospitalColumns} data={facilities} searchPlaceholder="Search hospitals..." pageSize={8} />
        </TabsContent>
        <TabsContent value="doctors" className="mt-6">
          <DataTable columns={doctorColumns} data={doctors} searchPlaceholder="Search doctors..." pageSize={8} />
        </TabsContent>
        <TabsContent value="requests" className="mt-6">
          <DataTable columns={requestColumns} data={replacementRequests} searchPlaceholder="Search requests..." pageSize={8} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
