import { createClient } from "@/lib/supabase/client";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { reportSupabase } from "./log";

export type DocumentReviewStatus = "pending" | "approved" | "rejected";

export interface UploadedFileMetadata {
  name: string;
  path: string;
  publicUrl: string;
  size: number;
  type: string;
  uploadedAt: string;
  /**
   * Per-document verification decision made by a super admin in the
   * verification dialog. Absent on documents uploaded before this field
   * existed — treat a missing value as "pending".
   */
  status?: DocumentReviewStatus;
  reviewedAt?: string;
  /** Set the first time a super admin opens this document in the full-screen viewer. */
  viewedAt?: string;
  /** Required free-text reason a super admin gave when rejecting this document. */
  rejectionReason?: string;
}

/**
 * Helper to compress images on client side before uploading to Storage
 */
async function compressImageIfNeeded(file: File): Promise<File> {
  if (!file.type.startsWith("image/")) return file;

  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const maxWidth = 1920;
      const maxHeight = 1920;
      let width = img.width;
      let height = img.height;

      if (width <= maxWidth && height <= maxHeight) {
        resolve(file);
        return;
      }

      if (width > height) {
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width = Math.round((width * maxHeight) / height);
          height = maxHeight;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(file);
        return;
      }

      ctx.drawImage(img, 0, 0, width, height);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            resolve(file);
            return;
          }
          const compressedFile = new File([blob], file.name, {
            type: file.type,
            lastModified: Date.now(),
          });
          resolve(compressedFile);
        },
        file.type,
        0.85
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export async function uploadDocumentToStorage(
  file: File,
  folder: string = "general",
  overrideUserId?: string
): Promise<{ data: UploadedFileMetadata | null; error: Error | null }> {
  try {
    const supabase = createClient();
    let userId = overrideUserId;

    if (!userId) {
      const { data: { user } } = await supabase.auth.getUser();
      userId = user ? user.id : "anonymous";
    }

    const processedFile = await compressImageIfNeeded(file);
    const cleanFileName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
    const filePath = `${userId}/${folder}/${Date.now()}_${cleanFileName}`;

    const { error: uploadError } = await supabase.storage
      .from("documents")
      .upload(filePath, processedFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      reportSupabase("uploadDocumentToStorage", uploadError);
      // Online mode: a failed Storage upload must surface as an error, not a
      // silent "success" holding a blob: URL — that URL is dead the moment
      // this tab reloads, so the super admin would only ever see a blank
      // preview. The wizard shows the error and the applicant re-tries.
      // Offline/demo mode has no bucket by design, so the blob: preview is
      // the best we can do and is acceptable there.
      if (isSupabaseConfigured) {
        return {
          data: null,
          error:
            uploadError instanceof Error
              ? uploadError
              : new Error("Document upload failed. Please try again."),
        };
      }
      const metadata: UploadedFileMetadata = {
        name: file.name,
        path: filePath,
        publicUrl: URL.createObjectURL(processedFile),
        size: processedFile.size,
        type: processedFile.type || file.type,
        uploadedAt: new Date().toISOString(),
      };
      return { data: metadata, error: null };
    }

    const { data: pub } = supabase.storage.from("documents").getPublicUrl(filePath);
    const metadata: UploadedFileMetadata = {
      name: file.name,
      path: filePath,
      publicUrl: pub?.publicUrl ?? "",
      size: processedFile.size,
      type: processedFile.type || file.type,
      uploadedAt: new Date().toISOString(),
    };

    return { data: metadata, error: null };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    reportSupabase("uploadDocumentToStorage", error, { level: "error" });
    return { data: null, error };
  }
}
