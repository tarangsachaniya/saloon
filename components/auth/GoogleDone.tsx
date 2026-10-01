"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";

import { getMe } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/useAuth";
import { postAuthDestination } from "@/lib/auth/redirect";

/**
 * Landing page after the server finished Google sign-in and set the normal
 * Salonly session cookie. It loads the signed-in profile (replacing any stale
 * cached one from a previous account) and then does a full navigation, exactly
 * where a password login would have gone.
 */
export function GoogleDone() {
  const searchParams = useSearchParams();
  const { updateUser } = useAuth();

  useEffect(() => {
    let cancelled = false;
    getMe()
      .then((user) => {
        if (cancelled) return;
        updateUser(user);
        window.location.replace(postAuthDestination(user, searchParams.get("redirectTo")));
      })
      .catch(() => {
        if (!cancelled) window.location.replace("/login?error=google_failed");
      });
    return () => {
      cancelled = true;
    };
  }, [searchParams, updateUser]);

  return (
    <div role="status" className="flex min-h-dvh items-center justify-center bg-cream px-5 text-center">
      <p className="font-chunky text-2xl font-extrabold text-plum">Signing you in…</p>
    </div>
  );
}
