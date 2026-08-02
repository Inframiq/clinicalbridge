"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CalendarClock, DollarSign, TrendingUp } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { TrendAreaChart } from "@/components/dashboard/charts/trend-area-chart";
import { DataTable } from "@/components/data-table/data-table";
import { usePayments } from "@/hooks/use-payments";
import { useShifts } from "@/hooks/use-shifts";
import { currentDoctor } from "@/lib/mock-data/doctors";
import { earningsSeries } from "@/lib/mock-data/analytics";
import { joinPostShiftRecords, type JoinedPostShiftRecord } from "@/lib/selectors";
import { formatCurrency } from "@/lib/format";
import { payoutStatusMeta } from "@/lib/status";

export default function DoctorEarningsPage() {
  const { payments } = usePayments();
  const { shifts } = useShifts();

  const joined = useMemo(
    () => joinPostShiftRecords(payments.filter((p) => p.doctorId === currentDoctor.id), shifts),
    [payments, shifts]
  );

  const totalEarnings = joined.reduce((sum, p) => sum + p.netPayout, 0);
  const avgPerShift = joined.length ? totalEarnings / joined.length : 0;
  const pendingPayout = joined
    .filter((p) => p.status !== "payment_processed")
    .reduce((sum, p) => sum + p.netPayout, 0);

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
        <StatCard label="Total Earnings" value={formatCurrency(totalEarnings || 9640, { decimals: false })} icon={DollarSign} iconTone="success" delta={{ value: "+15%", positive: true }} />
        <StatCard label="Avg. Per Shift" value={formatCurrency(avgPerShift || 400, { decimals: false })} icon={TrendingUp} iconTone="brand" />
        <StatCard label="Pending Payout" value={formatCurrency(pendingPayout, { decimals: false })} icon={CalendarClock} iconTone="warning" />
      </div>
      <div className="mt-6">
        <ChartCard title="Earnings Overview" description="This Month">
          <TrendAreaChart
            data={earningsSeries}
            xKey="date"
            compactYAxis
            series={[{ key: "earnings", label: "Earnings (USD)", color: "var(--chart-1)" }]}
          />
        </ChartCard>
      </div>
      <div className="mt-6">
        <DataTable columns={columns} data={joined} searchPlaceholder="Search earnings..." emptyTitle="No earnings yet" emptyDescription="Complete a shift to see it here." />
      </div>
    </div>
  );
}
