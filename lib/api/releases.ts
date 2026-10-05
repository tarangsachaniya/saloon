import { get, patch, post } from "./client";
import type { RequestOptions } from "./client";

/** Client for `/api/platform/releases/*` (SUPER_ADMIN only): Android app builds. */

export interface AppRelease {
  id: string;
  versionCode: number;
  versionName: string;
  apkUrl: string;
  sizeBytes: number;
  sha256: string;
  notes: string | null;
  mandatory: boolean;
  isActive: boolean;
  createdAt: string;
}

interface ApkUploadTarget {
  uploadUrl: string;
  fields: Record<string, string>;
  key: string;
  maxBytes: number;
}

export const listReleases = (options?: RequestOptions) =>
  get<{ success: true; releases: AppRelease[] }>("/platform/releases", options);

export const updateRelease = (id: string, body: { isActive?: boolean; mandatory?: boolean }) =>
  patch<{ success: true; release: AppRelease }>(`/platform/releases/${id}`, body);

/** SHA-256 of the file as lowercase hex, computed in the browser. */
export async function sha256Hex(file: File): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", await file.arrayBuffer());
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

function postToS3(target: ApkUploadTarget, file: File, onProgress: (fraction: number) => void): Promise<void> {
  return new Promise((resolve, reject) => {
    const form = new FormData();
    for (const [key, value] of Object.entries(target.fields)) form.append(key, value);
    form.append("file", file); // must be the last field

    const xhr = new XMLHttpRequest();
    xhr.open("POST", target.uploadUrl);
    xhr.upload.onprogress = (e) => e.lengthComputable && onProgress(e.loaded / e.total);
    xhr.onerror = () =>
      reject(new Error("Could not reach storage. Check your connection and the bucket's CORS rule."));
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) return resolve();
      const detail = /<Message>([^<]+)<\/Message>/.exec(xhr.responseText)?.[1];
      reject(new Error(detail ? `Upload failed: ${detail}` : `Upload failed (${xhr.status}).`));
    };
    xhr.send(form);
  });
}

export interface PublishInput {
  file: File;
  versionCode: number;
  versionName: string;
  notes?: string;
  mandatory: boolean;
}

/** Hash, upload straight to S3 (with progress), then register the release. */
export async function publishRelease(input: PublishInput, onProgress: (fraction: number) => void): Promise<AppRelease> {
  const sha256 = await sha256Hex(input.file);
  const target = await post<ApkUploadTarget & { success: true }>("/platform/releases/presign", {});
  await postToS3(target, input.file, onProgress);
  const res = await post<{ success: true; release: AppRelease }>("/platform/releases", {
    versionCode: input.versionCode,
    versionName: input.versionName,
    apkKey: target.key,
    sha256,
    notes: input.notes || undefined,
    mandatory: input.mandatory,
  });
  return res.release;
}
