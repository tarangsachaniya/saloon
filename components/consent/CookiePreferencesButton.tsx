"use client";

import type { ReactNode } from "react";

import { openPreferences } from "@/lib/consent/consent";

/** Reopens the Cookie Preferences modal (footer, Cookie Policy page). */
export function CookiePreferencesButton({ className, children }: { className?: string; children?: ReactNode }) {
  return (
    <button type="button" onClick={openPreferences} className={className}>
      {children ?? "Cookie preferences"}
    </button>
  );
}
