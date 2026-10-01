import { post } from "./client";

/**
 * Browser-side image upload: ask `POST /api/uploads` for a presigned S3 POST,
 * then send the file straight to S3. The returned `publicUrl` is what gets saved
 * through the settings / barber routes. (Needs the bucket's CORS rule for POST
 * from this origin; see docs/s3-setup.md.)
 */

export type UploadKind = "logo" | "cover" | "gallery" | "barber";

export const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;
export const MIN_UPLOAD_BYTES = 1024;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_GALLERY_IMAGES = 6;

interface UploadTarget {
  uploadUrl: string;
  fields: Record<string, string>;
  publicUrl: string;
  maxBytes: number;
}

/** A user-facing problem with the chosen file, or null when it can be uploaded. */
export function validateImageFile(file: Pick<File, "type" | "size">): string | null {
  if (!(ALLOWED_IMAGE_TYPES as readonly string[]).includes(file.type)) return "Choose a JPEG, PNG or WebP image.";
  if (file.size < MIN_UPLOAD_BYTES) return "That image is too small.";
  if (file.size > MAX_UPLOAD_BYTES) return "Images can be at most 5 MB.";
  return null;
}

/** Validate, request a target, upload, and return the public URL to save. */
export async function uploadImage(file: File, kind: UploadKind, salonId?: string): Promise<string> {
  const problem = validateImageFile(file);
  if (problem) throw new Error(problem);

  const target = await post<UploadTarget & { success: true }>("/uploads", {
    kind,
    contentType: file.type,
    size: file.size,
    ...(salonId ? { salonId } : {}),
  });

  const form = new FormData();
  for (const [key, value] of Object.entries(target.fields)) form.append(key, value);
  form.append("file", file); // must be the last field

  let response: Response;
  try {
    response = await fetch(target.uploadUrl, { method: "POST", body: form });
  } catch {
    throw new Error("Could not reach the image storage. Check your connection (and the bucket's CORS rule) and try again.");
  }
  if (!response.ok) {
    const detail = /<Message>([^<]+)<\/Message>/.exec(await response.text().catch(() => ""))?.[1];
    throw new Error(detail ? `Upload failed: ${detail}` : `Upload failed (${response.status}).`);
  }
  return target.publicUrl;
}
