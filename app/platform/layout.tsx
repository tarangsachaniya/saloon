import type { Metadata } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";

import { PlatformShell } from "@/components/platform/PlatformShell";
import { AuthProvider } from "@/lib/auth/AuthProvider";

const chunky = Bricolage_Grotesque({ subsets: ["latin"], display: "swap", variable: "--font-chunky" });
const text = DM_Sans({ subsets: ["latin"], display: "swap", variable: "--font-marketing" });

export const metadata: Metadata = {
  title: { default: "Platform", template: "%s · Platform" },
  robots: { index: false, follow: false },
};

export default function PlatformLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <div className={`${chunky.variable} ${text.variable} site-marketing font-marketing text-plum antialiased`}>
      <AuthProvider>
        <PlatformShell>{children}</PlatformShell>
      </AuthProvider>
    </div>
  );
}
