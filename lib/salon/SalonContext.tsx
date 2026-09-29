"use client";

import { createContext, useContext, type ReactNode } from "react";

/**
 * The public salon whose pages the visitor is on (`/s/[slug]/...`).
 *
 * Booking components read the slug from here instead of taking it as a prop
 * through every wizard step. It carries only public, display-safe fields.
 */
export interface PublicSalon {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  logoUrl: string | null;
  accentColor: string | null;
}

const SalonContext = createContext<PublicSalon | null>(null);

export function SalonProvider({
  salon,
  children,
}: {
  salon: PublicSalon;
  children: ReactNode;
}) {
  return <SalonContext.Provider value={salon}>{children}</SalonContext.Provider>;
}

export function useSalon(): PublicSalon {
  const salon = useContext(SalonContext);
  if (!salon) {
    throw new Error("useSalon must be used beneath a <SalonProvider> (app/s/[slug]/layout.tsx).");
  }
  return salon;
}
