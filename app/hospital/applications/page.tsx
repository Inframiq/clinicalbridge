"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, ClipboardList, Clock3, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Person } from "@/components/dashboard/person";
import { DataTable } from "@/components/data-table/data-table";
import { useApplications } from "@/hooks/use-applications";
import { useShifts } from "@/hooks/use-shifts";
import { getDoctorById } from "@/lib/selectors";
import { getShiftById } from "@/lib/mock-data/shifts";
import { applicationStatusMeta } from "@/lib/status";
import { formatDate } from "@/lib/format";
import type { Application } from "@/types";

export default function ApplicationsPage() {
  const { applications } = useApplications();
  const { shifts } = useShifts();

  const accepted = applications.filter((a) => a.status === "accepted").length;
  const inReview = applications.filter((a) => a.status === "in_review").length;
  const rejected = applications.filter((a) => a.status === "rejected").length;

  const columns: ColumnDef<Application>[] = useMemo(
    () => [
      {
        id: "doctor",
        header: "Doctor",
        accessorFn: (row) => {
          const d = getDoctorById(row.doctorId);
          return d ? `${d.firstName} ${d.lastName}` : "";
        },
        cell: ({ row }) => {
          const doctor = getDoctorById(row.original.doctorId);
          return doctor ? (
            <Person name={`Dr. ${doctor.firstName} ${doctor.lastName}`} subtitle={doctor.specialty} size="sm" />
          ) : null;
        },
      },
      {
        id: "shift",
        header: "Shift",
        accessorFn: (row) => {
          const shift = shifts.find((s) => s.id === row.shiftId) ?? getShiftById(row.shiftId);
          return shift?.title ?? "";
        },
        cell: ({ row }) => {
          const shift = shifts.find((s) => s.id === row.original.shiftId) ?? getShiftById(row.original.shiftId);
          return (
            <div>
              <p className="font-medium text-foreground">{shift?.title}</p>
              <p className="text-xs text-muted-foreground">{shift?.department}</p>
            </div>
          );
        },
      },
      {
        accessorKey: "matchScorePct",
        header: "Match Score",
        cell: ({ row }) => `${row.original.matchScorePct}%`,
      },
      {
        accessorKey: "appliedAt",
        header: "Applied",
        cell: ({ row }) => formatDate(row.original.appliedAt),
      },
      {
        id: "status",
        header: "Status",
        accessorFn: (row) => row.status,
        cell: ({ row }) => {
          const meta = applicationStatusMeta[row.original.status];
          return <StatusBadge label={meta.label} tone={meta.tone} />;
        },
      },
    ],
    [shifts]
  );

  return (
    <div>
      <PageHeader
        title="Applications"
        description="Review and manage doctor applications across all open shifts."
      />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applications" value={String(applications.length)} icon={ClipboardList} iconTone="brand" />
        <StatCard label="Accepted" value={String(accepted)} icon={CheckCircle2} iconTone="success" />
        <StatCard label="In Review" value={String(inReview)} icon={Clock3} iconTone="warning" />
        <StatCard label="Rejected" value={String(rejected)} icon={XCircle} iconTone="neutral" />
      </div>
      <div className="mt-6">
        <DataTable columns={columns} data={applications} searchPlaceholder="Search applications..." />
      </div>
    </div>
  );
}
