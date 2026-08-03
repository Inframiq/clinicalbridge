"use client";

import { toast } from "sonner";
import { Eye, GraduationCap, MapPin, ShieldCheck, Users } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ShiftDetailsSheet } from "@/components/dashboard/shift-details-sheet";
import { useShifts } from "@/hooks/use-shifts";
import { useApplications } from "@/hooks/use-applications";
import { useDoctors } from "@/hooks/use-doctors";
import { currentIntern } from "@/lib/mock-data/doctors";
import { formatCurrency, formatDate } from "@/lib/format";

export default function InternOpportunitiesPage() {
  const { shifts } = useShifts();
  const { applications, applyToShift } = useApplications();
  const { doctors } = useDoctors();

  const me = doctors.find((d) => d.id === currentIntern.id) ?? currentIntern;
  const preferredDepartments = me.replacementPreferences?.preferredDepartments ?? [];
  const appliedShiftIds = new Set(
    applications.filter((a) => a.doctorId === currentIntern.id).map((a) => a.shiftId)
  );

  const opportunities = shifts.filter((s) => {
    if (s.status !== "open") return false;
    if (s.replacementStage === "locum_only") return false;
    if (s.experienceLevel === "Senior" || s.experienceLevel === "Expert") return false;
    if (preferredDepartments.length > 0 && !preferredDepartments.includes(s.department)) return false;
    return !appliedShiftIds.has(s.id);
  });

  function applicantCount(shiftId: string) {
    return applications.filter((a) => a.shiftId === shiftId).length;
  }

  return (
    <div>
      <PageHeader
        title="Available Opportunities"
        description="Supervised replacement shifts matched to your training level."
      />

      {opportunities.length === 0 ? (
        <EmptyState
          icon={GraduationCap}
          title="No opportunities right now"
          description="Supervised shifts appear here once a hospital escalates a replacement request, or matches your preferred departments."
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {opportunities.map((shift) => (
            <Card key={shift.id}>
              <CardContent className="flex flex-col gap-3">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="font-medium text-foreground">{shift.title}</p>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3" /> {shift.facilityName}
                    </p>
                  </div>
                  {shift.internSupervisionRequired && (
                    <StatusBadge label="Supervised" tone="info" dot={false} />
                  )}
                </div>

                <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
                  <span>{shift.department}</span>
                  <span>{formatDate(shift.date)}</span>
                  <span>{shift.startTime}–{shift.endTime}</span>
                  <span className="font-medium text-foreground">{formatCurrency(shift.hourlyRate)}/hr</span>
                  <span>{shift.experienceLevel}</span>
                  <span className="flex items-center gap-1">
                    <Users className="size-3" /> {applicantCount(shift.id)} applicant
                    {applicantCount(shift.id) === 1 ? "" : "s"}
                  </span>
                </div>

                {shift.supervisorName && (
                  <p className="flex items-center gap-1 text-xs text-muted-foreground">
                    <ShieldCheck className="size-3" /> Supervisor: {shift.supervisorName}
                  </p>
                )}

                <div className="mt-1 flex items-center gap-2">
                  <Button
                    size="sm"
                    className="flex-1"
                    onClick={() => {
                      applyToShift(shift.id, currentIntern.id);
                      toast.success(`Applied to ${shift.title}`);
                    }}
                  >
                    Apply
                  </Button>
                  <ShiftDetailsSheet
                    shift={shift}
                    currentDoctorId={currentIntern.id}
                    trigger={
                      <Button size="sm" variant="outline">
                        <Eye className="size-4" /> Details
                      </Button>
                    }
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
