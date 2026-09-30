import type { Metadata } from "next";

import { AuthRouteLayout } from "@/components/auth/AuthRouteLayout";

export const metadata: Metadata = {
  title: "Reset password",
  robots: { index: false, follow: false },
};

export default function ResetPasswordLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <AuthRouteLayout>{children}</AuthRouteLayout>;
}
