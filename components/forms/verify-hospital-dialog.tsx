"use client";

import { useState } from "react";
import { CheckCircle2, Mail, Phone, ShieldX, User } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentPreviewCard } from "@/components/forms/document-preview-card";
import { BasicInfoReviewPanel } from "@/components/forms/basic-info-review-panel";
import { useFacilities } from "@/hooks/use-facilities";
import type { Facility } from "@/lib/supabase/services/facilities";
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

function BasicInfoField({ label, value }: { label: string; value?: string }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="mt-0.5 font-medium text-foreground">{value}</p>
    </div>
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
    reviewFacilityBasicInfo,
    approveFacilityRegistration,
    rejectFacilityRegistration,
  } = useFacilities();

  const uploadedDocs = Object.entries(facility.uploadedDocuments ?? {});
  const statusOf = (s?: DocumentReviewStatus): DocumentReviewStatus => s ?? "pending";
  const approvedCount = uploadedDocs.filter(([, f]) => statusOf(f.status) === "approved").length;
  const rejectedCount = uploadedDocs.filter(([, f]) => statusOf(f.status) === "rejected").length;
  const allDocsApproved = uploadedDocs.length > 0 && approvedCount === uploadedDocs.length;
  const basicInfoApproved = facility.basicInfoStatus === "approved";
  const readyToApprove = allDocsApproved && basicInfoApproved;
  const alreadyDecided =
    facility.registrationStatus === "Approved" || facility.registrationStatus === "Rejected";

  function handleReview(key: string, decision: "approved" | "rejected", reason?: string) {
    void reviewFacilityDocument(facility.id, key, decision, reason);
  }

  function handleView(key: string) {
    void markFacilityDocumentViewed(facility.id, key);
  }

  function handleBasicInfoApprove() {
    void reviewFacilityBasicInfo(facility.id, "approved");
  }

  function handleBasicInfoReject(reason: string) {
    void reviewFacilityBasicInfo(facility.id, "rejected", reason);
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
          <DialogTitle>Profile &amp; Verification</DialogTitle>
          <DialogDescription>
            Review Basic Info and Documents independently. The hospital only goes live once
            both sections are approved; rejecting either sends the applicant back to fix it.
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
          <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            {facility.contactPerson && (
              <span className="flex items-center gap-1">
                <User className="size-3.5" /> {facility.contactPerson}
              </span>
            )}
            {facility.email && (
              <span className="flex items-center gap-1">
                <Mail className="size-3.5" /> {facility.email}
              </span>
            )}
            {facility.phone && (
              <span className="flex items-center gap-1">
                <Phone className="size-3.5" /> {facility.phone}
              </span>
            )}
          </div>
        </div>

        <Tabs defaultValue="basic-info" className="flex flex-1 flex-col overflow-hidden gap-0">
          <div className="shrink-0 border-b border-border px-6 pt-3 pb-3">
            <TabsList>
              <TabsTrigger value="basic-info">
                Basic Info
                {basicInfoApproved && <CheckCircle2 className="size-3.5 text-success" />}
              </TabsTrigger>
              <TabsTrigger value="documents">
                Documents ({approvedCount}/{uploadedDocs.length})
              </TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="basic-info" className="flex-1 overflow-y-auto px-6 py-4">
            <BasicInfoReviewPanel
              status={facility.basicInfoStatus}
              reviewedAt={facility.basicInfoReviewedAt}
              rejectionReason={facility.basicInfoRejectionReason}
              readOnly={alreadyDecided}
              onApprove={handleBasicInfoApprove}
              onReject={handleBasicInfoReject}
            >
              <div className="grid grid-cols-2 gap-4 rounded-xl border border-border p-4 text-sm sm:grid-cols-3">
                <BasicInfoField label="Hospital Name" value={facility.name} />
                <BasicInfoField label="Hospital Type" value={facility.hospitalType} />
                <BasicInfoField label="Registration Number" value={facility.registrationNumber} />
                <BasicInfoField label="Government License No." value={facility.governmentLicense} />
                <BasicInfoField label="City" value={facility.city} />
                <BasicInfoField label="Address" value={facility.address} />
                <BasicInfoField label="Contact Person" value={facility.contactPerson} />
                <BasicInfoField label="Email" value={facility.email} />
                <BasicInfoField label="Phone" value={facility.phone} />
              </div>
            </BasicInfoReviewPanel>
          </TabsContent>

          <TabsContent value="documents" className="flex-1 space-y-3 overflow-y-auto px-6 py-4">
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
                  rejectionReason={file.rejectionReason}
                  readOnly={alreadyDecided}
                  onApprove={() => handleReview(key, "approved")}
                  onReject={(reason) => handleReview(key, "rejected", reason)}
                  onView={() => handleView(key)}
                />
              ))
            )}

            {rejectedCount > 0 && (
              <p className="rounded-lg bg-destructive/10 p-3 text-sm font-medium text-destructive">
                {rejectedCount} document{rejectedCount > 1 ? "s were" : " was"} rejected — fix
                required before the registration can be approved.
              </p>
            )}
          </TabsContent>
        </Tabs>

        <div className="flex shrink-0 flex-col gap-3 border-t border-border px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Basic Info: {facility.basicInfoStatus} · Documents:{" "}
            {uploadedDocs.length === 0
              ? "none uploaded"
              : `${approvedCount} of ${uploadedDocs.length} approved${
                  rejectedCount > 0 ? ` · ${rejectedCount} rejected` : ""
                }`}
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
            <Button type="button" disabled={!readyToApprove || alreadyDecided} onClick={handleApprove}>
              <CheckCircle2 className="size-4" /> Approve Registration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
