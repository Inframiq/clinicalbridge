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
import { cn } from "@/lib/utils";
import type { DocumentReviewStatus, UploadedFileMetadata } from "@/lib/supabase/storage";

const STATUS_META: Record<
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
}

function classifyFile(file: UploadedFileMetadata): PreviewKind {
  // Fall back to sniffing the extension when the stored MIME type is missing
  // (older uploads, or a compress step that dropped it).
  const ext = (file.name || file.path || "").split(".").pop()?.toLowerCase() ?? "";
  const isImage =
    file.type?.startsWith("image/") || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext);
  const isPdf = file.type === "application/pdf" || ext === "pdf";
  const isLocalOnly = file.publicUrl?.startsWith("blob:") ?? false;
  const hasUrl = !!file.publicUrl && !isLocalOnly;
  return { isImage, isPdf, isLocalOnly, hasUrl };
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
  const { isImage, isPdf, isLocalOnly, hasUrl } = kind;

  if (isLocalOnly) {
    return (
      <div className="rounded-md bg-warning/10 px-3 py-4 text-center text-sm text-warning-foreground">
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

function DecisionButtons({
  status,
  readOnly,
  onApprove,
  onReject,
  size = "sm",
}: {
  status: DocumentReviewStatus;
  readOnly: boolean;
  onApprove: () => void;
  onReject: () => void;
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
        onClick={onReject}
      >
        <ShieldX className="size-3.5" /> Reject
      </Button>
      <Button type="button" size={size} disabled={readOnly || status === "approved"} onClick={onApprove}>
        <CheckCircle2 className="size-3.5" /> Approve
      </Button>
    </div>
  );
}

function FullscreenDocumentViewer({
  label,
  file,
  status,
  reviewedAt,
  viewedAt,
  readOnly,
  onApprove,
  onReject,
  onClose,
}: {
  label: string;
  file: UploadedFileMetadata;
  status: DocumentReviewStatus;
  reviewedAt?: string;
  viewedAt?: string;
  readOnly: boolean;
  onApprove: () => void;
  onReject: () => void;
  onClose: () => void;
}) {
  const meta = STATUS_META[status];
  const kind = classifyFile(file);

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

      <div className="flex shrink-0 flex-col gap-3 border-t border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-xs text-muted-foreground">
          {status === "pending"
            ? "Approve or reject this document to mark it verified."
            : `${status === "approved" ? "Approved" : "Rejected"}${
                reviewedAt ? ` · ${new Date(reviewedAt).toLocaleString()}` : ""
              }`}
        </p>
        <DecisionButtons status={status} readOnly={readOnly} onApprove={onApprove} onReject={onReject} />
      </div>
    </div>
  );
}

export function DocumentPreviewCard({
  label,
  file,
  status,
  reviewedAt,
  viewedAt,
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
  readOnly: boolean;
  onApprove: () => void;
  onReject: () => void;
  onView: () => void;
}) {
  const [open, setOpen] = useState(true);
  const [fullscreen, setFullscreen] = useState(false);
  const meta = STATUS_META[status];
  const kind = classifyFile(file);

  function openFullscreen() {
    setFullscreen(true);
    onView();
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

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border p-3">
        <p className="text-xs text-muted-foreground">
          {status === "pending"
            ? "Approve or reject this document to mark it verified."
            : `${status === "approved" ? "Approved" : "Rejected"}${
                reviewedAt ? ` · ${new Date(reviewedAt).toLocaleString()}` : ""
              }`}
        </p>
        <DecisionButtons status={status} readOnly={readOnly} onApprove={onApprove} onReject={onReject} />
      </div>

      {fullscreen &&
        typeof document !== "undefined" &&
        createPortal(
          <FullscreenDocumentViewer
            label={label}
            file={file}
            status={status}
            reviewedAt={reviewedAt}
            viewedAt={viewedAt}
            readOnly={readOnly}
            onApprove={onApprove}
            onReject={onReject}
            onClose={() => setFullscreen(false)}
          />,
          document.body
        )}
    </div>
  );
}
