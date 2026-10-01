import type { Metadata } from "next";

import { AuthProvider } from "@/lib/auth/AuthProvider";

/** Customer account. `AuthProvider` is mounted here so its bundle stays off public pages. */
export const metadata: Metadata = {
  title: "Your account",
  robots: { index: false, follow: false },
};

export default function AccountLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthProvider>{children}</AuthProvider>;
}
