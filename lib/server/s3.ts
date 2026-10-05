import "server-only";

import { randomUUID } from "node:crypto";

import { HeadObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { createPresignedPost } from "@aws-sdk/s3-presigned-post";

/**
 * Image uploads to S3 via presigned POST.
 *
 * The browser or mobile app uploads straight to S3, so the bytes never pass
 * through this server (no serverless body limit, no memory cost). A presigned
 * POST policy lets S3 itself enforce the content type and the size range.
 *
 * Every object lives under `salonly/salons/<salonId>/<kind>/`. That prefix is
 * the only place this app writes in the bucket, and `isOurUrl` only accepts
 * URLs under the caller's own salon prefix, so a client cannot point a salon at
 * a foreign image or at another salon's files.
 *
 * Env (server only, never NEXT_PUBLIC_): AWS_REGION, AWS_S3_BUCKET,
 * AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY and optionally AWS_CLOUDFRONT_URL
 * (public base URL; defaults to the bucket's virtual-hosted S3 URL).
 */

export const UPLOAD_KINDS = ["logo", "cover", "gallery", "barber"] as const;
export type UploadKind = (typeof UPLOAD_KINDS)[number];

/** Accepted image types and the file extension each is stored with. */
export const IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
} as const;
export type ImageType = keyof typeof IMAGE_TYPES;

export const MIN_UPLOAD_BYTES = 1024;
export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const MAX_GALLERY_IMAGES = 6;

const KEY_PREFIX = "salonly/salons";
const POST_EXPIRES_SECONDS = 300;

/** Thrown when S3 is not configured (missing env). 503 so clients can tell it apart from a bad request. */
export class UploadsNotConfiguredError extends Error {
  status = 503;
  expose = true;
  constructor() {
    super("Image uploads are not configured on this server.");
  }
}

/** Thrown when a request references an image URL this app did not issue for the salon. */
export class ForeignImageUrlError extends Error {
  status = 400;
  expose = true;
  constructor() {
    super("Image URLs must come from an upload made for this salon.");
  }
}

interface S3Config {
  region: string;
  bucket: string;
  baseUrl: string;
}

function readConfig(): S3Config {
  const region = process.env.AWS_REGION;
  const bucket = process.env.AWS_S3_BUCKET;
  if (!region || !bucket || !process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
    throw new UploadsNotConfiguredError();
  }
  const explicit = process.env.AWS_CLOUDFRONT_URL?.trim();
  const baseUrl = (explicit || `https://${bucket}.s3.${region}.amazonaws.com`).replace(/\/+$/, "");
  return { region, bucket, baseUrl };
}

let cachedClient: { key: string; client: S3Client } | null = null;

function getClient(config: S3Config): S3Client {
  // Re-create only if the config changed (tests swap env between cases).
  const key = `${config.region}|${process.env.AWS_ACCESS_KEY_ID}`;
  if (!cachedClient || cachedClient.key !== key) {
    // Credentials come from AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY via the default provider chain.
    cachedClient = { key, client: new S3Client({ region: config.region }) };
  }
  return cachedClient.client;
}

/** `salonly/salons/<salonId>/<kind>/` */
export function keyPrefix(salonId: string, kind?: UploadKind): string {
  return kind ? `${KEY_PREFIX}/${salonId}/${kind}/` : `${KEY_PREFIX}/${salonId}/`;
}

export function isImageType(value: unknown): value is ImageType {
  return typeof value === "string" && Object.prototype.hasOwnProperty.call(IMAGE_TYPES, value);
}

export interface UploadTarget {
  /** POST the file here as multipart/form-data. */
  uploadUrl: string;
  /** Form fields that must be sent before the `file` field, in this order. */
  fields: Record<string, string>;
  /** Where the image is served from once uploaded; save this on the salon/barber. */
  publicUrl: string;
  maxBytes: number;
}

