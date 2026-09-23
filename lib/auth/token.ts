import Cookies from "js-cookie";

/**
 * Reactive auth-token store.
 *
 * WHY THIS EXISTS — the legacy React app read the JWT into a module-level
 * `const` at the top of every API file. Those values were captured once at
 * import time, so after a login or logout the API layer kept sending the old
 * (or no) token until a full page reload; the old code papered over this with
 * `window.location.reload()` calls. This module fixes that at the root:
 *
 *   - `getToken()` reads the cookie FRESH on every call. `lib/api/client.ts`
 *     calls it per-request, so a token is never captured at module scope.
 *   - The token lives in a COOKIE (not localStorage) so `middleware.ts`, which
 *     runs on the server/edge and cannot see localStorage, can gate `/admin/*`.
 *   - `subscribe()` lets `AuthProvider` re-render on login/logout without a
 *     page reload, via `useSyncExternalStore`.
 */

/** Cookie name shared by the browser store and `middleware.ts`. */
export const AUTH_COOKIE_NAME = "sbs_admin_token";

/** Cookie lifetime in days. Keep in step with the backend's JWT expiry. */
const AUTH_COOKIE_MAX_AGE_DAYS = 7;

type Listener = () => void;

const listeners = new Set<Listener>();

/**
 * Cached snapshot of the cookie value.
 *
 * `useSyncExternalStore` requires `getSnapshot` to return a referentially
 * stable value between changes, so we memoise the last-read string and only
 * swap it when the underlying cookie actually differs.
 */
let snapshot: string | null = null;
let snapshotInitialised = false;

function readCookie(): string | null {
  // `js-cookie` touches `document`; guard for SSR / RSC / middleware contexts.
  if (typeof document === "undefined") return null;
  return Cookies.get(AUTH_COOKIE_NAME) ?? null;
}

function refreshSnapshot(): string | null {
  const current = readCookie();
  if (!snapshotInitialised || current !== snapshot) {
    snapshot = current;
    snapshotInitialised = true;
  }
  return snapshot;
}

function emit(): void {
  for (const listener of listeners) listener();
}

/**
 * Read the current auth token. Always reads through to the cookie — never
 * cache the result of this call in a module-level binding.
 */
export function getToken(): string | null {
  return refreshSnapshot();
}

/** Persist a token and notify subscribers. */
export function setToken(token: string): void {
  if (typeof document === "undefined") return;
  Cookies.set(AUTH_COOKIE_NAME, token, {
    expires: AUTH_COOKIE_MAX_AGE_DAYS,
    path: "/",
    sameSite: "lax",
    // The app is served over http in local dev; only mark Secure in production.
    secure: window.location.protocol === "https:",
  });
  snapshot = token;
  snapshotInitialised = true;
  emit();
}

/** Remove the token and notify subscribers. */
export function clearToken(): void {
  if (typeof document === "undefined") return;
  Cookies.remove(AUTH_COOKIE_NAME, { path: "/" });
  snapshot = null;
  snapshotInitialised = true;
  emit();
}

/** Subscribe to token changes. Returns an unsubscribe function. */
export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

/** `useSyncExternalStore` client snapshot. */
export function getTokenSnapshot(): string | null {
  return refreshSnapshot();
}

/** `useSyncExternalStore` server snapshot — always null (no cookie access). */
export function getTokenServerSnapshot(): string | null {
  return null;
}
