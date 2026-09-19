"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";
import {
  DecisionButtons,
  RejectReasonPanel,
  STATUS_META,
} from "@/components/forms/document-preview-card";
import type { DocumentReviewStatus } from "@/lib/supabase/storage";

/**
 * The Basic Info tab's own approve/reject state, independent of
 * per-document review - lets a super admin sign off (or flag) an
 * applicant's basic details separately from their uploaded documents.
 */
export function BasicInfoReviewPanel({
  status,
  reviewedAt,
  rejectionReason,
  readOnly,
  onApprove,
  onReject,
  children,
}: {
  status: DocumentReviewStatus;
  reviewedAt?: string;
  rejectionReason?: string;
  readOnly: boolean;
  onApprove: () => void;
  /** Called only once a reason has been typed and confirmed. */
  onReject: (reason: string) => void;
  children: React.ReactNode;
}) {
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const meta = STATUS_META[status];

  function startReject() {
    setConfirmingReject(true);
    setRejectReason("");
  }

  function cancelReject() {
    setConfirmingReject(false);
    setRejectReason("");
  }

  function confirmReject() {
    const trimmed = rejectReason.trim();
    if (!trimmed) return;
    onReject(trimmed);
    setConfirmingReject(false);
    setRejectReason("");
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-medium text-foreground">Basic Info</p>
        <span
          className={cn(
            "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
            meta.className
          )}
        >
          <meta.Icon className="size-3.5" /> {meta.label}
        </span>
      </div>

      {children}

      {status === "rejected" && rejectionReason && (
        <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
          <span className="font-medium">Reason given: </span>
          {rejectionReason}
        </p>
      )}

      {confirmingReject ? (
        <RejectReasonPanel
          reason={rejectReason}
          onReasonChange={setRejectReason}
          onConfirm={confirmReject}
          onCancel={cancelReject}
        />
      ) : (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-xs text-muted-foreground">
            {status === "pending"
              ? "Approve or reject the applicant's basic info."
              : `${status === "approved" ? "Approved" : "Rejected"}${
                  reviewedAt ? ` · ${new Date(reviewedAt).toLocaleString()}` : ""
                }`}
          </p>
          <DecisionButtons
            status={status}
            readOnly={readOnly}
            canApprove
            onApprove={onApprove}
            onStartReject={startReject}
          />
        </div>
      )}
    </div>
  );
}
