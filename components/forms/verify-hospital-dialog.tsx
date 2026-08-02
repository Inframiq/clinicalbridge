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
import { useFacilities } from "@/hooks/use-facilities";
import type { Facility } from "@/lib/mock-data/organizations";
import type { HospitalVerification } from "@/types";

const CHECKS: { key: keyof HospitalVerification; label: string }[] = [
  { key: "governmentRegistration", label: "Government Registration Certificate" },
  { key: "medicalLicense", label: "Medical License" },
  { key: "taxRegistration", label: "Tax Registration" },
  { key: "accreditation", label: "Hospital Accreditation" },
  { key: "authorizedSignatory", label: "Authorized Signatory Proof" },
];

export function VerifyHospitalDialog({
  facility,
  trigger,
}: {
  facility: Facility;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const { updateFacilityVerification } = useFacilities();

  const verification: HospitalVerification =
    facility.verification ?? {
      governmentRegistration: false,
      medicalLicense: false,
      taxRegistration: false,
      accreditation: false,
      authorizedSignatory: false,
    };
  const allVerified = Object.values(verification).every(Boolean);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Verification Checklist</DialogTitle>
          <DialogDescription>
            All five documents must be verified before this hospital can go live.
          </DialogDescription>
        </DialogHeader>

        <div>
          <p className="text-sm font-medium text-foreground">{facility.name}</p>
          <p className="text-xs text-muted-foreground">
            {facility.hospitalType} · {facility.city}
          </p>
          <p className="text-xs text-muted-foreground">
            Reg. No. {facility.registrationNumber} · License {facility.governmentLicense}
          </p>
        </div>

        <div className="space-y-3 rounded-xl border border-border p-4">
          {CHECKS.map((check) => (
            <label key={check.key} className="flex items-center gap-3 text-sm">
              <Checkbox
                checked={verification[check.key]}
                onCheckedChange={(checked) => {
                  updateFacilityVerification(facility.id, { [check.key]: checked === true });
                }}
              />
              {check.label}
            </label>
          ))}
        </div>

        {allVerified && (
          <p className="text-sm font-medium text-success">
            All checks complete — this hospital is Verified and live on the platform.
          </p>
        )}
      </DialogContent>
    </Dialog>
  );
}
