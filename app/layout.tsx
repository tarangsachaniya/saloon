import type { Metadata, Viewport } from "next";
import { Nunito } from "next/font/google";
import "./globals.css";

/**
 * Nunito is the legacy app's body font (it was pulled in via a raw
 * `@import url(...)` in index.css). Loading it through `next/font/google`
 * self-hosts the files, removes the render-blocking request to Google, and
 * exposes it as the `--font-nunito` CSS variable that `tailwind.config.ts`
 * binds to `font-sans`.
 */
const nunito = Nunito({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-nunito",
  weight: ["400", "600", "700", "800"],
});

export const metadata: Metadata = {
  // Makes og:image and other metadata URLs absolute. Unset, Next falls back to localhost/VERCEL_URL.
  metadataBase: process.env.NEXT_PUBLIC_SITE_URL ? new URL(process.env.NEXT_PUBLIC_SITE_URL) : undefined,
  title: {
    default: "Book your appointment",
    template: "%s | Salon Booking",
  },
  description:
    "Book a haircut, shave or styling appointment with our barbers in a few taps.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#053b50",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={nunito.variable}>
      <body className="min-h-dvh font-sans">{children}</body>
    </html>
  );
}
