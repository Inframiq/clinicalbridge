import { Clock, MapPin, Wallet } from "lucide-react";
import { Person } from "@/components/dashboard/person";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Progress } from "@/components/ui/progress";
import type { Shift } from "@/types";
import { shiftStatusMeta } from "@/lib/status";
import { formatCurrency, formatHoursMinutes } from "@/lib/format";
import { getDoctorName } from "@/lib/selectors";

export function ShiftDetailPanel({ shift }: { shift: Shift }) {
  const meta = shiftStatusMeta[shift.status];
  const elapsed = shift.elapsedMinutes ?? 0;
  const total = shift.totalMinutes ?? 480;
  const remaining = Math.max(0, total - elapsed);
  const progressPct = shift.progressPct ?? Math.round((elapsed / total) * 100);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <Person
          name={getDoctorName(shift.assignedDoctorId)}
          subtitle={shift.title}
        />
        {shift.codeRed ? (
          <StatusBadge label="Code Red Shift" tone="danger" />
        ) : (
          <StatusBadge label={meta.label} tone={meta.tone} />
        )}
      </div>

      <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 text-sm sm:grid-cols-3">
        <div>
          <p className="text-xs text-muted-foreground">Department</p>
          <p className="mt-0.5 font-medium text-foreground">{shift.department}</p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Location</p>
          <p className="mt-0.5 flex items-center gap-1 font-medium text-foreground">
            <MapPin className="size-3.5 text-muted-foreground" />
            {shift.facilityName}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Shift Time</p>
          <p className="mt-0.5 flex items-center gap-1 font-medium text-foreground">
            <Clock className="size-3.5 text-muted-foreground" />
            {shift.startTime} - {shift.endTime}
          </p>
        </div>
        <div>
          <p className="text-xs text-muted-foreground">Hourly Rate</p>
          <p className="mt-0.5 flex items-center gap-1 font-medium text-foreground">
            <Wallet className="size-3.5 text-muted-foreground" />
            {formatCurrency(shift.hourlyRate)}/hr
          </p>
        </div>
      </div>

      {shift.status === "active" && (
        <div>
          <div className="mb-2 flex items-center justify-between">
            <p className="text-sm font-medium text-foreground">Shift Progress</p>
            <p className="text-sm font-semibold text-foreground">{progressPct}%</p>
          </div>
          <Progress value={progressPct} />
          <div className="mt-3 grid grid-cols-3 gap-3 text-center text-sm">
            <div>
              <p className="font-semibold text-foreground">{formatHoursMinutes(elapsed)}</p>
              <p className="text-xs text-muted-foreground">Elapsed</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">
                {formatHoursMinutes(shift.breakMinutes ?? 0)}
              </p>
              <p className="text-xs text-muted-foreground">Break Time</p>
            </div>
            <div>
              <p className="font-semibold text-foreground">{formatHoursMinutes(remaining)}</p>
              <p className="text-xs text-muted-foreground">Remaining</p>
            </div>
          </div>
        </div>
      )}

      <p className="text-sm text-muted-foreground">{shift.description}</p>
    </div>
  );
}
