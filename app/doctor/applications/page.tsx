"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { CheckCircle2, ClipboardList, Clock3, XCircle } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { DataTable } from "@/components/data-table/data-table";
import { useApplications } from "@/hooks/use-applications";
import { useShifts } from "@/hooks/use-shifts";
import { currentDoctor } from "@/lib/mock-data/doctors";
import { formatDate } from "@/lib/format";
import { applicationStatusMeta } from "@/lib/status";
import type { Application } from "@/types";

export default function DoctorApplicationsPage() {
  const { applications: all } = useApplications();
  const { shifts } = useShifts();
  const applications = useMemo(
    () => all.filter((a) => a.doctorId === currentDoctor.id),
    [all]
  );

  const accepted = applications.filter((a) => a.status === "accepted").length;
  const inReview = applications.filter((a) => a.status === "in_review").length;
  const rejected = applications.filter((a) => a.status === "rejected").length;

  const columns: ColumnDef<Application>[] = [
    {
      id: "shift",
      header: "Shift",
      accessorFn: (row) => shifts.find((s) => s.id === row.shiftId)?.title ?? "",
      cell: ({ row }) => {
        const shift = shifts.find((s) => s.id === row.original.shiftId);
        return (
          <div>
            <p className="font-medium text-foreground">{shift?.title}</p>
            <p className="text-xs text-muted-foreground">{shift?.facilityName}</p>
          </div>
        );
      },
    },
    {
      accessorKey: "appliedAt",
      header: "Applied",
      cell: ({ row }) => formatDate(row.original.appliedAt),
    },
    {
      accessorKey: "matchScorePct",
      header: "Match Score",
      cell: ({ row }) => `${row.original.matchScorePct}%`,
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
  ];

  return (
    <div>
      <PageHeader title="Applications" description="Track the status of shifts you've applied for." />
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applications" value={String(applications.length)} icon={ClipboardList} iconTone="brand" />
        <StatCard label="Accepted" value={String(accepted)} icon={CheckCircle2} iconTone="success" />
        <StatCard label="In Review" value={String(inReview)} icon={Clock3} iconTone="warning" />
        <StatCard label="Rejected" value={String(rejected)} icon={XCircle} iconTone="neutral" />
      </div>
      <div className="mt-6">
        {applications.length === 0 ? (
          <EmptyState icon={ClipboardList} title="No applications yet" description="Apply to shifts from your dashboard to see them here." />
        ) : (
          <DataTable columns={columns} data={applications} searchPlaceholder="Search applications..." />
        )}
      </div>
    </div>
  );
}
