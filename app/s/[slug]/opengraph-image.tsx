import { readFile } from "node:fs/promises";
import { join, sep } from "node:path";
import { ImageResponse } from "next/og";

import { BRAND } from "@/lib/brand";
import { seoText } from "@/lib/seo";
import { brandMarkDataUrl } from "@/lib/server/brandMark";
import { getActiveSalon } from "@/lib/server/salon";
import { isThemeId, resolveAccent } from "@/lib/themes";

/**
 * Share card for a salon (`/s/[slug]` and every page under it): the salon's
 * logo, name and address, signed with the Salonly mark. A salon without a
 * usable logo gets a monogram instead.
 */

export const alt = "Salon logo and address";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const dynamic = "force-dynamic";

const PLUM = "#3b1a3f";
const CREAM = "#fffaf0";
const BUTTER = "#ffe27a";

/** Formats the OG renderer can decode. WebP/AVIF logos fall back to the monogram. */
const RENDERABLE = /^image\/(png|jpe?g|gif|svg\+xml)/;

/** The salon logo as a data URL, or null if it is missing, unreachable or unrenderable. */
async function logoDataUrl(url: string | null): Promise<string | null> {
  if (!url) return null;
  try {
    if (url.startsWith("/")) {
      const ext = url.split(".").pop()?.toLowerCase();
      const type = ext === "svg" ? "image/svg+xml" : ext === "jpg" ? "image/jpeg" : `image/${ext}`;
      if (!RENDERABLE.test(type)) return null;
      const root = join(process.cwd(), "public");
      const path = join(root, decodeURIComponent(url));
      if (!path.startsWith(root + sep)) return null;
      const file = await readFile(path);
      return `data:${type};base64,${file.toString("base64")}`;
    }
    const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
    const type = res.headers.get("content-type") ?? "";
    if (!res.ok || !RENDERABLE.test(type)) return null;
    return `data:${type.split(";")[0]};base64,${Buffer.from(await res.arrayBuffer()).toString("base64")}`;
  } catch {
    return null;
  }
}

/**
 * Bricolage Grotesque ExtraBold (the marketing display face) for the name.
 * `next/og` bundles only Geist Regular, so fetch the TTF once per server
 * process; if Google Fonts is unreachable the card still renders in Geist.
 */
let displayFont: Promise<ArrayBuffer | null> | undefined;
function loadDisplayFont(): Promise<ArrayBuffer | null> {
  displayFont ??= (async () => {
    try {
      // No browser user agent -> Google serves TTF, which the OG renderer needs (not WOFF2).
      const css = await fetch("https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:wght@800", {
        signal: AbortSignal.timeout(3000),
      }).then((r) => r.text());
      const src = css.match(/src: url\((.+?)\) format\('(truetype|opentype)'\)/)?.[1];
      if (!src) return null;
      const res = await fetch(src, { signal: AbortSignal.timeout(3000) });
      return res.ok ? await res.arrayBuffer() : null;
    } catch {
      return null;
    }
  })().then((font) => {
    if (!font) displayFont = undefined; // retry on the next render
    return font;
  });
  return displayFont;
}

function PinIcon({ color }: { color: string }) {
  return (
    <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 21s-7-6.1-7-11.5A7 7 0 0 1 19 9.5C19 14.9 12 21 12 21z" />
      <circle cx="12" cy="9.5" r="2.5" />
    </svg>
  );
}

export default async function SalonOgImage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await getActiveSalon(slug);
  const [mark, logo, font] = await Promise.all([
    brandMarkDataUrl(),
    logoDataUrl(salon?.logoUrl ?? null),
    loadDisplayFont(),
  ]);
  const display = font ? "Bricolage" : undefined;

  const name = seoText(salon?.name) ?? BRAND.name;
  const tagline = seoText(salon?.tagline);
  const address = seoText(salon?.address);
  const accent = resolveAccent(salon && isThemeId(salon.theme) ? salon.theme : "SPA", salon?.accentColor);

  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", background: CREAM, color: PLUM }}>
        <div style={{ height: 18, background: accent, display: "flex" }} />

        <div style={{ flex: 1, display: "flex", alignItems: "center", padding: "0 80px", gap: 64 }}>
          <div
            style={{
              width: 300,
              height: 300,
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: 48,
              border: `6px solid ${PLUM}`,
              background: logo ? "#ffffff" : BUTTER,
              boxShadow: `14px 14px 0 ${PLUM}`,
              overflow: "hidden",
            }}
          >
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} width={260} height={260} alt="" style={{ objectFit: "contain" }} />
            ) : (
              <span style={{ fontSize: 170, fontWeight: 800, fontFamily: display }}>{name.trim().charAt(0).toUpperCase()}</span>
            )}
          </div>

          <div style={{ display: "flex", flexDirection: "column", flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: name.length > 22 ? 62 : 76, fontWeight: 800, fontFamily: display, lineHeight: 1.05, lineClamp: 2, display: "block" }}>
              {name}
            </div>
            {tagline && (
              <div style={{ marginTop: 18, fontSize: 30, opacity: 0.75, lineClamp: 2, display: "block" }}>{tagline}</div>
            )}
            {address && (
              <div style={{ marginTop: 36, display: "flex", alignItems: "flex-start", gap: 14 }}>
                <div style={{ display: "flex", marginTop: 2 }}>
                  <PinIcon color={PLUM} />
                </div>
                <div style={{ fontSize: 32, lineHeight: 1.3, lineClamp: 3, display: "block", flex: 1 }}>{address}</div>
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "26px 80px",
            borderTop: `4px solid ${PLUM}`,
            background: BUTTER,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={mark} width={56} height={56} alt="" />
            <span style={{ fontSize: 36, fontWeight: 800, fontFamily: display }}>{BRAND.name.toLowerCase()}</span>
          </div>
          <span style={{ fontSize: 28, fontWeight: 700 }}>Book your appointment online</span>
        </div>
      </div>
    ),
    { ...size, fonts: font ? [{ name: "Bricolage", data: font, weight: 800, style: "normal" }] : undefined },
  );
}
