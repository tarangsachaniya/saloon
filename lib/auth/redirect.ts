import type { User } from "@/lib/booking/types";

/**
 * Where a freshly signed-in user lands. Only same-site paths inside the area
 * their role can use are honoured from `?redirectTo=` (never a foreign host).
 * Customers have no private area yet, so they go to the public site.
 */
export function postAuthDestination(user: Pick<User, "role">, redirectTo?: string | null): string {
  if (user.role === "CUSTOMER") {
    return redirectTo && /^\/(?![/\\])/.test(redirectTo) && !/^\/(dashboard|platform)(\/|$|\?)/.test(redirectTo)
      ? redirectTo
      : "/";
  }
  const home = user.role === "SUPER_ADMIN" ? "/platform" : "/dashboard";
  const allowed =
    redirectTo &&
    !redirectTo.startsWith("//") &&
    redirectTo.startsWith(home) &&
    (redirectTo.length === home.length || /^[/?]/.test(redirectTo[home.length]));
  return allowed ? redirectTo : home;
}

/** Carry `?redirectTo=` across the login <-> register switch so the visitor still lands where they were headed. */
export function withRedirect(path: string, redirectTo?: string | null): string {
  return redirectTo ? `${path}?redirectTo=${encodeURIComponent(redirectTo)}` : path;
}
