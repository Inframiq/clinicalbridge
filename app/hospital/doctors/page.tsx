"use client";

import { useMemo } from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { UserPlus, Users, CheckCircle2, Clock3, ShieldAlert } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Person } from "@/components/dashboard/person";
import { Button } from "@/components/ui/button";
import { DataTable } from "@/components/data-table/data-table";
import { RegisterDoctorDialog } from "@/components/forms/register-doctor-dialog";
import { VerifyDoctorDialog } from "@/components/forms/verify-doctor-dialog";
import { useDoctors } from "@/hooks/use-doctors";
import type { Doctor } from "@/types";

const statusMeta = {
  active: { label: "Active", tone: "success" as const },
  onboarding: { label: "Onboarding", tone: "warning" as const },
  inactive: { label: "On Leave", tone: "neutral" as const },
};

export default function DoctorsPage() {
  const { doctors } = useDoctors();

  const totalActive = doctors.filter((d) => d.status === "active").length;
  const totalOnboarding = doctors.filter((d) => d.status === "onboarding").length;
  const pendingVerification = doctors.filter((d) => !d.verified).length;

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
            className="max-w-[220px]"
          />
        ),
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
        accessorKey: "yearsOfExperience",
        header: "Experience",
      },
      {
        id: "verification",
        header: "Verification",
        accessorFn: (row) =>
          Object.values(
            row.verification ?? { medicalCouncil: false, degree: false, identity: false, hospitalApproval: false }
          ).filter(Boolean).length,
        cell: ({ row }) => {
          const v =
            row.original.verification ??
            { medicalCouncil: false, degree: false, identity: false, hospitalApproval: false };
          const passed = Object.values(v).filter(Boolean).length;
          return (
            <VerifyDoctorDialog
              doctor={row.original}
              trigger={
                <Button variant="outline" size="sm">
                  {passed === 4 ? (
                    <CheckCircle2 className="size-3.5 text-success" />
                  ) : (
                    <ShieldAlert className="size-3.5 text-warning-foreground" />
                  )}
                  {passed}/4 checks
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
        title="Doctor Management"
        description="Register doctors and track their verification status."
        actions={
          <RegisterDoctorDialog
            trigger={
              <Button>
                <UserPlus className="size-4" /> Register Doctor
              </Button>
            }
          />
        }
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
