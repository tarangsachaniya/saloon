import { NextResponse, type NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/auth/token";

/**
 * Route guard for the admin area.
 *
 * Runs on the server/edge, where `localStorage` does not exist — which is why
 * the JWT is kept in a cookie (see `lib/auth/token.ts`).
 *
 * SCOPE OF THIS CHECK: presence only. The middleware does not verify the JWT
 * signature — that would mean shipping the signing secret to the edge runtime,
 * and the backend already rejects bad/expired tokens on every request. This is
 * a navigation-level redirect to keep signed-out users out of admin screens,
 * not an authorisation boundary. A forged cookie gets you an admin shell whose
 * every API call returns 401 (and `lib/api/client.ts` then clears the cookie,
 * bouncing the next navigation back to login).
 */

const LOGIN_PATH = "/admin/login";

/** Basic structural sanity check for a JWT: three non-empty dot-separated parts. */
function looksLikeJwt(token: string | undefined): boolean {
  if (!token) return false;
  const parts = token.split(".");
  return parts.length === 3 && parts.every((part) => part.length > 0);
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(AUTH_COOKIE_NAME)?.value;
  const isAuthenticated = looksLikeJwt(token);

  // The login page itself must stay reachable while signed out.
  if (pathname === LOGIN_PATH) {
    // Already signed in? Skip the login form.
    if (isAuthenticated) {
      const redirectTo = request.nextUrl.searchParams.get("redirectTo");
      const target = redirectTo?.startsWith("/admin") ? redirectTo : "/admin";
      return NextResponse.redirect(new URL(target, request.url));
    }
    return NextResponse.next();
  }

  if (!isAuthenticated) {
    const loginUrl = new URL(LOGIN_PATH, request.url);
    // Preserve where they were headed so login can send them back.
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
   * Only the admin area. The customer booking flow is entirely public and must
   * never hit this middleware. `/admin/login` is matched (so a signed-in user
   * gets bounced past it) but exempted from the redirect above.
   */
  matcher: ["/admin/:path*"],
};
