"use client";

import { useState } from "react";
import { CheckCircle2, ShieldX } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { DocumentPreviewCard } from "@/components/forms/document-preview-card";
import { useFacilities } from "@/hooks/use-facilities";
import type { Facility } from "@/lib/mock-data/organizations";
import type { DocumentReviewStatus } from "@/lib/supabase/storage";

const KNOWN_LABELS: Record<string, string> = {
  governmentRegistration: "Government Registration Certificate",
  medicalLicense: "Medical License",
  taxRegistration: "Tax Registration",
  accreditation: "Hospital Accreditation",
  authorizedSignatory: "Authorized Signatory Proof",
};

function documentLabel(key: string) {
  return (
    KNOWN_LABELS[key] ??
    key.replace(/([A-Z])/g, " $1").replace(/^./, (s) => s.toUpperCase()).trim()
  );
}

export function VerifyHospitalDialog({
  facility,
  trigger,
}: {
  facility: Facility;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const {
    reviewFacilityDocument,
    markFacilityDocumentViewed,
    approveFacilityRegistration,
    rejectFacilityRegistration,
  } = useFacilities();

  const uploadedDocs = Object.entries(facility.uploadedDocuments ?? {});
  const statusOf = (s?: DocumentReviewStatus): DocumentReviewStatus => s ?? "pending";
  const approvedCount = uploadedDocs.filter(([, f]) => statusOf(f.status) === "approved").length;
  const rejectedCount = uploadedDocs.filter(([, f]) => statusOf(f.status) === "rejected").length;
  const allApproved = uploadedDocs.length > 0 && approvedCount === uploadedDocs.length;
  const alreadyDecided =
    facility.registrationStatus === "Approved" || facility.registrationStatus === "Rejected";

  function handleReview(key: string, decision: "approved" | "rejected") {
    void reviewFacilityDocument(facility.id, key, decision);
  }

  function handleView(key: string) {
    void markFacilityDocumentViewed(facility.id, key);
  }

  function handleApprove() {
    void approveFacilityRegistration(facility.id);
    setOpen(false);
  }

  function handleReject() {
    void rejectFacilityRegistration(facility.id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-12">
          <DialogTitle>Document Verification</DialogTitle>
          <DialogDescription>
            Approve or reject each uploaded document. The hospital only goes live once every
            document is approved; a single rejection rejects the registration.
          </DialogDescription>
          <div className="mt-3">
            <p className="text-sm font-medium text-foreground">{facility.name}</p>
            <p className="text-xs text-muted-foreground">
              {facility.hospitalType} · {facility.city} · Reg. No. {facility.registrationNumber}
            </p>
            {facility.registrationStatus && (
              <p className="mt-1 text-xs font-medium text-muted-foreground">
                Registration status: {facility.registrationStatus}
              </p>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {uploadedDocs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-destructive">
              No documents were uploaded by this hospital.
            </p>
          ) : (
            uploadedDocs.map(([key, file]) => (
              <DocumentPreviewCard
                key={key}
                label={documentLabel(key)}
                file={file}
                status={statusOf(file.status)}
                reviewedAt={file.reviewedAt}
                viewedAt={file.viewedAt}
                readOnly={alreadyDecided}
                onApprove={() => handleReview(key, "approved")}
                onReject={() => handleReview(key, "rejected")}
                onView={() => handleView(key)}
              />
            ))
          )}

          {rejectedCount > 0 && (
            <p className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
              {rejectedCount} document{rejectedCount > 1 ? "s were" : " was"} rejected — this
              registration is rejected.
            </p>
          )}
          {allApproved && !alreadyDecided && (
            <p className="rounded-lg bg-success/10 p-3 text-sm font-medium text-success">
              All documents approved — you can now approve the registration.
            </p>
          )}
        </div>

        <div className="flex shrink-0 flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            {uploadedDocs.length === 0
              ? "No documents to review."
              : `${approvedCount} of ${uploadedDocs.length} document${
                  uploadedDocs.length > 1 ? "s" : ""
                } approved${rejectedCount > 0 ? ` · ${rejectedCount} rejected` : ""}`}
          </p>
          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              className="text-destructive hover:text-destructive"
              disabled={alreadyDecided}
              onClick={handleReject}
            >
              <ShieldX className="size-4" /> Reject Registration
            </Button>
            <Button type="button" disabled={!allApproved || alreadyDecided} onClick={handleApprove}>
              <CheckCircle2 className="size-4" /> Approve Registration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
