"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, CheckCircle2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { RequestReplacementDialog } from "@/components/forms/request-replacement-dialog";
import { useShifts } from "@/hooks/use-shifts";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuthRole } from "@/context/auth-provider";
import { shiftStatusMeta } from "@/lib/status";
import { parseLocalIsoDate, toLocalIsoDate } from "@/lib/utils";

export default function WorkingDoctorSchedulePage() {
  const { shifts: allShifts, confirmShiftAttendance } = useShifts();
  const { doctors } = useDoctors();
  const { profile } = useAuthRole();
  const myDoctor = doctors.find((d) => d.profileId === profile?.id);
  const myShifts = useMemo(
    () => allShifts.filter((s) => s.assignedDoctorId === myDoctor?.id),
    [allShifts, myDoctor?.id]
  );
  const scheduledDates = useMemo(() => myShifts.map((s) => parseLocalIsoDate(s.date)), [myShifts]);
  const [selected, setSelected] = useState<Date | undefined>(() => new Date());

  const shiftsOnDay = selected ? myShifts.filter((s) => s.date === toLocalIsoDate(selected)) : [];

  return (
    <div>
      <PageHeader
        title="My Schedule"
        description="Your complete shift calendar. Confirm availability or request a replacement for any date."
      />
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        <Card className="w-fit">
          <CardContent>
            <Calendar
              mode="single"
              selected={selected}
              onSelect={setSelected}
              defaultMonth={selected}
              modifiers={{ scheduled: scheduledDates }}
              modifiersClassNames={{
                scheduled: "bg-brand-muted text-brand font-semibold",
              }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">
              {selected
                ? selected.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })
                : "Select a date"}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {shiftsOnDay.length === 0 ? (
              <EmptyState
                icon={CalendarDays}
                title="No shifts on this day"
                description="Select a highlighted date to view shift details."
              />
            ) : (
              <ul className="space-y-3">
                {shiftsOnDay.map((shift) => {
                  const meta = shiftStatusMeta[shift.status];
                  return (
                    <li
                      key={shift.id}
                      className="flex flex-col gap-3 rounded-xl border border-border p-4 sm:flex-row sm:items-center sm:justify-between"
                    >
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-foreground">{shift.title}</p>
                          <StatusBadge label={meta.label} tone={meta.tone} />
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {shift.facilityName} · {shift.startTime} - {shift.endTime}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {shift.attendanceConfirmed ? (
                          <StatusBadge label="Confirmed" tone="success" />
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              confirmShiftAttendance(shift.id);
                              toast.success(`Marked available for ${shift.title}`);
                            }}
                          >
                            <CheckCircle2 className="size-4" /> Available
                          </Button>
                        )}
                        <RequestReplacementDialog
                          shift={shift}
                          requestingDoctorId={myDoctor!.id}
                          trigger={
                            <Button size="sm" variant="outline">
                              <RefreshCw className="size-4" /> Request Replacement
                            </Button>
                          }
                        />
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
