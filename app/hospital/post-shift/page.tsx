"use client";

import { useMemo, useState } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DataTable } from "@/components/data-table/data-table";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Person } from "@/components/dashboard/person";
import { PostShiftDetailPanel } from "@/components/dashboard/post-shift-detail-panel";
import { usePayments } from "@/hooks/use-payments";
import { useShifts } from "@/hooks/use-shifts";
import { getDoctorById, joinPostShiftRecords, type JoinedPostShiftRecord } from "@/lib/selectors";
import { formatCurrency, formatDate } from "@/lib/format";
import { payoutStatusMeta } from "@/lib/status";
import { CalendarCheck, Clock3, Star, Wallet } from "lucide-react";
import type { PayoutStatus } from "@/types";

const tabs: { value: string; label: string; statuses?: PayoutStatus[] }[] = [
  { value: "all", label: "All Completed" },
  { value: "pending_approval", label: "Pending Approval", statuses: ["pending_approval"] },
  { value: "approved", label: "Approved", statuses: ["approved"] },
  { value: "payment_processed", label: "Payment Processed", statuses: ["payment_processed"] },
  { value: "disputed", label: "Disputed", statuses: ["disputed"] },
];

export default function AdminPostShiftPage() {
  const { payments, approveAndProcessPayment, requestPaymentChanges } = usePayments();
  const { shifts } = useShifts();
  const [tab, setTab] = useState("all");
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const joined = useMemo(() => joinPostShiftRecords(payments, shifts), [payments, shifts]);

  const filtered = useMemo(() => {
    const statuses = tabs.find((t) => t.value === tab)?.statuses;
    return statuses ? joined.filter((p) => statuses.includes(p.status)) : joined;
  }, [joined, tab]);

  const selected = joined.find((p) => p.id === selectedId) ?? filtered[0] ?? null;

  const totalPaid = payments
    .filter((p) => p.status === "payment_processed")
    .reduce((sum, p) => sum + p.netPayout, 0);
  const pendingCount = payments.filter((p) => p.status === "pending_approval").length;
  const avgRating = 4.8;

  const columns: ColumnDef<JoinedPostShiftRecord>[] = [
    {
      accessorKey: "shift.title",
      header: "Shift Details",
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
        const doctor = getDoctorById(row.doctorId);
        return doctor ? `${doctor.firstName} ${doctor.lastName}` : "";
      },
      cell: ({ row }) => {
        const doctor = getDoctorById(row.original.doctorId);
        return doctor ? (
          <Person name={`Dr. ${doctor.firstName} ${doctor.lastName}`} subtitle={doctor.specialty} size="sm" />
        ) : null;
      },
    },
    {
      id: "date",
      header: "Date & Time",
      accessorFn: (row) => row.shift?.date ?? "",
      cell: ({ row }) => (
        <div className="text-sm">
          <p>{row.original.shift ? formatDate(row.original.shift.date) : "-"}</p>
          <p className="text-xs text-muted-foreground">
            {row.original.shift?.startTime} - {row.original.shift?.endTime}
          </p>
        </div>
      ),
    },
    {
      accessorKey: "hours",
      header: "Hours",
      cell: ({ row }) => row.original.hours.toFixed(2),
    },
    {
      accessorKey: "netPayout",
      header: "Payout",
      cell: ({ row }) => (
        <span className="font-medium text-foreground">{formatCurrency(row.original.netPayout)}</span>
      ),
    },
    {
      accessorKey: "status",
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
      <PageHeader
        title="Post-Shift Management"
        description="Review and manage completed shifts, approvals, payments, and feedback."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Completed Shifts" value={String(payments.length)} icon={CalendarCheck} iconTone="success" helpText="This Month" />
        <StatCard label="Pending Approval" value={String(pendingCount)} icon={Clock3} iconTone="warning" helpText="Require Your Action" />
        <StatCard label="Payments Processed" value={formatCurrency(totalPaid, { decimals: false })} icon={Wallet} iconTone="info" helpText="This Month" />
        <StatCard label="Avg. Doctor Rating" value={avgRating.toFixed(1)} icon={Star} iconTone="brand" helpText="This Month" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div>
          <Tabs value={tab} onValueChange={setTab} className="mb-4">
            <TabsList>
              {tabs.map((t) => (
                <TabsTrigger key={t.value} value={t.value}>
                  {t.label}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
          <DataTable columns={columns} data={filtered} searchPlaceholder="Search shifts or doctors..." />
        </div>

        <Card className="h-fit">
          <CardHeader>
            <CardTitle className="text-base">Shift Summary</CardTitle>
          </CardHeader>
          <CardContent>
            {selected ? (
              <PostShiftDetailPanel
                record={selected}
                actions={
                  selected.status === "pending_approval" || selected.status === "approved" ? (
                    <>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => requestPaymentChanges(selected.id)}
                      >
                        Request Changes
                      </Button>
                      <Button
                        className="flex-1"
                        onClick={() => approveAndProcessPayment(selected.id)}
                      >
                        Approve & Process Payment
                      </Button>
                    </>
                  ) : undefined
                }
              />
            ) : (
              <p className="text-sm text-muted-foreground">Select a shift to view details.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
