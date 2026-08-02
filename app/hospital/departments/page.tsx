"use client";

import Link from "next/link";
import { Building2, Users, UserCheck, UserMinus, DoorOpen, CalendarDays } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useDoctors } from "@/hooks/use-doctors";
import { useShifts } from "@/hooks/use-shifts";
import { DEPARTMENTS } from "@/lib/mock-data/departments";

export default function DepartmentsPage() {
  const { doctors } = useDoctors();
  const { shifts } = useShifts();

  const departmentStats = DEPARTMENTS.map((department) => {
    const deptDoctors = doctors.filter((d) => d.department === department);
    const onDutyIds = new Set(
      shifts.filter((s) => s.status === "active").map((s) => s.assignedDoctorId)
    );
    const available = deptDoctors.filter((d) => d.status === "active" && !onDutyIds.has(d.id));
    const onLeave = deptDoctors.filter((d) => d.status === "inactive");
    const deptShifts = shifts.filter((s) => s.department === department);
    const vacantPositions = deptShifts.filter((s) => s.status === "open");
    const upcomingShifts = deptShifts.filter((s) => s.status === "confirmed" || s.status === "pending");

    return {
      department,
      total: deptDoctors.length,
      available: available.length,
      onLeave: onLeave.length,
      vacant: vacantPositions.length,
      upcoming: upcomingShifts.length,
    };
  });

  return (
    <div>
      <PageHeader
        title="Departments"
        description="Staffing levels and coverage across every department."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {departmentStats.map((stat) => (
          <Card key={stat.department}>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <span className="flex size-8 items-center justify-center rounded-lg bg-brand-muted text-brand">
                  <Building2 className="size-4" />
                </span>
                {stat.department}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <Users className="size-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{stat.total}</span>
                  <span className="text-muted-foreground">Doctors</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserCheck className="size-4 text-success" />
                  <span className="font-medium text-foreground">{stat.available}</span>
                  <span className="text-muted-foreground">Available</span>
                </div>
                <div className="flex items-center gap-2">
                  <UserMinus className="size-4 text-muted-foreground" />
                  <span className="font-medium text-foreground">{stat.onLeave}</span>
                  <span className="text-muted-foreground">On Leave</span>
                </div>
                <div className="flex items-center gap-2">
                  <DoorOpen className="size-4 text-warning-foreground" />
                  <span className="font-medium text-foreground">{stat.vacant}</span>
                  <span className="text-muted-foreground">Vacant</span>
                </div>
                <div className="col-span-2 flex items-center gap-2">
                  <CalendarDays className="size-4 text-info" />
                  <span className="font-medium text-foreground">{stat.upcoming}</span>
                  <span className="text-muted-foreground">Upcoming Shifts</span>
                </div>
              </div>
              <Link
                href="/hospital/doctors"
                className="mt-4 inline-block text-xs font-medium text-brand hover:underline"
              >
                View doctors in this department →
              </Link>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
