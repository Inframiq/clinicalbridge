"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { PostShiftDetailPanel } from "@/components/dashboard/post-shift-detail-panel";
import { DataTable } from "@/components/data-table/data-table";
import { usePayments } from "@/hooks/use-payments";
import { useShifts } from "@/hooks/use-shifts";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuthRole } from "@/context/auth-provider";
import { joinPostShiftRecords, type JoinedPostShiftRecord } from "@/lib/selectors";
import { formatCurrency } from "@/lib/format";
import { payoutStatusMeta } from "@/lib/status";
import { CalendarCheck, Clock3, Wallet } from "lucide-react";

export default function DoctorPostShiftPage() {
  const { profile } = useAuthRole();
  const { doctors } = useDoctors();
  const myDoctorId = doctors.find((d) => d.profileId === profile?.id)?.id;
  const { payments } = usePayments();
  const { shifts } = useShifts();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const joined = useMemo(
    () => joinPostShiftRecords(payments.filter((p) => p.doctorId === myDoctorId), shifts),
    [payments, shifts, myDoctorId]
  );
  const selected = joined.find((p) => p.id === selectedId) ?? joined[0] ?? null;

  const pending = joined.filter((p) => p.status === "pending_approval").length;
  const totalPaid = joined.filter((p) => p.status === "payment_processed").reduce((s, p) => s + p.netPayout, 0);

  const columns: ColumnDef<JoinedPostShiftRecord>[] = [
    {
      id: "shift",
      header: "Shift",
      accessorFn: (r) => r.shift?.title ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.shift?.title}</p>
          <p className="text-xs text-muted-foreground">{row.original.shift?.facilityName}</p>
        </div>
      ),
    },
    { accessorKey: "hours", header: "Hours" },
    { accessorKey: "netPayout", header: "Payout", cell: ({ row }) => formatCurrency(row.original.netPayout) },
    {
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const meta = payoutStatusMeta[row.original.status];
        return <StatusBadge label={meta.label} tone={meta.tone} />;
      },
    },
    {
      id: "actions",
      header: "",
      enableSorting: false,
      cell: ({ row }) => (
        <Button size="icon" variant="ghost" onClick={() => setSelectedId(row.original.id)}>
          <Eye className="size-4" />
        </Button>
      ),
    },
  ];

  return (
    <div>
      <PageHeader title="Post-Shift" description="Review your completed shifts, timesheets, and payments." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Completed Shifts" value={String(joined.length)} icon={CalendarCheck} iconTone="success" />
        <StatCard label="Pending Approval" value={String(pending)} icon={Clock3} iconTone="warning" />
        <StatCard label="Total Paid Out" value={formatCurrency(totalPaid, { decimals: false })} icon={Wallet} iconTone="info" />
      </div>
      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <DataTable columns={columns} data={joined} searchPlaceholder="Search shifts..." />
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Shift Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <PostShiftDetailPanel record={selected} showDoctor={false} />
            ) : (
              <p className="text-sm text-muted-foreground">Select a shift to view details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
