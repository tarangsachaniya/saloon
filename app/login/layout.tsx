import type { Metadata } from "next";

import { AuthRouteLayout } from "@/components/auth/AuthRouteLayout";

export const metadata: Metadata = {
  title: "Sign in",
  robots: { index: false, follow: false },
};

export default function LoginLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthRouteLayout>{children}</AuthRouteLayout>;
}
