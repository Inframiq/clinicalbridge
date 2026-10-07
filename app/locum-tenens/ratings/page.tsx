"use client";

import { Star } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { StatCard } from "@/components/dashboard/stat-card";
import { ChartCard } from "@/components/dashboard/chart-card";
import { EmptyState } from "@/components/dashboard/empty-state";
import { Button } from "@/components/ui/button";
import { RateHospitalDialog } from "@/components/forms/rate-hospital-dialog";
import { useRatings } from "@/hooks/use-ratings";
import { useShifts } from "@/hooks/use-shifts";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuthRole } from "@/context/auth-provider";
import { formatDate } from "@/lib/format";

function StarRow({ value }: { value: number }) {
  return (
    <div className="flex text-warning">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={i} className={`size-3.5 ${i < Math.round(value) ? "fill-current" : ""}`} />
      ))}
    </div>
  );
}

export default function LocumRatingsPage() {
  const { profile } = useAuthRole();
  const { doctors } = useDoctors();
  const myDoctorId = doctors.find((d) => d.profileId === profile?.id)?.id ?? "";
  const { ratings } = useRatings();
  const { shifts } = useShifts();

  const received = ratings.filter(
    (r) => r.direction === "hospital_to_doctor" && r.doctorId === myDoctorId
  );
  const avgScore = received.length
    ? received.reduce((sum, r) => sum + r.overallScore, 0) / received.length
    : 0;

  const myCompletedShifts = shifts.filter(
    (s) => s.assignedDoctorId === myDoctorId && s.status === "completed"
  );
  const ratedShiftIds = new Set(
    ratings
      .filter((r) => r.direction === "doctor_to_hospital" && r.doctorId === myDoctorId)
      .map((r) => r.shiftId)
  );
  const shiftsToRate = myCompletedShifts.filter((s) => !ratedShiftIds.has(s.id));

  return (
    <div>
      <PageHeader title="Ratings & Reviews" description="Feedback from hospitals, and your own reviews of them." />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <StatCard label="Average Rating" value={avgScore.toFixed(1)} icon={Star} iconTone="brand" helpText={`${received.length} reviews`} />
        <StatCard label="Hospitals to Rate" value={String(shiftsToRate.length)} icon={Star} iconTone="warning" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-6 lg:grid-cols-2">
        <ChartCard title="Ratings You've Received">
          {received.length === 0 ? (
            <EmptyState icon={Star} title="No ratings yet" description="Hospitals rate you after each completed shift." />
          ) : (
            <ul className="space-y-4">
              {received.map((rating) => (
                <li key={rating.id} className="rounded-xl border border-border p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium text-foreground">{formatDate(rating.createdAt)}</p>
                    <StarRow value={rating.overallScore} />
                  </div>
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
                    {Object.entries(rating.categories).map(([category, score]) => (
                      <div key={category} className="flex items-center justify-between gap-2">
                        <span>{category}</span>
                        <span className="font-medium text-foreground">{score}/5</span>
                      </div>
                    ))}
                  </div>
                  {rating.comment && (
                    <p className="mt-2 text-sm text-muted-foreground italic">&quot;{rating.comment}&quot;</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </ChartCard>

        <ChartCard title="Rate a Hospital" description="Share feedback on completed shifts">
          {shiftsToRate.length === 0 ? (
            <EmptyState icon={Star} title="Nothing to rate" description="Completed shifts you haven't reviewed yet will appear here." />
          ) : (
            <ul className="space-y-3">
              {shiftsToRate.map((shift) => (
                <li key={shift.id} className="flex items-center justify-between gap-3 rounded-xl border border-border p-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-medium text-foreground">{shift.facilityName}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {shift.title} · {formatDate(shift.date)}
                    </p>
                  </div>
                  <RateHospitalDialog
                    shift={shift}
                    doctorId={myDoctorId}
                    trigger={<Button size="sm" variant="outline">Rate</Button>}
                  />
                </li>
              ))}
            </ul>
          )}
        </ChartCard>
      </div>
    </div>
  );
}
