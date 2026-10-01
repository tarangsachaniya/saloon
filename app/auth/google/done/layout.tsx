import type { Metadata } from "next";

import { AuthRouteLayout } from "@/components/auth/AuthRouteLayout";

export const metadata: Metadata = {
  title: "Signing you in",
  robots: { index: false, follow: false },
};

export default function GoogleDoneLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthRouteLayout>{children}</AuthRouteLayout>;
}
