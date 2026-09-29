import { cookies } from "next/headers";
import { notFound } from "next/navigation";

import { ShopFooter, ShopNav } from "@/components/shop/ShopChrome";
import { ShopHero } from "@/components/shop/ShopHero";
import {
  GallerySection,
  ReviewsSection,
  ServicesSection,
  TeamSection,
  VisitSection,
} from "@/components/shop/ShopSections";
import { seoText } from "@/lib/seo";
import { getActiveSalon } from "@/lib/server/salon";
import { embedUrlFor, getShopData, mapLinkFor, mapViewUrlFor } from "@/lib/server/shop";
import { isThemeId, THEME_TOKENS, type ThemeId } from "@/lib/themes";

/**
 * A salon's public shop page. One markup for every salon; the look comes from
 * the theme tokens set by `layout.tsx`, plus the theme's hero variant.
 */

export const dynamic = "force-dynamic";

export default async function SalonShopPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const salon = await getActiveSalon(slug);
  if (!salon) notFound();

  // Same resolution as the layout (dev-only preview cookie, else the salon's theme).
  const preview =
    process.env.NODE_ENV !== "production" ? (await cookies()).get("sl-theme-preview")?.value : undefined;
  const theme: ThemeId = isThemeId(preview) ? preview : isThemeId(salon.theme) ? salon.theme : "SPA";

  const data = await getShopData(salon);
  const phone = salon.phone ?? data.settings?.phone ?? null;

  // schema.org data for search engines (address, phone, rating).
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "HairSalon",
    name: seoText(salon.name),
    description: seoText(salon.tagline),
    telephone: phone ?? undefined,
    email: salon.email ?? undefined,
    address: seoText(salon.address),
    image: salon.coverUrl ?? undefined,
    aggregateRating: data.rating
      ? { "@type": "AggregateRating", ratingValue: data.rating.average, reviewCount: data.rating.count }
      : undefined,
  };

  return (
    <div className="salon-shop">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />
      <ShopNav salon={{ slug: salon.slug, name: salon.name, logoUrl: salon.logoUrl, phone }} />
      <main>
        <ShopHero
          variant={THEME_TOKENS[theme].hero}
          salon={{
            slug: salon.slug,
            name: salon.name,
            tagline: salon.tagline,
            address: salon.address,
            phone,
            coverUrl: salon.coverUrl,
            gallery: salon.gallery,
          }}
          rating={data.rating}
          today={data.today}
          fromPrice={data.fromPrice}
        />
        {/* The PLAYFUL hero is already a coloured band; alternate so sections read apart. */}
        <ServicesSection slug={salon.slug} data={data} onBand={THEME_TOKENS[theme].hero !== "blob"} />
        <TeamSection data={data} />
        <GallerySection images={salon.gallery} name={salon.name} />
        <ReviewsSection data={data} />
        <VisitSection
          salon={{ name: salon.name, address: salon.address, phone, email: salon.email, slug: salon.slug }}
          data={data}
          mapLink={mapLinkFor(salon)}
          mapEmbedUrl={embedUrlFor(salon)}
          mapViewUrl={mapViewUrlFor(salon)}
        />
      </main>
      <ShopFooter salon={{ slug: salon.slug, name: salon.name, logoUrl: salon.logoUrl, phone }} />
    </div>
  );
}
