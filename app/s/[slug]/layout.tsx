import type { Metadata } from "next";
import { cookies } from "next/headers";
import { notFound } from "next/navigation";
import type { CSSProperties } from "react";

import { SalonProvider } from "@/lib/salon/SalonContext";
import { getActiveSalon } from "@/lib/server/salon";
import { themeFontClasses } from "@/lib/themeFonts";
import { isThemeId, resolveAccent, themeStyle, type ThemeId } from "@/lib/themes";

/**
 * Wraps every public page of one salon (`/s/[slug]/...`): resolves the tenant
 * once, 404s for an unknown or deactivated slug, exposes the public salon to
 * client components, and applies the salon's THEME: design tokens, fonts and
 * the brand-colour scales that re-skin the booking components.
 */

type Params = Promise<{ slug: string }>;

/** Development only: `sl-theme-preview` cookie overrides the theme (for design QA). */
async function previewTheme(): Promise<ThemeId | null> {
  if (process.env.NODE_ENV === "production") return null;
  const value = (await cookies()).get("sl-theme-preview")?.value;
  return isThemeId(value) ? value : null;
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const salon = await getActiveSalon(slug);
  if (!salon) return { title: "Salon not found" };
  return {
    title: { default: salon.name, template: `%s | ${salon.name}` },
    description: salon.tagline ?? `Book an appointment at ${salon.name}.`,
    openGraph: {
      title: salon.name,
      description: salon.tagline ?? undefined,
      images: salon.coverUrl ? [salon.coverUrl] : undefined,
    },
  };
}

export default async function SalonLayout({
  children,
  params,
}: Readonly<{ children: React.ReactNode; params: Params }>) {
  const { slug } = await params;
  const salon = await getActiveSalon(slug);
  if (!salon) notFound();

  const theme: ThemeId = (await previewTheme()) ?? (isThemeId(salon.theme) ? salon.theme : "SPA");
  const accent = resolveAccent(theme, salon.accentColor);

  return (
    <SalonProvider
      salon={{
        id: salon.id,
        slug: salon.slug,
        name: salon.name,
        tagline: salon.tagline,
        logoUrl: salon.logoUrl,
        accentColor: accent,
      }}
    >
      <div
        data-theme={theme}
        className={`salon-theme ${themeFontClasses(theme)} min-h-dvh bg-th-bg font-th-body text-th-text antialiased`}
        style={themeStyle(theme, salon.accentColor) as CSSProperties}
      >
        {children}
      </div>
    </SalonProvider>
  );
}
