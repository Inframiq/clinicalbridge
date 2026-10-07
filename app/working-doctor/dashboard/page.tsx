"use client";

import { toast } from "sonner";
import { CalendarDays, CalendarCheck, ClipboardList, CheckCircle2, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { LicenseExpiryAlert } from "@/components/dashboard/license-expiry-alert";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { EmptyState } from "@/components/dashboard/empty-state";
import { RequestReplacementDialog } from "@/components/forms/request-replacement-dialog";
import { useShifts } from "@/hooks/use-shifts";
import { useReplacementRequests } from "@/hooks/use-replacement-requests";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuthRole } from "@/context/auth-provider";
import { formatDate } from "@/lib/format";
import { shiftStatusMeta } from "@/lib/status";

const replacementStatusMeta = {
  pending: { label: "Pending Review", tone: "warning" as const },
  approved: { label: "Approved", tone: "success" as const },
  rejected: { label: "Rejected", tone: "danger" as const },
  filled: { label: "Filled", tone: "info" as const },
};

export default function WorkingDoctorDashboardPage() {
  const { shifts, confirmShiftAttendance } = useShifts();
  const { replacementRequests } = useReplacementRequests();
  const { doctors } = useDoctors();
  const { profile } = useAuthRole();
  const myDoctor = doctors.find((d) => d.profileId === profile?.id);

  const myShifts = shifts
    .filter((s) => s.assignedDoctorId === myDoctor?.id)
    .sort((a, b) => a.date.localeCompare(b.date));
  const today = myShifts.filter((s) => s.status === "active");
  const upcoming = myShifts.filter((s) => s.status === "confirmed" || s.status === "pending");
  const myRequests = replacementRequests.filter(
    (r) => r.requestingDoctorId === myDoctor?.id
  );
  const pendingRequests = myRequests.filter((r) => r.status === "pending");

  return (
    <div>
      <PageHeader
        title={`Good morning${myDoctor ? `, Dr. ${myDoctor.lastName}` : ""} 👋`}
        description="Here's your schedule and any coverage that needs attention."
      />

      <LicenseExpiryAlert licenseExpiry={myDoctor?.licenseExpiry} />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Today's Shifts" value={String(today.length)} icon={CalendarCheck} iconTone="brand" />
        <StatCard label="Upcoming Duties" value={String(upcoming.length)} icon={CalendarDays} iconTone="info" />
        <StatCard
          label="Pending Replacement Requests"
          value={String(pendingRequests.length)}
          icon={ClipboardList}
          iconTone="warning"
          helpText="Sent to your hospital for approval"
        />
        <StatCard
          label="Preferred Department"
          value={myDoctor?.specialty ?? "—"}
          icon={CheckCircle2}
          iconTone="success"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="My Shift Calendar"
          description="Confirm availability or request a replacement"
          viewAllHref="/working-doctor/schedule"
          className="lg:col-span-2"
        >
          {myShifts.length === 0 ? (
            <EmptyState
              icon={CalendarDays}
              title="No shifts scheduled yet"
              description="Your hospital will assign shifts to your calendar, and they'll show up here."
            />
          ) : (
            <ul className="divide-y divide-border">
              {myShifts.map((shift) => (
                <li
                  key={shift.id}
                  className="flex flex-col gap-3 py-4 first:pt-0 last:pb-0 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="truncate text-sm font-medium text-foreground">{shift.title}</p>
                      <StatusBadge
                        label={shiftStatusMeta[shift.status].label}
                        tone={shiftStatusMeta[shift.status].tone}
                        dot={false}
                      />
                    </div>
                    <p className="truncate text-xs text-muted-foreground">
                      {shift.department} · {formatDate(shift.date)} · {shift.startTime}–{shift.endTime}
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    {shift.attendanceConfirmed ? (
                      <StatusBadge label="Confirmed" tone="success" dot={false} />
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
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="My Replacement Requests" viewAllHref="/working-doctor/replacement-requests">
          {myRequests.length === 0 ? (
            <EmptyState
              icon={ClipboardList}
              title="No requests yet"
              description="Requests you submit will appear here with their approval status."
            />
          ) : (
            <ul className="space-y-3">
              {myRequests.map((request) => {
                const shift = shifts.find((s) => s.id === request.shiftId);
                const meta = replacementStatusMeta[request.status];
                return (
                  <li key={request.id} className="flex items-center justify-between gap-2">
                    <span className="truncate text-sm text-foreground">{shift?.title ?? "Shift"}</span>
                    <StatusBadge label={meta.label} tone={meta.tone} dot={false} />
                  </li>
                );
              })}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
