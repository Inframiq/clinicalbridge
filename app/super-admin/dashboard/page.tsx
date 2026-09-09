"use client";

import { Building2, UserCheck, Users, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { Person } from "@/components/dashboard/person";
import { EmptyState } from "@/components/dashboard/empty-state";
import { VerifyHospitalDialog } from "@/components/forms/verify-hospital-dialog";
import { VerifyDoctorDialog } from "@/components/forms/verify-doctor-dialog";
import { useDoctors } from "@/hooks/use-doctors";
import { useFacilities } from "@/hooks/use-facilities";

export default function SuperAdminDashboardPage() {
  const { doctors } = useDoctors();
  const { facilities } = useFacilities();

  const pendingHospitals = facilities.filter((f) => f.status !== "verified");
  const pendingDoctors = doctors.filter((d) => d.status === "onboarding" || !d.verified);

  return (
    <div>
      <PageHeader
        title="Platform Overview"
        description="Verification queues and oversight across every hospital on ClinicalBridge."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Registered Hospitals" value={String(facilities.length)} icon={Building2} iconTone="brand" />
        <StatCard
          label="Pending Hospital Verifications"
          value={String(pendingHospitals.length)}
          icon={Building2}
          iconTone="warning"
        />
        <StatCard label="Registered Doctors" value={String(doctors.length)} icon={Users} iconTone="info" />
        <StatCard
          label="Pending Doctor Verifications"
          value={String(pendingDoctors.length)}
          icon={UserCheck}
          iconTone="warning"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard
          title="Hospital Verification Queue"
          description="Government license & accreditation review"
          viewAllHref="/super-admin/hospitals"
        >
          <ul className="divide-y divide-border">
            {pendingHospitals.map((facility) => (
              <li key={facility.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium text-foreground">{facility.name}</p>
                  <p className="truncate text-xs text-muted-foreground">{facility.city}</p>
                </div>
                <VerifyHospitalDialog
                  facility={facility}
                  trigger={
                    <Button size="sm" variant="outline">
                      Review
                    </Button>
                  }
                />
              </li>
            ))}
            {pendingHospitals.length === 0 && (
              <EmptyState
                icon={Building2}
                title="No hospitals awaiting verification"
                description="Newly registered hospitals will appear here for review."
                className="border-none py-6"
              />
            )}
          </ul>
        </ChartCard>

        <ChartCard
          title="Doctor Verification Queue"
          description="License, degree & identity checks"
          viewAllHref="/super-admin/doctors"
        >
          <ul className="divide-y divide-border">
            {pendingDoctors.map((doctor) => (
              <li key={doctor.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                <Person name={`Dr. ${doctor.firstName} ${doctor.lastName}`} subtitle={doctor.specialty} />
                <VerifyDoctorDialog
                  doctor={doctor}
                  trigger={
                    <Button size="sm" variant="outline">
                      Review
                    </Button>
                  }
                />
              </li>
            ))}
            {pendingDoctors.length === 0 && (
              <EmptyState
                icon={UserCheck}
                title="All doctors are verified"
                description="Newly registered or unverified doctors will appear here."
                className="border-none py-6"
              />
            )}
          </ul>
        </ChartCard>
      </div>

      <div className="mt-6">
        <ChartCard title="Platform Health" description="High-level trust & safety signal">
          <div className="flex items-center gap-3 text-sm text-muted-foreground">
            <ShieldCheck className="size-5 shrink-0 text-success" />
            No active disputes or flagged accounts.
          </div>
        </ChartCard>
      </div>
    </div>
  );
}