/** A presigned POST for one image. The key is generated here; the client never chooses it. */
export async function createUploadTarget(input: {
  salonId: string;
  kind: UploadKind;
  contentType: ImageType;
}): Promise<UploadTarget> {
  const config = readConfig();
  const key = `${keyPrefix(input.salonId, input.kind)}${randomUUID()}.${IMAGE_TYPES[input.contentType]}`;

  const { url, fields } = await createPresignedPost(getClient(config), {
    Bucket: config.bucket,
    Key: key,
    Expires: POST_EXPIRES_SECONDS,
    Fields: { "Content-Type": input.contentType },
    Conditions: [
      ["content-length-range", MIN_UPLOAD_BYTES, MAX_UPLOAD_BYTES],
      ["eq", "$Content-Type", input.contentType],
    ],
  });

  return { uploadUrl: url, fields, publicUrl: `${config.baseUrl}/${key}`, maxBytes: MAX_UPLOAD_BYTES };
}

/** True when `url` is a plain https URL under this salon's own upload prefix. */
export function isOurUrl(url: string, salonId: string): boolean {
  let base: string;
  try {
    base = readConfig().baseUrl;
  } catch {
    return false;
  }
  const prefix = `${base}/${keyPrefix(salonId)}`;
  if (!url.startsWith(prefix)) return false;
  const rest = url.slice(prefix.length);
  // Exactly <kind>/<file>: no query, fragment, traversal or extra segments.
  return /^[a-z]+\/[A-Za-z0-9-]+\.(jpg|png|webp)$/.test(rest);
}

/**
 * Validate image URLs about to be saved for `salonId`. `null`/`undefined` pass
 * (clearing or leaving unchanged). `keep` lists values already stored, which
 * stay valid so legacy hand-pasted URLs are not rejected on an unrelated save.
 */
export function assertOwnImageUrls(
  salonId: string,
  urls: Array<string | null | undefined>,
  keep: Array<string | null | undefined> = [],
): void {
  const existing = new Set(keep.filter((u): u is string => !!u));
  for (const url of urls) {
    if (!url) continue;
    if (existing.has(url)) continue;
    if (!isOurUrl(url, salonId)) throw new ForeignImageUrlError();
  }
}

// ---- Android release builds -------------------------------------------------

export const APK_CONTENT_TYPE = "application/vnd.android.package-archive";
export const MAX_APK_BYTES = 300 * 1024 * 1024;
const APK_PREFIX = "salonly/app-releases";
const APK_POST_EXPIRES_SECONDS = 1800;

export interface ApkUploadTarget {
  uploadUrl: string;
  fields: Record<string, string>;
  /** Object key; send it back when registering the release. */
  key: string;
  publicUrl: string;
  maxBytes: number;
}

/** A presigned POST for one APK. The key is generated here; the client never chooses it. */
export async function createApkUploadTarget(): Promise<ApkUploadTarget> {
  const config = readConfig();
  const key = `${APK_PREFIX}/${randomUUID()}.apk`;
  const { url, fields } = await createPresignedPost(getClient(config), {
    Bucket: config.bucket,
    Key: key,
    Expires: APK_POST_EXPIRES_SECONDS,
    Fields: { "Content-Type": APK_CONTENT_TYPE },
    Conditions: [
      ["content-length-range", 1024 * 1024, MAX_APK_BYTES],
      ["eq", "$Content-Type", APK_CONTENT_TYPE],
    ],
  });
  return { uploadUrl: url, fields, key, publicUrl: `${config.baseUrl}/${key}`, maxBytes: MAX_APK_BYTES };
}

/** True for a key this app issued from `createApkUploadTarget`. */
export function isApkKey(key: string): boolean {
  return new RegExp(`^${APK_PREFIX}/[0-9a-f-]{36}\\.apk$`).test(key);
}

/** Size in bytes of an uploaded APK, or null when the object is missing. */
export async function headApk(key: string): Promise<{ sizeBytes: number; publicUrl: string } | null> {
  const config = readConfig();
  try {
    const res = await getClient(config).send(new HeadObjectCommand({ Bucket: config.bucket, Key: key }));
    return { sizeBytes: res.ContentLength ?? 0, publicUrl: `${config.baseUrl}/${key}` };
  } catch (error) {
    const name = (error as { name?: string }).name;
    if (name === "NotFound" || name === "NoSuchKey") return null;
    throw error;
  }
}
