import { clearToken, getToken } from "@/lib/auth/token";

/**
 * Typed fetch wrapper for the booking API.
 *
 * Key property: the auth token is read FRESH on every request via `getToken()`.
 * Nothing in this module captures a token at import time — that was the bug in
 * the legacy app (see `lib/auth/token.ts` for the full story).
 */

/**
 * Base URL including the `/api` prefix.
 *
 * The API is now part of this same Next.js app (`app/api/**​/route.ts`), so the
 * default is a SAME-ORIGIN relative path: the browser supplies the origin, and
 * there is no cross-origin request left for CORS to have an opinion about.
 * Override `NEXT_PUBLIC_API_URL` only to point the browser at a different
 * deployment (which would need its own CORS config).
 */
export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL ?? "/api";

/** Query-string values we know how to serialise. */
export type QueryValue = string | number | boolean | null | undefined;
export type QueryParams = Record<string, QueryValue>;

export interface RequestOptions {
  /** Appended as a query string; null/undefined entries are dropped. */
  query?: QueryParams;
  /** Extra headers, merged over the defaults. */
  headers?: Record<string, string>;
  /**
   * Attach `Authorization: Bearer <token>` when a token exists.
   * Defaults to `true`. Set `false` for public endpoints and for the login
   * call itself (so a stale token cannot trigger the 401 auto-logout path).
   */
  auth?: boolean;
  signal?: AbortSignal;
  /** Forwarded to `fetch`. Defaults to "no-store" so admin data is never stale. */
  cache?: RequestCache;
  /** Next.js fetch extensions (revalidate/tags) for server-side callers. */
  next?: { revalidate?: number | false; tags?: string[] };
}

/**
 * Error thrown for any non-2xx response, or for a network/parse failure.
 *
 * `message` prefers the API's own `message` field so it can be shown to the
 * user directly. Do not pattern-match on the text — treat it as opaque.
 */
export class ApiError extends Error {
  /** HTTP status, or 0 for a network-level failure. */
  readonly status: number;
  /** Parsed response body, when there was one. */
  readonly payload: unknown;

  constructor(message: string, status: number, payload?: unknown) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.payload = payload;
    // Required for `instanceof` to work when targeting ES5-ish output.
    Object.setPrototypeOf(this, ApiError.prototype);
  }

  /** True when the failure was an auth problem. */
  get isUnauthorized(): boolean {
    return this.status === 401 || this.status === 403;
  }

  /** True when the request never reached the server. */
  get isNetworkError(): boolean {
    return this.status === 0;
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

function buildUrl(path: string, query?: QueryParams): string {
  const base = API_BASE_URL.replace(/\/+$/, "");
  const suffix = path.startsWith("/") ? path : `/${path}`;
  let url = `${base}${suffix}`;

  if (query) {
    const search = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === null || value === undefined || value === "") continue;
      search.append(key, String(value));
    }
    const qs = search.toString();
    if (qs) url += `?${qs}`;
  }

  return url;
}

/** Pull the most useful human-readable string out of an error body. */
function extractMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string" && payload.trim()) return payload;
  if (payload && typeof payload === "object") {
    const record = payload as Record<string, unknown>;
    for (const key of ["message", "error", "detail"]) {
      const value = record[key];
      if (typeof value === "string" && value.trim()) return value;
    }
  }
  return fallback;
}

async function parseBody(response: Response): Promise<unknown> {
  // 204 / 205 and empty bodies must not be fed to `.json()`.
  if (response.status === 204 || response.status === 205) return null;

  const text = await response.text();
  if (!text) return null;

  const contentType = response.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }
  // Some error handlers return plain text / HTML; hand it back as-is.
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function request<T>(
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE",
  path: string,
  body?: unknown,
  options: RequestOptions = {},
): Promise<T> {
  const { query, headers = {}, auth = true, signal, cache, next } = options;

  const requestHeaders: Record<string, string> = {
    Accept: "application/json",
    ...headers,
  };

  if (body !== undefined && !(body instanceof FormData)) {
    requestHeaders["Content-Type"] ??= "application/json";
  }

  // Read the token at REQUEST time, never at module scope.
  const token = auth ? getToken() : null;
  if (token) {
    requestHeaders.Authorization = `Bearer ${token}`;
  }

  const init: RequestInit & { next?: RequestOptions["next"] } = {
    method,
    headers: requestHeaders,
    signal,
    cache: cache ?? (next ? undefined : "no-store"),
  };
  if (next) init.next = next;
  if (body !== undefined) {
    init.body = body instanceof FormData ? body : JSON.stringify(body);
  }

  let response: Response;
  try {
    response = await fetch(buildUrl(path, query), init);
  } catch (error) {
    // Re-throw aborts untouched so callers can distinguish cancellation.
    if (error instanceof DOMException && error.name === "AbortError") throw error;
    throw new ApiError(
      error instanceof Error && error.message
        ? `Network error: ${error.message}`
        : "Unable to reach the server. Check your connection and try again.",
      0,
      error,
    );
  }

  const payload = await parseBody(response);

  if (!response.ok) {
    // A token we actually sent was rejected -> drop it so the UI can react
    // (AuthProvider subscribes to the token store and will fall back to
    // logged-out state, and middleware will bounce the next navigation).
    if (response.status === 401 && token) {
      clearToken();
    }
    throw new ApiError(
      extractMessage(payload, `Request failed with status ${response.status}`),
      response.status,
      payload,
    );
  }

  return payload as T;
}

export function get<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>("GET", path, undefined, options);
}

export function post<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("POST", path, body, options);
}

export function patch<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("PATCH", path, body, options);
}

export function put<T>(
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  return request<T>("PUT", path, body, options);
}

export function del<T>(path: string, options?: RequestOptions): Promise<T> {
  return request<T>("DELETE", path, undefined, options);
}

/** Namespaced handle, for callers that prefer `api.get(...)`. */
export const api = { get, post, patch, put, del };
