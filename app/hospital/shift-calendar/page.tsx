"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { CalendarDays, UserPlus, CheckCircle2 } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useShifts } from "@/hooks/use-shifts";
import { useDoctors } from "@/hooks/use-doctors";
import { shiftStatusMeta } from "@/lib/status";
import { formatDate } from "@/lib/format";
import { getDoctorName } from "@/lib/selectors";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function ShiftCalendarPage() {
  const { shifts, updateShiftStatus } = useShifts();
  const { doctors, assignDoctorToShift } = useDoctors();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date("2025-05-25"));

  const shiftDates = useMemo(() => new Set(shifts.map((s) => s.date)), [shifts]);
  const selectedKey = toDateKey(selectedDate);
  const dayShifts = shifts.filter((s) => s.date === selectedKey);

  return (
    <div>
      <PageHeader
        title="Shift Calendar"
        description="Assign doctors, track live status, and close out completed shifts by date."
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[auto_minmax(0,1fr)]">
        <Card className="h-fit">
          <CardContent className="p-2">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={(date) => date && setSelectedDate(date)}
              modifiers={{ hasShifts: (date) => shiftDates.has(toDateKey(date)) }}
              modifiersClassNames={{ hasShifts: "font-semibold text-brand" }}
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4 text-brand" />
              Shifts on {formatDate(selectedKey)}
            </CardTitle>
          </CardHeader>
          <CardContent>
            {dayShifts.length === 0 ? (
              <EmptyState icon={CalendarDays} title="No shifts on this date" />
            ) : (
              <ul className="divide-y divide-border">
                {dayShifts.map((shift) => {
                  const meta = shiftStatusMeta[shift.status];
                  const candidateDoctors = doctors.filter(
                    (d) => d.status === "active" && (d.department === shift.department || !d.department)
                  );
                  return (
                    <li key={shift.id} className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="truncate text-sm font-medium text-foreground">{shift.title}</p>
                          <StatusBadge label={meta.label} tone={meta.tone} dot={false} />
                        </div>
                        <p className="truncate text-xs text-muted-foreground">
                          {shift.department} · {shift.startTime}–{shift.endTime} ·{" "}
                          {getDoctorName(shift.assignedDoctorId)}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        {!shift.assignedDoctorId && (
                          <Select
                            onValueChange={(doctorId) => {
                              assignDoctorToShift(shift.id, doctorId);
                              toast.success(`${getDoctorName(doctorId)} assigned to ${shift.title}`);
                            }}
                          >
                            <SelectTrigger className="w-[180px]">
                              <SelectValue placeholder="Assign doctor" />
                            </SelectTrigger>
                            <SelectContent>
                              {candidateDoctors.length === 0 ? (
                                <SelectItem value="none" disabled>
                                  No available doctors
                                </SelectItem>
                              ) : (
                                candidateDoctors.map((d) => (
                                  <SelectItem key={d.id} value={d.id}>
                                    Dr. {d.firstName} {d.lastName}
                                  </SelectItem>
                                ))
                              )}
                            </SelectContent>
                          </Select>
                        )}
                        {(shift.status === "active" || shift.status === "confirmed") && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              updateShiftStatus(shift.id, "completed");
                              toast.success(`${shift.title} closed`);
                            }}
                          >
                            <CheckCircle2 className="size-4" /> Close Shift
                          </Button>
                        )}
                        {shift.status === "open" && !shift.assignedDoctorId && (
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <UserPlus className="size-3.5" /> Unassigned
                          </span>
                        )}
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
