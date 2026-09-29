import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/token";

/**
 * Route guard for the salon dashboard (`/dashboard/*`) and platform admin
 * (`/platform/*`). Next.js 16 calls this convention "Proxy" (it was
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
    /^\/(dashboard|platform)(\/|$|\?)/.test(target) &&
    !target.startsWith("//")
  );
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = looksLikeJwt(token);

  if (pathname === LOGIN_PATH) {
    // Already signed in? Skip the login form.
    if (isAuthenticated) {
      const redirectTo = request.nextUrl.searchParams.get("redirectTo");
      const target = isInternalRedirect(redirectTo) ? redirectTo : "/dashboard";
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
   * and legal pages are public and never hit this. `/login` is matched so a
   * signed-in user is bounced past it, but exempted from the redirect above.
   */
  matcher: ["/dashboard/:path*", "/platform/:path*", "/login"],
};
