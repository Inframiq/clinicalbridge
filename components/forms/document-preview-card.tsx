"use client";

import { useState } from "react";
import { CheckCircle2, ChevronDown, ChevronUp, ExternalLink, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { UploadedFileMetadata } from "@/lib/supabase/storage";

export function DocumentPreviewCard({
  label,
  file,
  viewed,
  onView,
}: {
  label: string;
  file: UploadedFileMetadata;
  viewed: boolean;
  onView: () => void;
}) {
  const [open, setOpen] = useState(false);
  const isImage = file.type?.startsWith("image/");
  const isPdf = file.type === "application/pdf";

  function toggle() {
    setOpen((v) => !v);
    onView();
  }

  return (
    <div className="rounded-lg border border-border">
      <div className="flex items-center justify-between gap-3 p-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
            <FileText className="size-4" />
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">{label}</p>
            <p className="truncate text-xs text-muted-foreground">{file.name}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {viewed && (
            <span className="flex items-center gap-1 text-xs font-medium text-success">
              <CheckCircle2 className="size-3.5" /> Viewed
            </span>
          )}
          <Button type="button" size="sm" variant="outline" onClick={toggle}>
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
        <div className="border-t border-border bg-muted/30 p-3">
          {isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={file.publicUrl}
              alt={label}
              className="mx-auto max-h-96 w-full rounded-md object-contain"
            />
          ) : isPdf ? (
            <iframe src={file.publicUrl} title={label} className="h-96 w-full rounded-md border-0 bg-white" />
          ) : (
            <div className="flex flex-col items-center gap-2 py-6 text-center text-sm text-muted-foreground">
              <p>Preview isn&apos;t available for this file type.</p>
              <a
                href={file.publicUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 font-medium text-brand hover:underline"
              >
                Open file <ExternalLink className="size-3.5" />
              </a>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
