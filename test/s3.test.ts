import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertOwnImageUrls,
  createUploadTarget,
  ForeignImageUrlError,
  isImageType,
  isOurUrl,
  keyPrefix,
  MAX_UPLOAD_BYTES,
  UploadsNotConfiguredError,
} from "@/lib/server/s3";

// Presigning is a local signing operation: no request is sent to AWS, so dummy
// credentials are enough and nothing here touches a real bucket.
const SALON = "11111111-1111-4111-8111-111111111111";
const OTHER = "22222222-2222-4222-8222-222222222222";
const BASE = "https://test-bucket.s3.ap-south-1.amazonaws.com";

beforeEach(() => {
  vi.stubEnv("AWS_REGION", "ap-south-1");
  vi.stubEnv("AWS_S3_BUCKET", "test-bucket");
  vi.stubEnv("AWS_ACCESS_KEY_ID", "AKIATESTTESTTESTTEST");
  vi.stubEnv("AWS_SECRET_ACCESS_KEY", "test-secret-test-secret-test-secret-00");
  vi.stubEnv("AWS_CLOUDFRONT_URL", "");
});
afterEach(() => vi.unstubAllEnvs());

describe("createUploadTarget", () => {
  it("issues a key under the salon's own prefix with enforced type and size", async () => {
    const target = await createUploadTarget({ salonId: SALON, kind: "cover", contentType: "image/png" });

    expect(target.publicUrl.startsWith(`${BASE}/${keyPrefix(SALON, "cover")}`)).toBe(true);
    expect(target.publicUrl).toMatch(/\.png$/);
    expect(target.uploadUrl).toContain("test-bucket");
    expect(target.fields["Content-Type"]).toBe("image/png");
    expect(target.fields.key).toBe(target.publicUrl.slice(BASE.length + 1));
    expect(target.maxBytes).toBe(MAX_UPLOAD_BYTES);

    // The signed policy must carry the size range and the exact content type.
    const policy = JSON.parse(Buffer.from(target.fields.Policy, "base64").toString("utf8"));
    expect(policy.conditions).toContainEqual(["content-length-range", 1024, MAX_UPLOAD_BYTES]);
    expect(policy.conditions).toContainEqual(["eq", "$Content-Type", "image/png"]);
  });

  it("generates a different key every time", async () => {
    const a = await createUploadTarget({ salonId: SALON, kind: "gallery", contentType: "image/jpeg" });
    const b = await createUploadTarget({ salonId: SALON, kind: "gallery", contentType: "image/jpeg" });
    expect(a.publicUrl).not.toBe(b.publicUrl);
  });

  it("uses AWS_CLOUDFRONT_URL as the public base when set", async () => {
    vi.stubEnv("AWS_CLOUDFRONT_URL", "https://cdn.example.com/");
    const target = await createUploadTarget({ salonId: SALON, kind: "logo", contentType: "image/webp" });
    expect(target.publicUrl.startsWith("https://cdn.example.com/salonly/salons/")).toBe(true);
  });

  it("fails clearly when S3 is not configured", async () => {
    vi.stubEnv("AWS_S3_BUCKET", "");
    await expect(createUploadTarget({ salonId: SALON, kind: "logo", contentType: "image/png" })).rejects.toBeInstanceOf(
      UploadsNotConfiguredError,
    );
  });
});

describe("isOurUrl", () => {
  const good = `${BASE}/${keyPrefix(SALON, "gallery")}0a1b2c3d-0000-4000-8000-000000000000.jpg`;

  it("accepts a URL under the salon's own prefix", () => {
    expect(isOurUrl(good, SALON)).toBe(true);
  });

  it("rejects another salon's files, other hosts, and odd shapes", () => {
    expect(isOurUrl(good, OTHER)).toBe(false);
    expect(isOurUrl("https://evil.example.com/salonly/salons/x/gallery/a.jpg", SALON)).toBe(false);
    expect(isOurUrl(`${BASE}/${keyPrefix(SALON, "gallery")}../other/a.jpg`, SALON)).toBe(false);
    expect(isOurUrl(`${good}?x=1`, SALON)).toBe(false);
    expect(isOurUrl(`${good}#frag`, SALON)).toBe(false);
    expect(isOurUrl(`${BASE}/${keyPrefix(SALON, "gallery")}a/b/c.jpg`, SALON)).toBe(false);
    expect(isOurUrl(`${BASE}/${keyPrefix(SALON, "gallery")}a.svg`, SALON)).toBe(false);
    expect(isOurUrl("javascript:alert(1)", SALON)).toBe(false);
  });

  it("is false (not throwing) when S3 is not configured", () => {
    vi.stubEnv("AWS_REGION", "");
    expect(isOurUrl(good, SALON)).toBe(false);
  });
});

describe("assertOwnImageUrls", () => {
  const mine = `${BASE}/${keyPrefix(SALON, "cover")}aaaa-bbbb.png`;

  it("passes for own URLs, null and undefined", () => {
    expect(() => assertOwnImageUrls(SALON, [mine, null, undefined])).not.toThrow();
  });

  it("rejects a foreign URL", () => {
    expect(() => assertOwnImageUrls(SALON, ["https://example.com/a.png"])).toThrow(ForeignImageUrlError);
  });

  it("keeps an already-stored legacy URL valid on an unrelated save", () => {
    const legacy = "https://legacy.example.com/logo.png";
    expect(() => assertOwnImageUrls(SALON, [legacy], [legacy])).not.toThrow();
    expect(() => assertOwnImageUrls(SALON, [legacy], [])).toThrow(ForeignImageUrlError);
  });
});

describe("isImageType", () => {
  it("allows only jpeg, png and webp", () => {
    expect(isImageType("image/jpeg")).toBe(true);
    expect(isImageType("image/png")).toBe(true);
    expect(isImageType("image/webp")).toBe(true);
    expect(isImageType("image/svg+xml")).toBe(false);
    expect(isImageType("image/gif")).toBe(false);
    expect(isImageType("toString")).toBe(false);
    expect(isImageType(undefined)).toBe(false);
  });
});
