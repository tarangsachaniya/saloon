"use client";

import Link from "next/link";

import { useSessionUser } from "@/lib/auth/useSessionUser";

const HREF: Record<string, string> = { CUSTOMER: "/account", OWNER: "/dashboard", STAFF: "/dashboard", SUPER_ADMIN: "/platform" };

/** "Account" link for the salon header; renders nothing for signed-out visitors. */
export function ShopAccountLink() {
  const { signedIn, user } = useSessionUser();
  if (!signedIn) return null;
  return (
    <Link
      href={HREF[user?.role ?? "CUSTOMER"] ?? "/account"}
      className="inline-flex min-h-11 items-center rounded-th px-4 text-sm font-semibold text-th-text hover:underline"
    >
      Account
    </Link>
  );
}
