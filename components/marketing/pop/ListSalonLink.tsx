"use client";

import Link from "next/link";
import type { ComponentProps } from "react";

import { useSessionUser } from "@/lib/auth/useSessionUser";

/** True when the authenticated session belongs to a CUSTOMER (a client, not salon staff or an operator). */
export function useIsSignedInClient(): boolean {
  const { signedIn, user } = useSessionUser();
  return signedIn && user?.role === "CUSTOMER";
}

/**
 * A "List your salon" call-to-action. Rendered for logged-out visitors, salon
 * owners/staff and platform admins; omitted entirely (not CSS-hidden) for a
 * signed-in client, who has no use for it.
 */
export function ListSalonLink(props: Omit<ComponentProps<typeof Link>, "href">) {
  const isClient = useIsSignedInClient();
  if (isClient) return null;
  return <Link href="/contact" {...props} />;
}
