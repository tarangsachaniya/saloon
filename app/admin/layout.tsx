import type { Metadata } from "next";
import { AdminShell } from "@/components/admin/AdminShell";
import { AuthProvider } from "@/lib/auth/AuthProvider";

/**
 * Admin-area layout. Mounting `AuthProvider` here (rather than in the root
 * layout) keeps the auth client bundle out of the public booking flow, which
 * has no concept of a logged-in user.
 *
 * `AdminShell` (M6) adds the navigation, the signed-in user and sign-out around
 * every admin page. It is a client component because the active nav item comes
 * from `usePathname()` and the user comes from the auth context; this layout
 * itself stays a server component so the route metadata below is still static.
 * The shell renders `/admin/login` bare — see the note in `AdminShell`.
 */

export const metadata: Metadata = {
  title: {
    default: "Admin",
    template: "%s · Salon admin",
  },
  robots: { index: false, follow: false },
};

export default function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <AuthProvider>
      <AdminShell>{children}</AdminShell>
    </AuthProvider>
  );
}
