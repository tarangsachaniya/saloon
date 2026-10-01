"use client";

import {
  createContext,
  useCallback,
  useEffect,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import {
  getMe,
  login as loginRequest,
  register as registerRequest,
  verifyTwoFactor as verifyTwoFactorRequest,
} from "@/lib/api/auth";
import { isApiError } from "@/lib/api/client";
import {
  clearToken,
  getTokenServerSnapshot,
  getTokenSnapshot,
  setToken,
  subscribe,
  USER_STORAGE_KEY,
} from "./token";
import type { User } from "@/lib/booking/types";

/**
 * Auth context for the sign-in/sign-up screens and the staff/platform areas
 * (salon staff, platform operator and customers).
 *
 * Token handling:
 *   - The JWT lives in a cookie (`sbs_admin_token`) so `middleware.ts` can read
 *     it server-side; `lib/api/client.ts` reads it fresh on every request.
 *   - `useSyncExternalStore` subscribes to the token store, so a login or
 *     logout re-renders consumers immediately — no `window.location.reload()`.
 *   - The `user` object is cached in `localStorage` purely to avoid a flash of
 *     "unknown user" on refresh. It is display-only; the cookie token is the
 *     sole source of authority, and the server re-validates every request.
 */

export interface AuthContextValue {
  /** Current JWT, or null when signed out. */
  token: string | null;
  /** Cached profile of the signed-in user, if known. */
  user: User | null;
  /** True when a token is present. */
  isAuthenticated: boolean;
  /** True until the first client-side hydration settles. */
  isLoading: boolean;
  /** True while a `login()` call is in flight. */
  isSigningIn: boolean;
  /**
   * Sign in. Persists the token cookie on success and returns the user, or
   * `{ twoFactorRequired, challenge }` when an authenticator code is still
   * owed (no session is created yet). Throws `ApiError` on bad credentials —
   * callers should catch and display `error.message`.
   */
  login: (email: string, password: string) => Promise<LoginResult>;
  /** Redeem a 2FA challenge with the 6-digit code; persists the session. */
  verifyTwoFactor: (challenge: string, code: string) => Promise<User>;
  /** Create a CUSTOMER account and sign it in. Throws `ApiError`. */
  register: (input: RegisterRequest) => Promise<User>;
  /** Replace the cached profile after an edit (e.g. the account page). */
  updateUser: (user: User) => void;
  /** Clear the token cookie and cached user. */
  logout: () => void;
}

export type LoginResult = User | { twoFactorRequired: true; challenge: string };
type RegisterRequest = Parameters<typeof registerRequest>[0];

export const AuthContext = createContext<AuthContextValue | null>(null);

function readStoredUser(): User | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(USER_STORAGE_KEY);
    return raw ? (JSON.parse(raw) as User) : null;
  } catch {
    return null;
  }
}

function writeStoredUser(user: User | null): void {
  if (typeof window === "undefined") return;
  try {
    if (user) {
      window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(user));
    } else {
      window.localStorage.removeItem(USER_STORAGE_KEY);
    }
  } catch {
    // Private browsing / storage disabled — the app still works without it.
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  // Reactive read of the token cookie. Re-renders on login/logout, and also
  // when `client.ts` clears the token after a 401.
  const token = useSyncExternalStore(
    subscribe,
    getTokenSnapshot,
    getTokenServerSnapshot,
  );

  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSigningIn, setIsSigningIn] = useState(false);

  // Hydrate the cached user on mount (localStorage is unavailable during SSR).
  // If a token cookie survived without its cached user (e.g. localStorage was
  // cleared independently), re-fetch the profile from /auth/me instead of
  // leaving the UI in a logged-in-but-anonymous state.
  useEffect(() => {
    const cached = readStoredUser();
    if (cached) {
      setUser(cached);
      setIsLoading(false);
      return;
    }
    if (!getTokenSnapshot()) {
      setIsLoading(false);
      return;
    }
    let cancelled = false;
    getMe()
      .then((fetched) => {
        if (cancelled) return;
        setUser(fetched);
        writeStoredUser(fetched);
      })
      .catch((error) => {
        // An invalid/expired token: client.ts already clears it on a 401.
        if (!isApiError(error) || !error.isUnauthorized) {
          console.error("[auth] failed to restore session:", error);
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
    // Runs once on mount only - a token acquired later comes through login().
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // If the token disappears (logout elsewhere, or a 401 auto-clear), drop the
  // cached profile so the UI cannot show a stale identity.
  useEffect(() => {
    if (!token && !isLoading) {
      setUser(null);
      writeStoredUser(null);
    }
  }, [token, isLoading]);

  // Store the token FIRST so any request fired by the redirect target already
  // carries it.
  const startSession = useCallback((response: { token: string; user: User }): User => {
    setToken(response.token);
    setUser(response.user);
    writeStoredUser(response.user);
    return response.user;
  }, []);

  const login = useCallback(
    async (email: string, password: string): Promise<LoginResult> => {
      setIsSigningIn(true);
      try {
        const response = await loginRequest(email, password);
        if ("twoFactorRequired" in response) {
          return { twoFactorRequired: true, challenge: response.challenge };
        }
        return startSession(response);
      } finally {
        setIsSigningIn(false);
      }
    },
    [startSession],
  );

  const verifyTwoFactor = useCallback(
    async (challenge: string, code: string): Promise<User> => {
      setIsSigningIn(true);
      try {
        return startSession(await verifyTwoFactorRequest(challenge, code));
      } finally {
        setIsSigningIn(false);
      }
    },
    [startSession],
  );

  const register = useCallback(
    async (input: RegisterRequest): Promise<User> => {
      setIsSigningIn(true);
      try {
        return startSession(await registerRequest(input));
      } finally {
        setIsSigningIn(false);
      }
    },
    [startSession],
  );

  const updateUser = useCallback((next: User) => {
    setUser(next);
    writeStoredUser(next);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    setUser(null);
    writeStoredUser(null);
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({
      token,
      user,
      isAuthenticated: Boolean(token),
      isLoading,
      isSigningIn,
      login,
      verifyTwoFactor,
      register,
      updateUser,
      logout,
    }),
    [token, user, isLoading, isSigningIn, login, verifyTwoFactor, register, updateUser, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
