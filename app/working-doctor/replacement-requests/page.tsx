"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ClipboardList, CheckCircle2, Clock3, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { DataTable } from "@/components/data-table/data-table";
import { useReplacementRequests } from "@/hooks/use-replacement-requests";
import { useShifts } from "@/hooks/use-shifts";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuthRole } from "@/context/auth-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import type { ReplacementRequest, ReplacementRequestStatus } from "@/types";

const statusMeta: Record<ReplacementRequestStatus, { label: string; tone: "success" | "warning" | "danger" | "info" }> = {
  pending: { label: "Pending Review", tone: "warning" },
  approved: { label: "Approved", tone: "success" },
  rejected: { label: "Rejected", tone: "danger" },
  filled: { label: "Filled", tone: "info" },
};

export default function WorkingDoctorReplacementRequestsPage() {
  const { replacementRequests } = useReplacementRequests();
  const { shifts } = useShifts();
  const { doctors } = useDoctors();
  const { profile } = useAuthRole();
  const myDoctor = doctors.find((d) => d.profileId === profile?.id);

  const myRequests = replacementRequests.filter(
    (r) => r.requestingDoctorId === myDoctor?.id
  );
  const pending = myRequests.filter((r) => r.status === "pending").length;
  const approved = myRequests.filter((r) => r.status === "approved").length;
  const rejected = myRequests.filter((r) => r.status === "rejected").length;

  const columns: ColumnDef<ReplacementRequest>[] = useMemo(
    () => [
      {
        id: "shift",
        header: "Shift",
        accessorFn: (row) => shifts.find((s) => s.id === row.shiftId)?.title ?? "",
        cell: ({ row }) => {
          const shift = shifts.find((s) => s.id === row.original.shiftId);
          return (
            <div>
              <p className="font-medium text-foreground">{shift?.title ?? "Shift"}</p>
              <p className="text-xs text-muted-foreground">{shift ? formatDate(shift.date) : ""}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "reason",
        header: "Reason",
        cell: ({ row }) => (
          <span className="line-clamp-2 max-w-xs text-sm">{row.original.reason}</span>
        ),
      },
      {
        accessorKey: "preferredReplacementType",
        header: "Preferred Type",
      },
      {
        accessorKey: "hourlyCompensation",
        header: "Compensation",
        cell: ({ row }) => `${formatCurrency(row.original.hourlyCompensation)}/hr`,
      },
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
          const meta = statusMeta[row.original.status];
          return <StatusBadge label={meta.label} tone={meta.tone} />;
        },
      },
    ],
    [shifts]
  );

  return (
    <div>
      <PageHeader
        title="Replacement Requests"
        description="Every replacement you've requested and its approval status."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Requests" value={String(myRequests.length)} icon={ClipboardList} iconTone="brand" />
        <StatCard label="Pending Review" value={String(pending)} icon={Clock3} iconTone="warning" />
        <StatCard label="Approved" value={String(approved)} icon={CheckCircle2} iconTone="success" />
        <StatCard label="Rejected" value={String(rejected)} icon={XCircle} iconTone="neutral" />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} data={myRequests} searchPlaceholder="Search requests..." />
      </div>
    </div>
  );
}
