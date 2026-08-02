"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Person } from "@/components/dashboard/person";
import { useDoctors } from "@/hooks/use-doctors";
import type { Doctor, DoctorVerification } from "@/types";

const CHECKS: { key: keyof DoctorVerification; label: string }[] = [
  { key: "medicalCouncil", label: "Medical Council Registration Verification" },
  { key: "degree", label: "Degree Verification" },
  { key: "identity", label: "Identity Verification" },
  { key: "hospitalApproval", label: "Hospital Approval" },
];

export function VerifyDoctorDialog({
  doctor,
  trigger,
}: {
  doctor: Doctor;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { updateDoctorVerification } = useDoctors();

  const verification: DoctorVerification =
    doctor.verification ?? { medicalCouncil: false, degree: false, identity: false, hospitalApproval: false };
  const allVerified = Object.values(verification).every(Boolean);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verification Checklist</DialogTitle>
          <DialogDescription>
            All four checks must pass before this doctor can be activated.
          </DialogDescription>
        </DialogHeader>

        <Person name={`Dr. ${doctor.firstName} ${doctor.lastName}`} subtitle={doctor.department} />

        <div className="space-y-3 rounded-xl border border-border p-4">
          {CHECKS.map((check) => (
            <label key={check.key} className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={verification[check.key]}
                onCheckedChange={(checked) => {
                  updateDoctorVerification(doctor.id, { [check.key]: checked === true });
                }}
              />
              {check.label}
            </label>
          ))}
        </div>

        {allVerified && (
          <p className="text-sm font-medium text-success">
            All checks complete — this doctor is Active and can log in.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
