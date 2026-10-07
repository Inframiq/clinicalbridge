"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import {
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Eye,
  ExternalLink,
  FileText,
  Maximize2,
  ShieldX,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { useSignedDocument } from "@/hooks/use-signed-document";
import type { DocumentReviewStatus, UploadedFileMetadata } from "@/lib/supabase/storage";

export const STATUS_META: Record<
  DocumentReviewStatus,
  { label: string; className: string; Icon: typeof CheckCircle2 }
> = {
  pending: {
    label: "Pending review",
    className: "bg-muted text-muted-foreground",
    Icon: FileText,
  },
  approved: {
    label: "Verified",
    className: "bg-success/10 text-success",
    Icon: CheckCircle2,
  },
  rejected: {
    label: "Rejected",
    className: "bg-destructive/10 text-destructive",
    Icon: ShieldX,
  },
};

interface PreviewKind {
  isImage: boolean;
  isPdf: boolean;
  isLocalOnly: boolean;
  hasUrl: boolean;
  /** Signed URL still being fetched — not the same as "no URL". */
  isLoading: boolean;
}

function classifyFile(file: UploadedFileMetadata, isLoading = false): PreviewKind {
  // Fall back to sniffing the extension when the stored MIME type is missing
  // (older uploads, or a compress step that dropped it).
  const ext = (file.name || file.path || "").split(".").pop()?.toLowerCase() ?? "";
  const isImage =
    file.type?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  const isPdf = file.type === "application/pdf" || ext === "pdf";
  const isLocalOnly = file.publicUrl?.startsWith("blob:") ?? false;
  const hasUrl = !!file.publicUrl && !isLocalOnly;
  return { isImage, isPdf, isLocalOnly, hasUrl, isLoading };
}

