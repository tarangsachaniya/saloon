import "server-only";

/**
 * Pure update-decision logic for the mobile app, kept free of I/O so it is unit-tested.
 * `releases` are the ACTIVE rows; the newest wins. The update is mandatory when ANY
 * active release newer than the installed build is mandatory (so skipping a forced
 * 1.1 by shipping an optional 1.2 cannot let an old build slip through).
 */
export interface ReleaseLike {
  versionCode: number;
  versionName: string;
  apkUrl: string;
  sizeBytes: number;
  sha256: string;
  notes: string | null;
  mandatory: boolean;
}

export type LatestResult =
  | { updateAvailable: false }
  | ({ updateAvailable: true } & ReleaseLike);

export function pickUpdate(releases: ReleaseLike[], installedVersionCode: number): LatestResult {
  const newer = releases.filter((r) => r.versionCode > installedVersionCode);
  if (newer.length === 0) return { updateAvailable: false };
  const latest = newer.reduce((a, b) => (b.versionCode > a.versionCode ? b : a));
  return { updateAvailable: true, ...latest, mandatory: newer.some((r) => r.mandatory) };
}
