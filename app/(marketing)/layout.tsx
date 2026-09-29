import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";

import { MotionShell } from "@/components/marketing/fx/SmoothScroll";
import { PopFooter } from "@/components/marketing/pop/PopFooter";
import { PopNav } from "@/components/marketing/pop/PopNav";
import { BRAND } from "@/lib/brand";

/**
 * Marketing shell, playful direction: butter, lilac, mint and tomato on cream,
 * plum for all text and outlines. Bricolage Grotesque (chunky display) over
 * DM Sans. Fonts load only for this route group.
 */

const chunky = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", variable: "--font-chunky" });
const text = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-marketing" });

export const metadata: Metadata = {
  title: { default: `${BRAND.name}: ${BRAND.tagline}`, template: `%s | ${BRAND.name}` },
  description: BRAND.description,
  openGraph: { title: BRAND.name, description: BRAND.description, type: "website" },
};

export default function MarketingLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`${chunky.variable} ${text.variable} site-marketing min-h-dvh overflow-x-clip bg-cream font-marketing text-plum antialiased selection:bg-lilac selection:text-plum`}
    >
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[110] focus:rounded-full focus:border-2 focus:border-plum focus:bg-butter focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-plum"
      >
        Skip to content
      </a>
      <MotionShell>
        <PopNav />
        <main id="main">{children}</main>
        <PopFooter />
      </MotionShell>
    </div>
  );
}
