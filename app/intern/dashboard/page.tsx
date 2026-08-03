"use client";

import { toast } from "sonner";
import { DollarSign, Eye, GraduationCap, CalendarDays, ClipboardList, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ShiftDetailsSheet } from "@/components/dashboard/shift-details-sheet";
import { useShifts } from "@/hooks/use-shifts";
import { useApplications } from "@/hooks/use-applications";
import { useDoctors } from "@/hooks/use-doctors";
import { usePayments } from "@/hooks/use-payments";
import { currentIntern } from "@/lib/mock-data/doctors";
import { formatCurrency, formatDate } from "@/lib/format";

export default function InternDashboardPage() {
  const { shifts } = useShifts();
  const { applications, applyToShift } = useApplications();
  const { doctors } = useDoctors();
  const { payments } = usePayments();

  const me = doctors.find((d) => d.id === currentIntern.id) ?? currentIntern;
  const preferredDepartments = me.replacementPreferences?.preferredDepartments ?? [];

  const myApplications = applications.filter((a) => a.doctorId === currentIntern.id);
  const appliedShiftIds = new Set(myApplications.map((a) => a.shiftId));

  const opportunities = shifts.filter((s) => {
    if (s.status !== "open") return false;
    if (s.replacementStage === "locum_only") return false;
    if (s.experienceLevel === "Senior" || s.experienceLevel === "Expert") return false;
    if (preferredDepartments.length > 0 && !preferredDepartments.includes(s.department)) return false;
    return !appliedShiftIds.has(s.id);
  });

  const totalEarnings = payments
    .filter((p) => p.doctorId === currentIntern.id)
    .reduce((sum, p) => sum + p.netPayout, 0);

  return (
    <div>
      <PageHeader
        title={`Welcome, ${currentIntern.firstName} 👋`}
        description="Supervised replacement opportunities matched to your training level."
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Available Opportunities"
          value={String(opportunities.length)}
          icon={GraduationCap}
          iconTone="brand"
        />
        <StatCard
          label="Accepted Assignments"
          value={String(myApplications.filter((a) => a.status === "accepted").length)}
          icon={CalendarDays}
          iconTone="success"
        />
        <StatCard
          label="Applications Pending"
          value={String(myApplications.filter((a) => a.status === "in_review").length)}
          icon={ClipboardList}
          iconTone="warning"
        />
        <StatCard
          label="Earnings"
          value={formatCurrency(totalEarnings, { decimals: false })}
          icon={DollarSign}
          iconTone="info"
        />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-3">
        <ChartCard
          title="Available Replacement Opportunities"
          description="Escalated to interns after no locum doctors accepted"
          viewAllHref="/intern/opportunities"
          className="lg:col-span-2"
        >
          {opportunities.length === 0 ? (
            <EmptyState
              icon={GraduationCap}
              title="No opportunities right now"
              description="Supervised shifts appear here once a hospital escalates a replacement request."
            />
          ) : (
            <ul className="divide-y divide-border">
              {opportunities.slice(0, 4).map((shift) => (
                <li key={shift.id} className="flex items-center justify-between gap-3 py-3 first:pt-0 last:pb-0">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{shift.title}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {shift.facilityName} · {formatDate(shift.date)} · {shift.startTime}–{shift.endTime} ·{" "}
                      {formatCurrency(shift.hourlyRate)}/hr
                    </p>
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <Button
                      size="sm"
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
                          <Eye className="size-4" />
                        </Button>
                      }
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Training Progress">
          <EmptyState
            icon={ShieldCheck}
            title="On track"
            description="Supervised-hours tracking and sign-off history will appear here."
          />
        </ChartCard>
      </div>
    </div>
  );
}
