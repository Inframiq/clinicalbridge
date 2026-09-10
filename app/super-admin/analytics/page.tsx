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
import { usePayments } from "@/hooks/use-payments";
import { formatDate } from "@/lib/format";
import { getDoctorName } from "@/lib/selectors";
import { startHour24, timeSegmentFor, dayOfWeekBuckets } from "@/lib/analytics-time";
import type { Doctor, ReplacementRequest } from "@/types";
import type { Facility } from "@/lib/supabase/services/facilities";

const specialtyColors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const timeOfDayColors = ["var(--chart-1)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
const TIME_SEGMENTS = ["Morning (6AM-12PM)", "Afternoon (12PM-6PM)", "Evening (6PM-12AM)", "Night (12AM-6AM)"];

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
  const { payments } = usePayments();

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
        accessorFn: (row) => getDoctorName(doctors, row.requestingDoctorId),
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

  const pendingRequests = replacementRequests.filter((r) => r.status === "pending").length;

  const performanceTrends = useMemo(
    () => [
      {
        metric: "Hospital Verification Rate",
        thisMonth: facilities.length === 0 ? "0%" : `${((verifiedHospitals / facilities.length) * 100).toFixed(1)}%`,
        lastMonth: "—",
        changePct: 0,
      },
      {
        metric: "Doctor Verification Rate",
        thisMonth: doctors.length === 0 ? "0%" : `${((verifiedDoctors / doctors.length) * 100).toFixed(1)}%`,
        lastMonth: "—",
        changePct: 0,
      },
      { metric: "Replacement Requests Pending", thisMonth: String(pendingRequests), lastMonth: "—", changePct: 0 },
      { metric: "Total Payouts Processed", thisMonth: String(payments.filter((p) => p.status === "payment_processed").length), lastMonth: "—", changePct: 0 },
    ],
    [facilities.length, verifiedHospitals, doctors.length, verifiedDoctors, pendingRequests, payments]
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
            specialtyBreakdown={specialtyBreakdown}
            dayOfWeekBreakdown={dayOfWeekBreakdown}
            timeOfDayBreakdown={timeOfDayBreakdown}
            performanceTrends={performanceTrends}
            topListTitle="Top Facilities"
            topList={topFacilities}
            insights={[
              {
                icon: Lightbulb,
                title: "Replacement Workflow",
                description: `${pendingRequests} requests awaiting hospital review.`,
                linkLabel: "View Requests",
                href: "#",
              },
              {
                icon: Award,
                title: "Top Facility",
                description: topFacilities[0]
                  ? `${topFacilities[0].label} has the highest shift volume.`
                  : "No shift volume yet.",
                linkLabel: "View Hospitals",
                href: "/super-admin/hospitals",
              },
              {
                icon: ShieldCheck,
                title: "Compliance",
                description: `${verifiedDoctors} of ${doctors.length} doctors have verified credentials.`,
                linkLabel: "View Doctors",
                href: "/super-admin/doctors",
              },
              {
                icon: RefreshCw,
                title: "Hospitals",
                description: `${verifiedHospitals} of ${facilities.length} hospitals are verified.`,
                linkLabel: "View Hospitals",
                href: "/super-admin/hospitals",
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
