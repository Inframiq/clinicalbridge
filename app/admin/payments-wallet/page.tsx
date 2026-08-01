"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Clock3, Eye, TrendingUp, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Person } from "@/components/dashboard/person";
import { DataTable } from "@/components/data-table/data-table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PostShiftDetailPanel } from "@/components/dashboard/post-shift-detail-panel";
import { usePayments } from "@/hooks/use-payments";
import { useShifts } from "@/hooks/use-shifts";
import { getDoctorById, joinPostShiftRecords, computeEscrowBalance, computeTotalPaidOut, type JoinedPostShiftRecord } from "@/lib/selectors";
import { formatCurrency } from "@/lib/format";
import { payoutStatusMeta } from "@/lib/status";

export default function PaymentsWalletPage() {
  const { payments } = usePayments();
  const { shifts } = useShifts();
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const joined = useMemo(() => joinPostShiftRecords(payments, shifts), [payments, shifts]);
  const selected = joined.find((p) => p.id === selectedId) ?? joined[0] ?? null;

  const escrow = computeEscrowBalance(payments);
  const paidOut = computeTotalPaidOut(payments);

  const columns: ColumnDef<JoinedPostShiftRecord>[] = [
    {
      id: "shift",
      header: "Shift",
      accessorFn: (row) => row.shift?.title ?? "",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.shift?.title}</p>
          <p className="text-xs text-muted-foreground">{row.original.shift?.facilityName}</p>
        </div>
      ),
    },
    {
      id: "doctor",
      header: "Doctor",
      accessorFn: (row) => {
        const d = getDoctorById(row.doctorId);
        return d ? `${d.firstName} ${d.lastName}` : "";
      },
      cell: ({ row }) => {
        const doctor = getDoctorById(row.original.doctorId);
        return doctor ? <Person name={`Dr. ${doctor.firstName} ${doctor.lastName}`} size="sm" /> : null;
      },
    },
    {
      accessorKey: "netPayout",
      header: "Amount",
      cell: ({ row }) => formatCurrency(row.original.netPayout),
    },
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
      <PageHeader title="Payments & Wallet" description="Manage escrow balance and payment history." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Escrow Balance" value={formatCurrency(escrow, { decimals: false })} icon={Wallet} iconTone="info" helpText="Available" />
        <StatCard label="Total Paid Out" value={formatCurrency(paidOut, { decimals: false })} icon={TrendingUp} iconTone="success" helpText="All time" />
        <StatCard label="Pending Payouts" value={String(payments.filter((p) => p.status !== "payment_processed").length)} icon={Clock3} iconTone="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <DataTable columns={columns} data={joined} searchPlaceholder="Search payments..." />
        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Payment Details</CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <PostShiftDetailPanel record={selected} />
            ) : (
              <p className="text-sm text-muted-foreground">Select a payment to view details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
