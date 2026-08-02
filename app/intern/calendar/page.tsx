"use client";

import { useMemo, useState } from "react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { CalendarDays } from "lucide-react";
import { useShifts } from "@/hooks/use-shifts";
import { currentIntern } from "@/lib/mock-data/doctors";
import { shiftStatusMeta } from "@/lib/status";

function toDateKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

export default function InternCalendarPage() {
  const { shifts: allShifts } = useShifts();
  const myShifts = useMemo(
    () => allShifts.filter((s) => s.assignedDoctorId === currentIntern.id),
    [allShifts]
  );
  const scheduledDates = useMemo(() => myShifts.map((s) => new Date(s.date)), [myShifts]);
  const [selected, setSelected] = useState<Date | undefined>(new Date("2025-05-25"));

  const shiftsOnDay = selected ? myShifts.filter((s) => s.date === toDateKey(selected)) : [];

  return (
    <div>
      <PageHeader title="Calendar" description="Your upcoming and past supervised shifts." />
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
                    <li key={shift.id} className="flex items-center justify-between rounded-xl border border-border p-4">
                      <div>
                        <p className="font-medium text-foreground">{shift.title}</p>
                        <p className="text-sm text-muted-foreground">
                          {shift.facilityName} · {shift.startTime} - {shift.endTime}
                        </p>
                      </div>
                      <StatusBadge label={meta.label} tone={meta.tone} />
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