function DocumentMedia({
  file,
  label,
  kind,
  mediaClassName,
}: {
  file: UploadedFileMetadata;
  label: string;
  kind: PreviewKind;
  mediaClassName: string;
}) {
  const { isImage, isPdf, isLocalOnly, hasUrl, isLoading } = kind;

  if (isLoading) {
    return (
      <div className="rounded-md bg-muted px-3 py-4 text-center text-sm text-muted-foreground">
        Loading document…
      </div>
    );
  }
  if (isLocalOnly) {
    return (
      <div className="rounded-md bg-warning/10 px-3 py-4 text-center text-sm text-warning">
        This document was only stored in the applicant&apos;s browser during sign-up (the storage
        upload failed) and can&apos;t be opened here. Ask them to re-upload it.
      </div>
    );
  }
  if (!hasUrl) {
    return (
      <div className="rounded-md bg-destructive/10 px-3 py-4 text-center text-sm text-destructive">
        No file URL was saved for this document.
      </div>
    );
  }
  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={file.publicUrl} alt={label} className={cn(mediaClassName, "bg-white object-contain")} />
    );
  }
  if (isPdf) {
    return (
      <object data={file.publicUrl} type="application/pdf" className={cn(mediaClassName, "border border-border bg-white")}>
        <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
          <p>Your browser can&apos;t display this PDF inline.</p>
          <a
            href={file.publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 font-medium text-brand hover:underline"
          >
            Open the PDF <ExternalLink className="size-3.5" />
          </a>
        </div>
      </object>
    );
  }
  return (
    <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
      <p>Inline preview isn&apos;t available for this file type.</p>
      <a
        href={file.publicUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-1 font-medium text-brand hover:underline"
      >
        Open file <ExternalLink className="size-3.5" />
      </a>
    </div>
  );
}

/**
 * Inline form that appears in place of the Approve/Reject buttons once
 * "Reject" is clicked — a rejection isn't committed until a reason is typed,
 * so the applicant always finds out what to fix.
 */
export function RejectReasonPanel({
  reason,
  onReasonChange,
  onConfirm,
  onCancel,
}: {
  reason: string;
  onReasonChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
}) {
  return (
    <div className="w-full space-y-2 rounded-lg border border-destructive/30 bg-destructive/5 p-3">
      <label htmlFor="reject-reason" className="text-xs font-medium text-foreground">
        Reason for rejection *
      </label>
      <Textarea
        id="reject-reason"
        value={reason}
        onChange={(e) => onReasonChange(e.target.value)}
        placeholder="e.g. Photo is blurry, license has expired, wrong document type..."
        rows={2}
        autoFocus
      />
      <div className="flex items-center justify-end gap-2">
        <Button type="button" size="sm" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          variant="destructive"
          disabled={!reason.trim()}
          onClick={onConfirm}
        >
          <ShieldX className="size-3.5" /> Confirm Rejection
        </Button>
      </div>
    </div>
  );
}

export function DecisionButtons({
  status,
  readOnly,
  canApprove,
  onApprove,
  onStartReject,
  size = "sm",
}: {
  status: DocumentReviewStatus;
  readOnly: boolean;
  /** False when the file can't actually be opened here — approving something you can't view isn't a real review. */
  canApprove: boolean;
  onApprove: () => void;
  onStartReject: () => void;
  size?: "sm" | "default";
}) {
  return (
    <div className="flex items-center gap-2">
      <Button
        type="button"
        size={size}
        variant="outline"
        className="text-destructive hover:text-destructive"
        disabled={readOnly || status === "rejected"}
        onClick={onStartReject}
      >
        <ShieldX className="size-3.5" /> Reject
      </Button>
      <Button
        type="button"
        size={size}
        disabled={readOnly || status === "approved" || !canApprove}
        title={!canApprove ? "This document can't be opened — reject it so the applicant re-uploads." : undefined}
        onClick={onApprove}
      >
        <CheckCircle2 className="size-3.5" /> Approve
      </Button>
    </div>
  );
}

function FullscreenDocumentViewer({
  label,
  file,
  loading,
  status,
  reviewedAt,
  viewedAt,
  rejectionReason,
  readOnly,
  onApprove,
  confirmingReject,
  rejectReason,
  onRejectReasonChange,
  onStartReject,
  onConfirmReject,
  onCancelReject,
  onClose,
}: {
  label: string;
  file: UploadedFileMetadata;
  loading: boolean;
  status: DocumentReviewStatus;
  reviewedAt?: string;
  viewedAt?: string;
  rejectionReason?: string;
  readOnly: boolean;
  onApprove: () => void;
  confirmingReject: boolean;
  rejectReason: string;
  onRejectReasonChange: (value: string) => void;
  onStartReject: () => void;
  onConfirmReject: () => void;
  onCancelReject: () => void;
  onClose: () => void;
}) {
  const meta = STATUS_META[status];
  const kind = classifyFile(file, loading);

  useEffect(() => {
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-background">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-border px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-foreground">{label}</p>
          <p className="truncate text-xs text-muted-foreground">{file.name}</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              meta.className
            )}
          >
            <meta.Icon className="size-3.5" /> {meta.label}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
            <Eye className="size-3.5" /> {viewedAt ? "Viewed" : "Not viewed yet"}
          </span>
          {kind.hasUrl && (
            <a
              href={file.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="hidden items-center gap-1 text-xs font-medium text-brand hover:underline sm:inline-flex"
            >
              Open in a new tab <ExternalLink className="size-3.5" />
            </a>
          )}
          <Button type="button" size="icon-sm" variant="ghost" onClick={onClose}>
            <X className="size-4" />
            <span className="sr-only">Close</span>
          </Button>
        </div>
      </div>

      <div className="flex-1 overflow-auto bg-muted/30 p-4">
        <DocumentMedia file={file} label={label} kind={kind} mediaClassName="mx-auto h-full max-h-full w-full rounded-md" />
      </div>

      <div className="flex shrink-0 flex-col gap-3 border-t border-border px-4 py-3 sm:px-6">
        {status === "rejected" && rejectionReason && (
          <p className="rounded-lg bg-destructive/10 px-3 py-2 text-xs text-destructive">
            <span className="font-medium">Reason given: </span>
            {rejectionReason}
          </p>
        )}
        {confirmingReject ? (
          <RejectReasonPanel
            reason={rejectReason}
            onReasonChange={onRejectReasonChange}
            onConfirm={onConfirmReject}
            onCancel={onCancelReject}
          />
        ) : (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-xs text-muted-foreground">
              {status === "pending"
                ? "Approve or reject this document to mark it verified."
                : `${status === "approved" ? "Approved" : "Rejected"}${
                    reviewedAt ? ` · ${new Date(reviewedAt).toLocaleString()}` : ""
                  }`}
            </p>
            <DecisionButtons
              status={status}
              readOnly={readOnly}
              canApprove={kind.hasUrl}
              onApprove={onApprove}
              onStartReject={onStartReject}
            />
          </div>
        )}
      </div>
    </div>
  );
}

export function DocumentPreviewCard({
  label,
  file: storedFile,
  status,
  reviewedAt,
  viewedAt,
  rejectionReason,
  readOnly,
  onApprove,
  onReject,
  onView,
}: {
  label: string;
  file: UploadedFileMetadata;
  status: DocumentReviewStatus;
  reviewedAt?: string;
  viewedAt?: string;
  rejectionReason?: string;
  readOnly: boolean;
  onApprove: () => void;
  /** Called only once a reason has been typed and confirmed. */
  onReject: (reason: string) => void;
  onView: () => void;
}) {
  const signed = useSignedDocument(storedFile);
  const file = signed.file;
  const [open, setOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const [confirmingReject, setConfirmingReject] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const meta = STATUS_META[status];
  const kind = classifyFile(file, signed.loading);

  // The inline preview defaults open, so the document is already on screen
  // the moment this card mounts — that counts as "accessed" just as much as
  // explicitly opening the full-screen viewer. Re-fires whenever the preview
  // is toggled back open after being hidden.
  useEffect(() => {
    if (open) onView();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function openFullscreen() {
    setFullscreen(true);
    onView();
  }

  function closeFullscreen() {
    setFullscreen(false);
    setConfirmingReject(false);
    setRejectReason("");
  }

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
    <div className="rounded-lg border border-border">
      <div className="flex flex-wrap items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{label}</p>
            <p className="truncate text-xs text-muted-foreground">{file.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
              meta.className
            )}
          >
            <meta.Icon className="size-3.5" /> {meta.label}
          </span>
          <span
            title={viewedAt ? `Viewed ${new Date(viewedAt).toLocaleString()}` : "Not opened yet"}
            className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground"
          >
            <Eye className="size-3.5" /> {viewedAt ? "Viewed" : "Not viewed"}
          </span>
          <Button type="button" size="sm" variant="outline" onClick={openFullscreen}>
            <Maximize2 className="size-3.5" /> Full screen
          </Button>
          <Button type="button" size="sm" variant="outline" onClick={() => setOpen((v) => !v)}>
            {open ? (
              <>
                Hide <ChevronUp className="size-3.5" />
              </>
            ) : (
              <>
                Preview <ChevronDown className="size-3.5" />
              </>
            )}
          </Button>
        </div>
      </div>

      {open && (
        <div className="space-y-2 border-t border-border bg-muted/30 p-3">
          {kind.hasUrl && (
            <a
              href={file.publicUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline"
            >
              Open in a new tab <ExternalLink className="size-3.5" />
            </a>
          )}
          <DocumentMedia file={file} label={label} kind={kind} mediaClassName="mx-auto max-h-[65dvh] w-full rounded-md" />
        </div>
      )}

      <div className="flex flex-col gap-3 border-t border-border p-3">
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
                ? "Approve or reject this document to mark it verified."
                : `${status === "approved" ? "Approved" : "Rejected"}${
                    reviewedAt ? ` · ${new Date(reviewedAt).toLocaleString()}` : ""
                  }`}
            </p>
            <DecisionButtons
              status={status}
              readOnly={readOnly}
              canApprove={kind.hasUrl}
              onApprove={onApprove}
              onStartReject={startReject}
            />
          </div>
        )}
      </div>

      {fullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <FullscreenDocumentViewer
            label={label}
            file={file}
            loading={signed.loading}
            status={status}
            reviewedAt={reviewedAt}
            viewedAt={viewedAt}
            rejectionReason={rejectionReason}
            readOnly={readOnly}
            onApprove={onApprove}
            confirmingReject={confirmingReject}
            rejectReason={rejectReason}
            onRejectReasonChange={setRejectReason}
            onStartReject={startReject}
            onConfirmReject={confirmReject}
            onCancelReject={cancelReject}
            onClose={closeFullscreen}
          />,
          document.body
        )}
    </div>
  );
}
