import { ImageResponse } from "next/og";

import { brandMarkDataUrl } from "@/lib/server/brandMark";

/** iOS home-screen icon: the favicon mark rendered to PNG (iOS ignores SVG icons). */

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default async function AppleIcon() {
  const mark = await brandMarkDataUrl();
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", background: "#3b1a3f" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={mark} width={180} height={180} alt="" />
      </div>
    ),
    size,
  );
}
