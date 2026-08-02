"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { toast } from "sonner";
import { CalendarCheck, CheckCircle2, Clock3, Wallet, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { DataTable } from "@/components/data-table/data-table";
import { Button } from "@/components/ui/button";
import { useShifts } from "@/hooks/use-shifts";
import { currentIntern } from "@/lib/mock-data/doctors";
import { formatCurrency, formatDate } from "@/lib/format";
import { shiftStatusMeta } from "@/lib/status";
import type { Shift } from "@/types";

export default function InternMyAssignmentsPage() {
  const { shifts: allShifts, respondToShiftAssignment } = useShifts();
  const shifts = useMemo(
    () => allShifts.filter((s) => s.assignedDoctorId === currentIntern.id),
    [allShifts]
  );

  const active = shifts.filter((s) => s.status === "active" || s.status === "confirmed").length;
  const completed = shifts.filter((s) => s.status === "completed").length;
  const totalEarned = shifts
    .filter((s) => s.status === "completed")
    .reduce((sum, s) => sum + s.hourlyRate * 8, 0);

  const columns: ColumnDef<Shift>[] = [
    {
      accessorKey: "title",
      header: "Shift",
      cell: ({ row }) => (
        <div>
          <p className="font-medium text-foreground">{row.original.title}</p>
          <p className="text-xs text-muted-foreground">{row.original.facilityName}</p>
        </div>
      ),
    },
    { accessorKey: "date", header: "Date", cell: ({ row }) => formatDate(row.original.date) },
    {
      id: "time",
      header: "Time",
      cell: ({ row }) => `${row.original.startTime} - ${row.original.endTime}`,
    },
    {
      accessorKey: "hourlyRate",
      header: "Rate",
      cell: ({ row }) => `${formatCurrency(row.original.hourlyRate)}/hr`,
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
    {
      id: "actions",
      header: "",
      cell: ({ row }) => {
        if (row.original.status !== "pending") return null;
        return (
          <div className="flex items-center justify-end gap-2">
            <Button
              size="sm"
              onClick={() => {
                respondToShiftAssignment(row.original.id, true);
                toast.success(`Accepted ${row.original.title}`);
              }}
            >
              <CheckCircle2 className="size-4" /> Accept
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => {
                respondToShiftAssignment(row.original.id, false);
                toast.success(`Declined ${row.original.title}`);
              }}
            >
              <XCircle className="size-4" /> Decline
            </Button>
          </div>
        );
      },
    },
  ];

  return (
    <div>
      <PageHeader title="My Assignments" description="Shifts you've been assigned, accepted, or completed." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Active / Confirmed" value={String(active)} icon={Clock3} iconTone="brand" />
        <StatCard label="Completed Shifts" value={String(completed)} icon={CheckCircle2} iconTone="success" />
        <StatCard label="Total Earned" value={formatCurrency(totalEarned, { decimals: false })} icon={Wallet} iconTone="info" />
      </div>
      <div className="mt-6">
        {shifts.length === 0 ? (
          <EmptyState
            icon={CalendarCheck}
            title="No assignments yet"
            description="Shifts you apply for and are assigned will show up here."
          />
        ) : (
          <DataTable columns={columns} data={shifts} searchPlaceholder="Search assignments..." />
        )}
      </div>
    </div>
  );
}
