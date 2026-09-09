"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { Building2, CheckCircle2, Clock3, ShieldAlert, ShieldX } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { VerifyHospitalDialog } from "@/components/forms/verify-hospital-dialog";
import { useFacilities } from "@/hooks/use-facilities";
import type { Facility } from "@/lib/mock-data/organizations";

const statusMeta = {
  verified: { label: "Verified", tone: "success" as const },
  pending: { label: "Pending", tone: "warning" as const },
};

export default function SuperAdminHospitalsPage() {
  const { facilities } = useFacilities();

  const verified = facilities.filter((f) => f.status === "verified").length;
  const pending = facilities.filter((f) => f.status === "pending").length;

  const columns: ColumnDef<Facility>[] = useMemo(
    () => [
      {
        id: "hospital",
        header: "Hospital",
        accessorFn: (row) => row.name,
        cell: ({ row }) => (
          <div className="max-w-[220px]">
            <p className="truncate font-medium text-foreground" title={row.original.name}>
              {row.original.name}
            </p>
            <p className="truncate text-xs text-muted-foreground">{row.original.city}</p>
          </div>
        ),
      },
      { accessorKey: "hospitalType", header: "Type" },
      { accessorKey: "registrationNumber", header: "Registration No." },
      {
        id: "contact",
        header: "Contact",
        cell: ({ row }) => (
          <div className="max-w-[200px]">
            <p className="truncate text-foreground">{row.original.contactPerson}</p>
            <p className="truncate text-xs text-muted-foreground" title={row.original.email}>
              {row.original.email}
            </p>
          </div>
        ),
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
            <VerifyHospitalDialog
              facility={row.original}
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
        title="Hospital Verification"
        description="Review registration documents before a hospital goes live on the platform."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Hospitals" value={String(facilities.length)} icon={Building2} iconTone="brand" />
        <StatCard label="Verified" value={String(verified)} icon={CheckCircle2} iconTone="success" />
        <StatCard label="Pending" value={String(pending)} icon={Clock3} iconTone="warning" />
      </div>

      <div className="mt-6">
        <DataTable columns={columns} data={facilities} searchPlaceholder="Search hospitals..." />
      </div>
    </div>
  );
}
