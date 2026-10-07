"use client";

import { useEffect, useState } from "react";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { getSignedDocumentUrl, type UploadedFileMetadata } from "@/lib/supabase/storage";

/**
 * Swaps a document's stored `publicUrl` for a fresh signed URL. Stored URLs
 * point at the formerly-public bucket and stop working once it is private, so
 * `path` is the source of truth. `loading` is true until the URL is resolved.
 */
export function useSignedDocument(file: UploadedFileMetadata): {
  file: UploadedFileMetadata;
  loading: boolean;
} {
  const needsSigning =
    isSupabaseConfigured && !!file.path && !(file.publicUrl?.startsWith("blob:") ?? false);
  const [signed, setSigned] = useState<{ path: string; url: string } | null>(null);

  useEffect(() => {
    if (!needsSigning) return;
    let cancelled = false;
    getSignedDocumentUrl(file.path).then(({ data }) => {
      if (!cancelled) setSigned({ path: file.path, url: data ?? "" });
    });
    return () => {
      cancelled = true;
    };
  }, [needsSigning, file.path]);

  if (!needsSigning) return { file, loading: false };
  if (signed?.path !== file.path) return { file: { ...file, publicUrl: "" }, loading: true };
  return { file: { ...file, publicUrl: signed.url }, loading: false };
}
