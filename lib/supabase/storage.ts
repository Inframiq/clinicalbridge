import { createClient } from "@/lib/supabase/client";

export interface UploadedFileMetadata {
  name: string;
  path: string;
  publicUrl: string;
  size: number;
  type: string;
  uploadedAt: string;
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
    console.log(`[Storage Upload Start] File: ${file.name}, Folder: ${folder}, Size: ${file.size} bytes`);
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

    let publicUrl = "";

    if (uploadError) {
      console.warn("[Storage Upload Warning] Supabase storage upload warning (Bucket may not exist or missing permissions):", uploadError);
      // Fallback local preview URL if bucket is missing in Supabase project instance
      publicUrl = URL.createObjectURL(processedFile);
    } else {
      const { data } = supabase.storage
        .from("documents")
        .getPublicUrl(filePath);
      publicUrl = data?.publicUrl || URL.createObjectURL(processedFile);
    }

    const metadata: UploadedFileMetadata = {
      name: file.name,
      path: filePath,
      publicUrl,
      size: processedFile.size,
      type: processedFile.type,
      uploadedAt: new Date().toISOString(),
    };

    console.log(`[Storage Upload Processed] File: ${file.name}, Path: ${filePath}`);
    return { data: metadata, error: null };
  } catch (err: unknown) {
    const error = err instanceof Error ? err : new Error(String(err));
    console.error("[Storage Upload Exception] Logged Error:", error);
    return { data: null, error };
  }
}
