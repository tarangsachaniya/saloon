"use client";

import { useState } from "react";

import { popButton } from "@/components/marketing/pop/ui";
import { useAuth } from "@/lib/auth/useAuth";

/**
 * Clears the session cookie and cached profile (AuthProvider.logout), then
 * leaves the protected page. Tokens are stateless JWTs, so "invalidate" means
 * the browser forgets it; there is no server-side session to revoke.
 */
export function LogoutButton() {
  const { logout } = useAuth();
  const [busy, setBusy] = useState(false);

  return (
    <button
      type="button"
      disabled={busy}
      aria-busy={busy}
      onClick={() => {
        setBusy(true);
        logout();
        // Full navigation: drops every in-memory copy of the customer's data too.
        window.location.assign("/login");
      }}
      className={`${popButton("white", "md")} disabled:cursor-wait disabled:opacity-70`}
    >
      {busy ? "Logging out…" : "Log out"}
    </button>
  );
}
