"use client";

import { useState } from "react";
import { CheckCircle2, ShieldX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import { DocumentPreviewCard } from "@/components/forms/document-preview-card";
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

function documentLabel(key: string) {
  const check = CHECKS.find((c) => c.key === key);
  if (check) return check.label;
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

export function VerifyHospitalDialog({
  facility,
  trigger,
}: {
  facility: Facility;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [viewedDocs, setViewedDocs] = useState<Set<string>>(new Set());
  const { updateFacilityVerification, approveFacilityRegistration, rejectFacilityRegistration } = useFacilities();

  const verification: HospitalVerification =
    facility.verification ?? {
      governmentRegistration: false,
      medicalLicense: false,
      taxRegistration: false,
      accreditation: false,
      authorizedSignatory: false,
    };
  const allChecksPassed = Object.values(verification).every(Boolean);

  const uploadedDocs = Object.entries(facility.uploadedDocuments ?? {});
  const allDocsViewed = uploadedDocs.length > 0 && uploadedDocs.every(([key]) => viewedDocs.has(key));
  const alreadyDecided = facility.registrationStatus === "Approved" || facility.registrationStatus === "Rejected";

  function markViewed(key: string) {
    setViewedDocs((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  function handleApprove() {
    approveFacilityRegistration(facility.id);
    setOpen(false);
  }

  function handleReject() {
    rejectFacilityRegistration(facility.id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Verification Checklist</DialogTitle>
          <DialogDescription>
            Preview every uploaded document before approving or rejecting this hospital.
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
          {facility.registrationStatus && (
            <p className="mt-1 text-xs font-medium text-muted-foreground">
              Registration status: {facility.registrationStatus}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <p className="text-xs font-medium text-muted-foreground">Uploaded Documents</p>
          {uploadedDocs.length === 0 ? (
            <p className="text-sm text-destructive">No documents uploaded</p>
          ) : (
            <div className="space-y-2">
              {uploadedDocs.map(([key, file]) => (
                <DocumentPreviewCard
                  key={key}
                  label={documentLabel(key)}
                  file={file}
                  viewed={viewedDocs.has(key)}
                  onView={() => markViewed(key)}
                />
              ))}
            </div>
          )}
        </div>

        <div className="space-y-3 rounded-xl border border-border p-4">
          {CHECKS.map((check) => {
            const docViewed = viewedDocs.has(check.key);
            return (
              <label
                key={check.key}
                className="flex items-center gap-3 text-sm"
                title={docViewed ? undefined : "Preview this document before marking it verified"}
              >
                <Checkbox
                  checked={verification[check.key]}
                  disabled={!docViewed}
                  onCheckedChange={(checked) => {
                    updateFacilityVerification(facility.id, { [check.key]: checked === true });
                  }}
                />
                {check.label}
                {!docViewed && <span className="text-xs text-muted-foreground">(preview required)</span>}
              </label>
            );
          })}
        </div>

        {allChecksPassed && (
          <p className="text-sm font-medium text-success">
            All checks complete — this hospital is Verified and live on the platform.
          </p>
        )}

        {!allDocsViewed && uploadedDocs.length > 0 && (
          <p className="text-xs text-muted-foreground">
            Preview all {uploadedDocs.length} document{uploadedDocs.length > 1 ? "s" : ""} above to unlock approve/reject.
          </p>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            className="text-destructive hover:text-destructive"
            disabled={!allDocsViewed || alreadyDecided}
            onClick={handleReject}
          >
            <ShieldX className="size-4" /> Reject
          </Button>
          <Button type="button" disabled={!allDocsViewed || alreadyDecided} onClick={handleApprove}>
            <CheckCircle2 className="size-4" /> Approve Registration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
