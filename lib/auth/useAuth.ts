"use client";

import { useContext } from "react";
import { AuthContext, type AuthContextValue } from "./AuthProvider";

/**
 * Access the admin auth context.
 * Must be called beneath an `<AuthProvider>` (mounted in `app/admin/layout.tsx`
 * once M6 builds it; the root layout keeps it out of the customer bundle).
 */
export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an <AuthProvider>.");
  }
  return context;
}
