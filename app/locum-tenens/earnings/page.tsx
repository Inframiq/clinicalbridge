"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, IndianRupee, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { TrendAreaChart } from "@/components/dashboard/charts/trend-area-chart";
import { DataTable } from "@/components/data-table/data-table";
import { usePayments } from "@/hooks/use-payments";
import { useShifts } from "@/hooks/use-shifts";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuthRole } from "@/context/auth-provider";
import { joinPostShiftRecords, type JoinedPostShiftRecord } from "@/lib/selectors";
import { formatCurrency } from "@/lib/format";
import { payoutStatusMeta } from "@/lib/status";

export default function DoctorEarningsPage() {
  const { profile } = useAuthRole();
  const { doctors } = useDoctors();
  const myDoctorId = doctors.find((d) => d.profileId === profile?.id)?.id;
  const { payments } = usePayments();
  const { shifts } = useShifts();

  const joined = useMemo(
    () => joinPostShiftRecords(payments.filter((p) => p.doctorId === myDoctorId), shifts),
    [payments, shifts, myDoctorId]
  );

  const totalEarnings = joined.reduce((sum, p) => sum + p.netPayout, 0);
  const avgPerShift = joined.length ? totalEarnings / joined.length : 0;
  const pendingPayout = joined
    .filter((p) => p.status !== "payment_processed")
    .reduce((sum, p) => sum + p.netPayout, 0);

  const earningsSeries = Object.values(
    joined.reduce<Record<string, { date: string; earnings: number }>>((acc, p) => {
      const date = p.submittedAt.slice(0, 10);
      acc[date] ??= { date, earnings: 0 };
      acc[date].earnings += p.netPayout;
      return acc;
    }, {})
  ).sort((a, b) => a.date.localeCompare(b.date));

  const columns: ColumnDef<JoinedPostShiftRecord>[] = [
    { id: "hospital", header: "Hospital", accessorFn: (r) => r.shift?.facilityName ?? "" },
    { id: "shift", header: "Shift", accessorFn: (r) => r.shift?.title ?? "" },
    { accessorKey: "hours", header: "Hours" },
    { accessorKey: "hourlyRate", header: "Rate", cell: ({ row }) => `${formatCurrency(row.original.hourlyRate)}/hr` },
    { accessorKey: "netPayout", header: "Net Payout", cell: ({ row }) => formatCurrency(row.original.netPayout) },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const meta = payoutStatusMeta[row.original.status];
        return <StatusBadge label={meta.label} tone={meta.tone} />;
      },
    },
  ];

  return (
    <div>
      <PageHeader title="Earnings" description="Track your income across all completed shifts." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Earnings" value={formatCurrency(totalEarnings, { decimals: false })} icon={IndianRupee} iconTone="success" />
        <StatCard label="Avg. Per Shift" value={formatCurrency(avgPerShift, { decimals: false })} icon={TrendingUp} iconTone="brand" />
        <StatCard label="Pending Payout" value={formatCurrency(pendingPayout, { decimals: false })} icon={CalendarClock} iconTone="warning" />
      </div>
      <div className="mt-6">
        <ChartCard title="Earnings Overview" description="This Month">
          <TrendAreaChart
            data={earningsSeries}
            xKey="date"
            compactYAxis
            series={[{ key: "earnings", label: "Earnings (INR)", color: "var(--chart-1)" }]}
          />
        </ChartCard>
      </div>
      <div className="mt-6">
        <DataTable columns={columns} data={joined} searchPlaceholder="Search earnings..." emptyTitle="No earnings yet" emptyDescription="Complete a shift to see it here." />
      </div>
    </div>
  );
}
