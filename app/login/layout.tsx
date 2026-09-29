import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";

import { AuthProvider } from "@/lib/auth/AuthProvider";

/**
 * Sign-in for salon owners/staff and the platform operator, styled in the
 * playful marketing theme (same fonts and palette as the public site).
 * `AuthProvider` is mounted here so the auth bundle stays off public pages.
 */

const chunky = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", variable: "--font-chunky" });
const text = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-marketing" });

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`${chunky.variable} ${text.variable} site-marketing min-h-dvh bg-cream font-marketing text-plum antialiased selection:bg-lilac`}
    >
      <AuthProvider>{children}</AuthProvider>
    </div>
  );
}
