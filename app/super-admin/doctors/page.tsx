"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Users, CheckCircle2, Clock3, ShieldAlert, ShieldX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Person } from "@/components/dashboard/person";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { VerifyDoctorDialog } from "@/components/forms/verify-doctor-dialog";
import { useDoctors } from "@/hooks/use-doctors";
import type { Doctor } from "@/types";

const statusMeta = {
  active: { label: "Active", tone: "success" as const },
  onboarding: { label: "Onboarding", tone: "warning" as const },
  inactive: { label: "On Leave", tone: "neutral" as const },
};

export default function SuperAdminDoctorsPage() {
  const { doctors } = useDoctors();

  const totalActive = doctors.filter((d) => d.status === "active").length;
  const totalOnboarding = doctors.filter((d) => d.status === "onboarding").length;
  // A rejected doctor never flips `verified` to true — exclude it explicitly
  // so a closed application doesn't inflate the pending count.
  const pendingVerification = doctors.filter(
    (d) => !d.verified && d.registrationStatus !== "Rejected"
  ).length;

  const columns: ColumnDef<Doctor>[] = useMemo(
    () => [
      {
        id: "name",
        header: "Doctor",
        accessorFn: (row) => `${row.firstName} ${row.lastName}`,
        cell: ({ row }) => (
          <Person
            name={`Dr. ${row.original.firstName} ${row.original.lastName}`}
            subtitle={row.original.specialty}
            size="sm"
          />
        ),
      },
      {
        id: "kind",
        header: "Type",
        accessorFn: (row) => row.doctorKind ?? "—",
        cell: ({ row }) => {
          const kind = row.original.doctorKind;
          const label = kind === "working" ? "Working Doctor" : kind === "locum_tenens" ? "Locum Tenens" : "—";
          return label;
        },
      },
      {
        accessorKey: "department",
        header: "Department",
        cell: ({ row }) => row.original.department ?? "—",
      },
      {
        accessorKey: "licenseNumber",
        header: "Registration No.",
      },
      {
        id: "verification",
        header: "Documents",
        accessorFn: (row) =>
          Object.values(row.uploadedDocuments ?? {}).filter((f) => f.status === "approved").length,
        cell: ({ row }) => {
          const docs = Object.values(row.original.uploadedDocuments ?? {});
          const total = docs.length;
          const approved = docs.filter((f) => f.status === "approved").length;
          const anyRejected = docs.some((f) => f.status === "rejected");
          return (
            <VerifyDoctorDialog
              doctor={row.original}
              trigger={
                <Button variant="outline" size="sm">
                  {anyRejected ? (
                    <ShieldX className="size-3.5 text-destructive" />
                  ) : total > 0 && approved === total ? (
                    <CheckCircle2 className="size-3.5 text-success" />
                  ) : (
                    <ShieldAlert className="size-3.5 text-warning-foreground" />
                  )}
                  {approved}/{total} docs
                </Button>
              }
            />
          );
        },
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
    []
  );

  return (
    <div>
      <PageHeader
        title="Doctor Verification"
        description="Platform-wide credential verification across every hospital and locum tenens doctor."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Doctors" value={String(doctors.length)} icon={Users} iconTone="brand" />
        <StatCard label="Active" value={String(totalActive)} icon={CheckCircle2} iconTone="success" />
        <StatCard label="Onboarding" value={String(totalOnboarding)} icon={Clock3} iconTone="warning" />
        <StatCard
          label="Pending Verification"
          value={String(pendingVerification)}
          icon={ShieldAlert}
          iconTone="info"
        />
      </div>

      <div className="mt-6">
        <DataTable columns={columns} data={doctors} searchPlaceholder="Search doctors..." />
      </div>
    </div>
  );
}
