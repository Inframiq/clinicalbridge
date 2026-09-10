"use client";

import { useMemo, useState } from "react";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, MapPin, Store, Users, Eye } from "lucide-react";
import { PageHeader } from "@/components/layout/page-header";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState } from "@/components/dashboard/empty-state";
import { ShiftDetailsSheet } from "@/components/dashboard/shift-details-sheet";
import { useShifts } from "@/hooks/use-shifts";
import { useApplications } from "@/hooks/use-applications";
import { useSavedShifts } from "@/hooks/use-saved-shifts";
import { useDoctors } from "@/hooks/use-doctors";
import { useAuthRole } from "@/context/auth-provider";
import { formatCurrency, formatDate } from "@/lib/format";
import type { Shift } from "@/types";

function durationHours(start: string, end: string) {
  function toMinutes(t: string) {
    const [time, period] = t.split(" ");
    const [h, m] = time.split(":").map(Number);
    const hour24 = period === "PM" && h !== 12 ? h + 12 : period === "AM" && h === 12 ? 0 : h;
    return hour24 * 60 + m;
  }
  const startMin = toMinutes(start);
  let endMin = toMinutes(end);
  if (endMin <= startMin) endMin += 24 * 60;
  return Math.round(((endMin - startMin) / 60) * 10) / 10;
}

export default function MarketplacePage() {
  const { profile } = useAuthRole();
  const { doctors } = useDoctors();
  const myDoctorId = doctors.find((d) => d.profileId === profile?.id)?.id ?? "";
  const { shifts } = useShifts();
  const { applications, applyToShift } = useApplications();
  const { savedShifts, toggleSaveShift } = useSavedShifts();
  const [tab, setTab] = useState("available");

  const myApplications = applications.filter((a) => a.doctorId === myDoctorId);
  const appliedShiftIds = new Set(myApplications.map((a) => a.shiftId));

  const openShifts = useMemo(() => shifts.filter((s) => s.status === "open"), [shifts]);
  const mySavedShiftIds = new Set(
    savedShifts.filter((s) => s.doctorId === myDoctorId).map((s) => s.shiftId)
  );
  const savedShiftList = shifts.filter((s) => mySavedShiftIds.has(s.id));

  function applicantCount(shiftId: string) {
    return applications.filter((a) => a.shiftId === shiftId).length;
  }

  function ShiftCard({ shift }: { shift: Shift }) {
    const applied = appliedShiftIds.has(shift.id);
    const saved = mySavedShiftIds.has(shift.id);
    return (
      <Card>
        <CardContent className="flex flex-col gap-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <p className="font-medium text-foreground">{shift.title}</p>
              </div>
              <p className="flex items-center gap-1 text-xs text-muted-foreground">
                <MapPin className="size-3" /> {shift.facilityName}
              </p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => toggleSaveShift(shift.id, myDoctorId)}
              aria-label={saved ? "Unsave shift" : "Save shift"}
            >
              {saved ? <BookmarkCheck className="size-4 text-brand" /> : <Bookmark className="size-4" />}
            </Button>
          </div>

          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-xs text-muted-foreground">
            <span>{shift.department}</span>
            <span>{formatDate(shift.date)}</span>
            <span>
              {shift.startTime}–{shift.endTime} ({durationHours(shift.startTime, shift.endTime)}h)
            </span>
            <span className="font-medium text-foreground">{formatCurrency(shift.hourlyRate)}/hr</span>
            <span>{shift.experienceLevel}</span>
            <span className="flex items-center gap-1">
              <Users className="size-3" /> {applicantCount(shift.id)} applicant
              {applicantCount(shift.id) === 1 ? "" : "s"}
            </span>
          </div>

          {shift.requiredQualification && (
            <p className="text-xs text-muted-foreground">Requires: {shift.requiredQualification}</p>
          )}
          {shift.applicationDeadline && (
            <p className="text-xs text-warning-foreground">
              Apply by {formatDate(shift.applicationDeadline)}
            </p>
          )}

          <div className="mt-1 flex items-center gap-2">
            <Button
              size="sm"
              className="flex-1"
              disabled={applied || !myDoctorId}
              onClick={() => {
                applyToShift(shift.id, myDoctorId);
                toast.success(`Applied to ${shift.title}`);
              }}
            >
              {applied ? "Applied" : "Apply"}
            </Button>
            <ShiftDetailsSheet
              shift={shift}
              currentDoctorId={myDoctorId}
              trigger={
                <Button size="sm" variant="outline">
                  <Eye className="size-4" /> Details
                </Button>
              }
            />
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div>
      <PageHeader
        title="Replacement Marketplace"
        description="Browse open shifts published by hospitals and apply directly."
      />

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="available">Available ({openShifts.length})</TabsTrigger>
          <TabsTrigger value="saved">Saved ({savedShiftList.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="available" className="mt-6">
          {openShifts.length === 0 ? (
            <EmptyState icon={Store} title="No open shifts right now" description="Check back soon for new opportunities." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {openShifts.map((shift) => (
                <ShiftCard key={shift.id} shift={shift} />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="saved" className="mt-6">
          {savedShiftList.length === 0 ? (
            <EmptyState icon={Bookmark} title="No saved shifts" description="Bookmark a shift to review it later." />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {savedShiftList.map((shift) => (
                <ShiftCard key={shift.id} shift={shift} />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
