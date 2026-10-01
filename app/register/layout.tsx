import type { Metadata } from "next";

import { AuthRouteLayout } from "@/components/auth/AuthRouteLayout";

export const metadata: Metadata = {
  title: "Create account",
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthRouteLayout>{children}</AuthRouteLayout>;
}
