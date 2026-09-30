import { Bricolage_Grotesque, DM_Sans } from "next/font/google";

import { AuthProvider } from "@/lib/auth/AuthProvider";

/**
 * Frame for the sign-in family (/login, /register, /forgot-password,
 * /reset-password): playful marketing fonts and palette, with `AuthProvider`
 * mounted here so the auth bundle stays off public pages. Each route's own
 * `layout.tsx` re-uses this and sets its title.
 */

const chunky = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", variable: "--font-chunky" });
const text = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-marketing" });

export function AuthRouteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div
      className={`${chunky.variable} ${text.variable} site-marketing min-h-dvh overflow-x-clip bg-cream font-marketing text-plum antialiased selection:bg-lilac`}
    >
      <AuthProvider>{children}</AuthProvider>
    </div>
  );
}
