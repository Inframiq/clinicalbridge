"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Bookmark, BookmarkCheck, CheckCircle2, MessageSquare, Phone, User, XCircle } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { StatusBadge } from "@/components/dashboard/status-badge";
import { LiveMap } from "@/components/dashboard/live-map";
import { useApplications } from "@/hooks/use-applications";
import { useSavedShifts } from "@/hooks/use-saved-shifts";
import { useShifts } from "@/hooks/use-shifts";
import { formatCurrency, formatDate } from "@/lib/format";
import { shiftStatusMeta } from "@/lib/status";
import type { Shift } from "@/types";

export function ShiftDetailsSheet({
  shift,
  currentDoctorId,
  trigger,
}: {
  shift: Shift;
  currentDoctorId: string;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  const { applyToShift } = useApplications();
  const { savedShifts, toggleSaveShift } = useSavedShifts();
  const { respondToShiftAssignment } = useShifts();

  const meta = shiftStatusMeta[shift.status];
  const isSaved = savedShifts.some((s) => s.shiftId === shift.id && s.doctorId === currentDoctorId);
  const isMyPendingAssignment =
    shift.assignedDoctorId === currentDoctorId && shift.status === "pending";

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>{trigger}</SheetTrigger>
      <SheetContent className="overflow-y-auto sm:max-w-md">
        <SheetHeader>
          <div className="flex items-center gap-2">
            <SheetTitle>{shift.title}</SheetTitle>
            <StatusBadge label={meta.label} tone={meta.tone} dot={false} />
          </div>
          <SheetDescription>
            {shift.department} · {formatDate(shift.date)} · {shift.startTime}–{shift.endTime}
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-5 px-4">
          <div>
            <p className="text-xs font-medium text-muted-foreground">Hospital</p>
            <p className="mt-1 text-sm font-medium text-foreground">{shift.facilityName}</p>
            <p className="text-sm text-muted-foreground">
              {formatCurrency(shift.hourlyRate)}/hr · {shift.experienceLevel}
            </p>
          </div>

          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">Reporting Location</p>
            <LiveMap
              address={`${shift.location.address}, ${shift.location.city}, ${shift.location.state}`}
            />
          </div>

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-xs text-muted-foreground">Reporting Time</p>
              <p className="mt-0.5 font-medium text-foreground">{shift.startTime}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Supervisor</p>
              <p className="mt-0.5 flex items-center gap-1 font-medium text-foreground">
                <User className="size-3.5 text-muted-foreground" />
                {shift.supervisorName ?? "Assigned on arrival"}
              </p>
            </div>
            <div className="col-span-2">
              <p className="text-xs text-muted-foreground">Emergency Contact</p>
              <p className="mt-0.5 flex items-center gap-1 font-medium text-foreground">
                <Phone className="size-3.5 text-muted-foreground" />
                {shift.emergencyContact ?? "Provided at check-in"}
              </p>
            </div>
          </div>

          <div>
            <p className="text-xs font-medium text-muted-foreground">Shift Instructions</p>
            <p className="mt-1 text-sm text-muted-foreground">{shift.description}</p>
          </div>
        </div>

        <SheetFooter>
          {isMyPendingAssignment ? (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  respondToShiftAssignment(shift.id, true);
                  toast.success(`Accepted ${shift.title}`);
                  setOpen(false);
                }}
              >
                <CheckCircle2 className="size-4" /> Accept Assignment
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => {
                  respondToShiftAssignment(shift.id, false);
                  toast.success(`Declined ${shift.title}`);
                  setOpen(false);
                }}
              >
                <XCircle className="size-4" /> Decline
              </Button>
            </div>
          ) : shift.status === "open" ? (
            <div className="flex gap-2">
              <Button
                className="flex-1"
                onClick={() => {
                  applyToShift(shift.id, currentDoctorId);
                  toast.success(`Applied to ${shift.title}`);
                  setOpen(false);
                }}
              >
                Apply for Shift
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={() => toggleSaveShift(shift.id, currentDoctorId)}
                aria-label={isSaved ? "Unsave shift" : "Save shift"}
              >
                {isSaved ? <BookmarkCheck className="size-4 text-brand" /> : <Bookmark className="size-4" />}
              </Button>
            </div>
          ) : null}
          <Button
            variant="ghost"
            onClick={() => {
              toast.success(`Message sent to ${shift.facilityName}`);
              router.push("/locum/messages");
            }}
          >
            <MessageSquare className="size-4" /> Contact Hospital Coordinator
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
