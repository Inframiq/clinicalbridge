import { Download, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { Person } from "@/components/dashboard/person";
import type { JoinedPostShiftRecord } from "@/lib/selectors";
import { getDoctorById } from "@/lib/selectors";
import { formatCurrency, formatDate } from "@/lib/format";
import { payoutStatusMeta } from "@/lib/status";
import type { Doctor } from "@/types";

export function PostShiftDetailPanel({
  record,
  showDoctor = true,
  actions,
  doctors = [],
}: {
  record: JoinedPostShiftRecord;
  showDoctor?: boolean;
  actions?: React.ReactNode;
  doctors?: Doctor[];
}) {
  const meta = payoutStatusMeta[record.status];
  const doctor = getDoctorById(doctors, record.doctorId);

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium text-foreground">{record.shift?.title ?? "Shift"}</p>
          <p className="text-sm text-muted-foreground">{record.shift?.facilityName}</p>
        </div>
        <StatusBadge label={meta.label} tone={meta.tone} />
      </div>

      {record.shift && (
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Date</p>
            <p className="mt-0.5 font-medium text-foreground">{formatDate(record.shift.date)}</p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Hours</p>
            <p className="mt-0.5 font-medium text-foreground">{record.hours.toFixed(2)}</p>
          </div>
        </div>
      )}

      {showDoctor && doctor && (
        <div>
          <p className="mb-2 text-xs font-medium text-muted-foreground">Doctor Information</p>
          <Person
            name={`Dr. ${doctor.firstName} ${doctor.lastName}`}
            subtitle={`${doctor.specialty} · License ${doctor.licenseNumber}`}
          />
        </div>
      )}

      <Separator />

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Financial Summary</p>
        <dl className="space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Hourly Rate</dt>
            <dd className="font-medium text-foreground">{formatCurrency(record.hourlyRate)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Total Hours</dt>
            <dd className="font-medium text-foreground">{record.hours.toFixed(2)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Gross Pay</dt>
            <dd className="font-medium text-foreground">{formatCurrency(record.grossPay)}</dd>
          </div>
          <div className="flex justify-between">
            <dt className="text-muted-foreground">Platform Fee ({record.platformFeePct}%)</dt>
            <dd className="font-medium text-destructive">
              -{formatCurrency(record.grossPay - record.netPayout)}
            </dd>
          </div>
          <Separator className="my-1.5" />
          <div className="flex justify-between text-base">
            <dt className="font-medium text-foreground">Net Payout</dt>
            <dd className="font-semibold text-success">{formatCurrency(record.netPayout)}</dd>
          </div>
        </dl>
      </div>

      <Separator />

      <div>
        <p className="mb-2 text-xs font-medium text-muted-foreground">Documents</p>
        <div className="space-y-2">
          {record.hasTimesheet && (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" /> Timesheet
              </span>
              <Button size="icon" variant="ghost" className="size-7">
                <Download className="size-3.5" />
              </Button>
            </div>
          )}
          {record.hasClinicalNotes && (
            <div className="flex items-center justify-between rounded-lg border border-border px-3 py-2 text-sm">
              <span className="flex items-center gap-2">
                <FileText className="size-4 text-muted-foreground" /> Clinical Notes
              </span>
              <Button size="icon" variant="ghost" className="size-7">
                <Download className="size-3.5" />
              </Button>
            </div>
          )}
        </div>
      </div>

      {actions && <div className="flex flex-wrap gap-2 pt-1">{actions}</div>}
    </div>
  );
}
