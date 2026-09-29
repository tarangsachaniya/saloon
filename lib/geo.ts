/**
 * Salon location helpers (pure; safe on server and client).
 *
 * A salon's location is stored in `Salon.mapUrl` as a CANONICAL OpenStreetMap
 * embed URL built here from coordinates. Admins may type coordinates or paste
 * a map link; we only ever extract numbers from what they give us and rebuild
 * the URL ourselves, so nothing user-supplied is ever put in an iframe `src`.
 *
 * Short links (maps.app.goo.gl, goo.gl/maps) carry no coordinates and would
 * need a server-side fetch to expand; that is deliberately NOT done (SSRF).
 */

export interface LatLng {
  lat: number;
  lng: number;
}

export function isValidLatLng(p: LatLng | null | undefined): p is LatLng {
  return (
    !!p &&
    Number.isFinite(p.lat) &&
    Number.isFinite(p.lng) &&
    Math.abs(p.lat) <= 90 &&
    Math.abs(p.lng) <= 180 &&
    !(p.lat === 0 && p.lng === 0)
  );
}

const NUM = "(-?\\d{1,3}(?:\\.\\d+)?)";

/** Patterns that carry "lat, lng" (in that order) inside common map links. */
const LAT_LNG_PATTERNS: RegExp[] = [
  new RegExp(`[?&]mlat=${NUM}&mlon=${NUM}`), // openstreetmap.org/?mlat=..&mlon=..
  new RegExp(`[?&]marker=${NUM}(?:,|%2C)${NUM}`, "i"), // OSM embed marker=lat,lng
  new RegExp(`#map=\\d+(?:\\.\\d+)?/${NUM}/${NUM}`), // openstreetmap.org/#map=17/lat/lng
  new RegExp(`!3d${NUM}!4d${NUM}`), // Google place data (most precise)
  new RegExp(`@${NUM},${NUM}`), // google.com/maps/@lat,lng,17z
  new RegExp(`[?&](?:q|query|ll|destination|daddr|center)=${NUM}(?:,|%2C)\\s*${NUM}`, "i"),
  new RegExp(`[?&]lat=${NUM}&(?:lon|lng)=${NUM}`),
];

const SHORT_LINK = /^(https?:\/\/)?(maps\.app\.goo\.gl|goo\.gl\/maps)\//i;

export type ParseResult = { ok: true; point: LatLng } | { ok: false; reason: string };

/**
 * Coordinates from "12.9716, 77.5946", an OpenStreetMap link or a Google Maps
 * link. Returns a reason a person can act on when nothing usable is found.
 */
export function parseLocation(input: string): ParseResult {
  const text = input.trim();
  if (!text) return { ok: false, reason: "Enter a map link or coordinates." };

  const plain = new RegExp(`^${NUM}\\s*[,\\s]\\s*${NUM}$`).exec(text);
  const candidates: LatLng[] = [];
  if (plain) candidates.push({ lat: Number(plain[1]), lng: Number(plain[2]) });

  if (SHORT_LINK.test(text)) {
    return {
      ok: false,
      reason: "Short links can't be read. Open it, then copy the full link from the address bar, or paste the coordinates.",
    };
  }

  for (const re of LAT_LNG_PATTERNS) {
    const m = re.exec(text);
    if (m) candidates.push({ lat: Number(m[1]), lng: Number(m[2]) });
  }

  // OSM embed bbox=minLng,minLat,maxLng,maxLat -> centre.
  const bbox = new RegExp(`[?&]bbox=${NUM}(?:,|%2C)${NUM}(?:,|%2C)${NUM}(?:,|%2C)${NUM}`, "i").exec(text);
  if (bbox) {
    candidates.push({ lat: (Number(bbox[2]) + Number(bbox[4])) / 2, lng: (Number(bbox[1]) + Number(bbox[3])) / 2 });
  }

  const point = candidates.find(isValidLatLng);
  if (!point) {
    return { ok: false, reason: "No coordinates found. Paste a full OpenStreetMap / Google Maps link or e.g. 12.9716, 77.5946." };
  }
  return { ok: true, point: { lat: round6(point.lat), lng: round6(point.lng) } };
}

const round6 = (n: number) => Math.round(n * 1e6) / 1e6;

/** The canonical embed URL we store and iframe. */
export function osmEmbedUrl({ lat, lng }: LatLng, zoomDelta = 0.004): string {
  const bbox = [lng - zoomDelta, lat - zoomDelta, lng + zoomDelta, lat + zoomDelta].map((n) => n.toFixed(6)).join(",");
  return `https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat},${lng}`;
}

export function osmViewUrl({ lat, lng }: LatLng): string {
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`;
}

/** Turn-by-turn directions (Google Maps is what most guests have installed). */
export function directionsUrl({ lat, lng }: LatLng): string {
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
}

/** Coordinates back out of a stored `mapUrl` (any supported format), or null. */
export function pointFromMapUrl(mapUrl: string | null | undefined): LatLng | null {
  if (!mapUrl) return null;
  const r = parseLocation(mapUrl);
  return r.ok ? r.point : null;
}

/**
 * Normalise whatever an admin entered into the value we store:
 * "" / null -> null (clear), parseable -> canonical embed URL, else an error.
 */
export function normalizeMapInput(input: string | null | undefined): { value: string | null } | { error: string } {
  if (input === null || input === undefined || input.trim() === "") return { value: null };
  const r = parseLocation(input);
  return r.ok ? { value: osmEmbedUrl(r.point) } : { error: r.reason };
}
