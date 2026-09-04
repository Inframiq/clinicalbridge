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
import { Person } from "@/components/dashboard/person";
import { DocumentPreviewCard } from "@/components/forms/document-preview-card";
import { useDoctors } from "@/hooks/use-doctors";
import type { DocumentReviewStatus } from "@/lib/supabase/storage";
import type { Doctor } from "@/types";

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
  const { reviewDoctorDocument, approveDoctorRegistration, rejectDoctorRegistration } = useDoctors();

  const uploadedDocs = Object.entries(doctor.uploadedDocuments ?? {});
  const statusOf = (s?: DocumentReviewStatus): DocumentReviewStatus => s ?? "pending";
  const approvedCount = uploadedDocs.filter(([, f]) => statusOf(f.status) === "approved").length;
  const rejectedCount = uploadedDocs.filter(([, f]) => statusOf(f.status) === "rejected").length;
  const allApproved = uploadedDocs.length > 0 && approvedCount === uploadedDocs.length;
  const alreadyDecided =
    doctor.registrationStatus === "Approved" || doctor.registrationStatus === "Rejected";

  function handleReview(key: string, decision: "approved" | "rejected") {
    void reviewDoctorDocument(doctor.id, key, decision);
  }

  function handleApprove() {
    void approveDoctorRegistration(doctor.id);
    setOpen(false);
  }

  function handleReject() {
    void rejectDoctorRegistration(doctor.id);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="flex max-h-[90dvh] flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl">
        <div className="shrink-0 border-b border-border px-6 py-4 pr-12">
          <DialogTitle>Document Verification</DialogTitle>
          <DialogDescription>
            Approve or reject each uploaded document. The doctor is only marked verified once
            every document is approved; a single rejection rejects the registration.
          </DialogDescription>
          <div className="mt-3 flex items-center justify-between gap-3">
            <Person name={`Dr. ${doctor.firstName} ${doctor.lastName}`} subtitle={doctor.department} />
            {doctor.registrationStatus && (
              <span className="text-xs font-medium text-muted-foreground">
                {doctor.registrationStatus}
              </span>
            )}
          </div>
        </div>

        <div className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
          {uploadedDocs.length === 0 ? (
            <p className="rounded-lg border border-dashed border-border p-6 text-center text-sm text-destructive">
              No documents were uploaded by this doctor.
            </p>
          ) : (
            uploadedDocs.map(([key, file]) => (
              <DocumentPreviewCard
                key={key}
                label={humanizeKey(key)}
                file={file}
                status={statusOf(file.status)}
                reviewedAt={file.reviewedAt}
                readOnly={alreadyDecided}
                onApprove={() => handleReview(key, "approved")}
                onReject={() => handleReview(key, "rejected")}
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
