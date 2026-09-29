import { Anton, Bricolage_Grotesque, DM_Sans, DM_Serif_Display, Geist, Space_Grotesk } from "next/font/google";

import type { ThemeId } from "./themes";

/**
 * Fonts for the four salon themes. `preload: false` because a page only ever
 * uses one theme: the browser downloads a face only when the theme's CSS
 * variables actually reference it.
 */
const dmSerif = DM_Serif_Display({
  subsets: ["latin"],
  weight: "400",
  style: ["normal", "italic"],
  display: "swap",
  preload: false,
  variable: "--f-dmserif",
});
const dmSans = DM_Sans({ subsets: ["latin"], display: "swap", preload: false, variable: "--f-dmsans" });
const anton = Anton({ subsets: ["latin"], weight: "400", display: "swap", preload: false, variable: "--f-anton" });
const grotesk = Space_Grotesk({ subsets: ["latin"], display: "swap", preload: false, variable: "--f-grotesk" });
const bricolage = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", preload: false, variable: "--f-bricolage" });
const geist = Geist({ subsets: ["latin"], display: "swap", preload: false, variable: "--f-geist" });

const BY_THEME: Record<ThemeId, string[]> = {
  SPA: [dmSerif.variable, dmSans.variable],
  CUT: [anton.variable, grotesk.variable],
  PLAYFUL: [bricolage.variable, dmSans.variable],
  LUXE: [geist.variable],
};

/** Class names that define the theme's font variables on a wrapper element. */
export function themeFontClasses(theme: ThemeId): string {
  return BY_THEME[theme].join(" ");
}
