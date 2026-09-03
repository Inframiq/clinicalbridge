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
import { Person } from "@/components/dashboard/person";
import { DocumentPreviewCard } from "@/components/forms/document-preview-card";
import { useDoctors } from "@/hooks/use-doctors";
import type { Doctor, DoctorVerification } from "@/types";

const CHECKS: { key: keyof DoctorVerification; label: string }[] = [
  { key: "medicalCouncil", label: "Medical Council Registration Verification" },
  { key: "degree", label: "Degree Verification" },
  { key: "identity", label: "Identity Verification" },
  { key: "hospitalApproval", label: "Hospital Approval" },
];

function humanizeKey(key: string) {
  return key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim();
}

export function VerifyDoctorDialog({
  doctor,
  trigger,
}: {
  doctor: Doctor;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [viewedDocs, setViewedDocs] = useState<Set<string>>(new Set());
  const { updateDoctorVerification, approveDoctorRegistration, rejectDoctorRegistration } = useDoctors();

  const verification: DoctorVerification =
    doctor.verification ?? { medicalCouncil: false, degree: false, identity: false, hospitalApproval: false };
  const allChecksPassed = Object.values(verification).every(Boolean);

  const uploadedDocs = Object.entries(doctor.uploadedDocuments ?? {});
  const allDocsViewed = uploadedDocs.length > 0 && uploadedDocs.every(([key]) => viewedDocs.has(key));
  const alreadyDecided = doctor.registrationStatus === "Approved" || doctor.registrationStatus === "Rejected";

  function markViewed(key: string) {
    setViewedDocs((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }

  function handleApprove() {
    approveDoctorRegistration(doctor.id);
    setOpen(false);
  }

  function handleReject() {
    rejectDoctorRegistration(doctor.id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Verification Checklist</DialogTitle>
          <DialogDescription>
            Preview every uploaded document before approving or rejecting this doctor.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center justify-between gap-3">
          <Person name={`Dr. ${doctor.firstName} ${doctor.lastName}`} subtitle={doctor.department} />
          {doctor.registrationStatus && (
            <span className="text-xs font-medium text-muted-foreground">{doctor.registrationStatus}</span>
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
                  label={humanizeKey(key)}
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
                    updateDoctorVerification(doctor.id, { [check.key]: checked === true });
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
            All checks complete — this doctor is Active and can log in.
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
