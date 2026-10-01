import { get, post } from "./client";
import type { LoginResponse, User } from "@/lib/booking/types";
import type { RequestOptions } from "./client";

/**
 * `POST /api/auth/login` — any role (customer, salon staff, platform operator).
 *
 * Sent with `auth: false` so a stale cookie cannot trigger the client's 401
 * auto-logout path while signing in.
 *
 * Resolves to a session. This function does NOT persist the token. Use
 * `AuthProvider`'s `login()` (see `lib/auth/AuthProvider.tsx`), which calls
 * this and then stores the token in the cookie so `proxy.ts` can see it.
 */
export function login(
  email: string,
  password: string,
  options?: RequestOptions,
): Promise<LoginResponse> {
  return post<LoginResponse>(
    "/auth/login",
    { email, password },
    { auth: false, ...options },
  );
}

/** `POST /api/auth/register` — public sign-up; always creates a CUSTOMER. */
export function register(
  input: { name: string; email: string; phone: string; password: string; confirmPassword: string },
  options?: RequestOptions,
): Promise<LoginResponse> {
  return post<LoginResponse>("/auth/register", input, { auth: false, ...options });
}

/** `POST /api/auth/forgot-password` — always answers 200 (no account enumeration). */
export function forgotPassword(email: string, options?: RequestOptions): Promise<{ message: string }> {
  return post<{ message: string }>("/auth/forgot-password", { email }, { auth: false, ...options });
}

/** `POST /api/auth/reset-password`. Failures carry `payload.code` (TOKEN_EXPIRED, …). */
export function resetPassword(
  token: string,
  password: string,
  options?: RequestOptions,
): Promise<{ message: string }> {
  return post<{ message: string }>("/auth/reset-password", { token, password }, { auth: false, ...options });
}

/**
 * `GET /api/auth/me` — validates the current token and returns the signed-in
 * user. Useful to re-hydrate `user` on load when only the token cookie
 * survived (e.g. `sbs_admin_user` was cleared but the cookie wasn't).
 */
export async function getMe(options?: RequestOptions): Promise<User> {
  const data = await get<{ success: true; user: User }>("/auth/me", options);
  return data.user;
}
