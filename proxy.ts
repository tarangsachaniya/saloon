import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/token";

/**
 * Route guard for the salon dashboard (`/dashboard/*`), platform admin
 * (`/platform/*`) and the customer account (`/account`). Next.js 16 calls this convention "Proxy" (it was
 * `middleware.ts`); the behaviour is the same.
 *
 * SCOPE OF THIS CHECK: presence only, a navigation-level redirect. It does not
 * verify the JWT signature, and it does not know the user's role or salon.
 * Real authorisation happens server-side on every API call
 * (`lib/server/auth.ts`): a forged cookie gets you an empty shell whose every
 * request answers 401, after which the client clears the cookie and the next
 * navigation bounces back to /login. Role routing (SUPER_ADMIN vs salon staff)
 * is done by the layouts once the user profile is known.
 */

const LOGIN_PATH = "/login";
/** Booking wizard (and its confirmation) - a customer account is required. */
const BOOKING_PATH = /^\/s\/[^/]+\/book(\/|$)/;
/** Sign-in-family pages a signed-in user has no reason to see. */
const GUEST_ONLY_PATHS = new Set([LOGIN_PATH, "/register", "/forgot-password"]);

/**
 * Role from the (unverified) JWT payload. Navigation hint only, exactly like
 * the presence check: it decides where a signed-in visitor lands, never what
 * they may access - the API re-checks every request.
 */
function roleFromToken(token: string | undefined): string | null {
  try {
    const payload = token?.split(".")[1];
    if (!payload) return null;
    const json = atob(payload.replace(/-/g, "+").replace(/_/g, "/"));
    const role = JSON.parse(json)?.role;
    return typeof role === "string" ? role : null;
  } catch {
    return null;
  }
}

/** Basic structural sanity check for a JWT: three non-empty dot-separated parts. */
function looksLikeJwt(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

function isInternalRedirect(target: string | null): target is string {
  // Only same-site absolute paths into the protected areas; never `//host`.
  return (
    !!target &&
    (/^\/(dashboard|platform|account)(\/|$|\?)/.test(target) || BOOKING_PATH.test(target)) &&
    !target.startsWith("//")
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = looksLikeJwt(token);

  if (GUEST_ONLY_PATHS.has(pathname)) {
    // Already signed in? Skip the form.
    if (isAuthenticated) {
      const role = roleFromToken(token);
      const redirectTo = request.nextUrl.searchParams.get("redirectTo");
      // Customers have no private area beyond /account and booking; anything
      // else (or no destination) sends them to the public site.
      if (role === "CUSTOMER") {
        const back = isInternalRedirect(redirectTo) ? redirectTo : "/";
        return NextResponse.redirect(new URL(back, request.url));
      }
      const target = isInternalRedirect(redirectTo)
        ? redirectTo
        : role === "SUPER_ADMIN"
          ? "/platform"
          : "/dashboard";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    loginUrl.searchParams.set("redirectTo", `${pathname}${search}`);
    const response = NextResponse.redirect(loginUrl);
    // Clear a malformed/expired cookie so we cannot loop on it.
    if (token) response.cookies.delete(AUTH_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  /**
   * Only the private areas. The marketing site, salon shop pages, booking flow
   * and legal pages are public and never hit this. `/login`, `/register` and
   * `/forgot-password` are matched so a signed-in user is bounced past them, but
   * exempted from the redirect above.
   */
  matcher: [
    "/dashboard/:path*",
    "/platform/:path*",
    "/account/:path*",
    "/s/:slug/book/:path*",
    "/s/:slug/book",
    "/login",
    "/register",
    "/forgot-password",
  ],
};
