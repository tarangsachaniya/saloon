"use client";

import { useSyncExternalStore } from "react";

import type { User } from "@/lib/booking/types";
import {
  clearToken,
  getTokenSnapshot,
  subscribe,
  USER_STORAGE_KEY,
} from "./token";

/**
 * Lightweight "who is signed in" read for public chrome (the marketing navbar).
 *
 * Deliberately NOT `useAuth()`: that needs `<AuthProvider>`, which is kept off
 * public pages to keep its bundle out of them. This only reads the token
 * cookie and the display-only cached profile `AuthProvider` writes, both of
 * which are cheap. Authority still lives server-side on every API call.
 */

export interface SessionSnapshot {
  signedIn: boolean;
  user: User | null;
}

const SIGNED_OUT: SessionSnapshot = { signedIn: false, user: null };
let cached: { token: string | null; raw: string | null; value: SessionSnapshot } | null = null;

function readSnapshot(): SessionSnapshot {
  const token = getTokenSnapshot();
  if (!token) return SIGNED_OUT;
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(USER_STORAGE_KEY);
  } catch {
    // Storage blocked: fall back to "signed in, profile unknown".
  }
  // useSyncExternalStore needs a referentially stable snapshot between changes.
  if (cached && cached.token === token && cached.raw === raw) return cached.value;
  let user: User | null = null;
  try {
    user = raw ? (JSON.parse(raw) as User) : null;
  } catch {
    user = null;
  }
  cached = { token, raw, value: { signedIn: true, user } };
  return cached.value;
}

export function useSessionUser(): SessionSnapshot {
  return useSyncExternalStore(subscribe, readSnapshot, () => SIGNED_OUT);
}

/** Sign out from anywhere (clears the cookie and the cached profile). */
export function signOut(): void {
  clearToken();
  try {
    window.localStorage.removeItem(USER_STORAGE_KEY);
  } catch {
    // ignore
  }
}
