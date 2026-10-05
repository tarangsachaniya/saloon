import { describe, expect, it } from "vitest";

import { pickUpdate, type ReleaseLike } from "@/lib/server/releases";

const rel = (versionCode: number, mandatory = false): ReleaseLike => ({
  versionCode,
  versionName: `1.0.${versionCode}`,
  apkUrl: `https://cdn/x${versionCode}.apk`,
  sizeBytes: 100,
  sha256: "a".repeat(64),
  notes: null,
  mandatory,
});

describe("pickUpdate", () => {
  it("reports nothing when up to date", () => {
    expect(pickUpdate([rel(1), rel(2)], 2)).toEqual({ updateAvailable: false });
    expect(pickUpdate([], 1)).toEqual({ updateAvailable: false });
  });
  it("picks the newest newer release", () => {
    const r = pickUpdate([rel(2), rel(4), rel(3)], 1);
    expect(r).toMatchObject({ updateAvailable: true, versionCode: 4, mandatory: false });
  });
  it("is mandatory when any skipped release is mandatory", () => {
    expect(pickUpdate([rel(2, true), rel(3)], 1)).toMatchObject({ versionCode: 3, mandatory: true });
    expect(pickUpdate([rel(2, true), rel(3)], 2)).toMatchObject({ versionCode: 3, mandatory: false });
  });
});

import { isApkKey } from "@/lib/server/s3";

describe("isApkKey", () => {
  it("accepts only keys issued under the release prefix", () => {
    expect(isApkKey("salonly/app-releases/123e4567-e89b-12d3-a456-426614174000.apk")).toBe(true);
    expect(isApkKey("salonly/app-releases/../x.apk")).toBe(false);
    expect(isApkKey("salonly/salons/abc/logo/123e4567-e89b-12d3-a456-426614174000.apk")).toBe(false);
    expect(isApkKey("salonly/app-releases/123e4567-e89b-12d3-a456-426614174000xapk")).toBe(false);
  });
});
