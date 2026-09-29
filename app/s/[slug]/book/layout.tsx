import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { shopHeading } from "@/components/shop/ui";
import { BookingProvider } from "@/lib/booking/BookingContext";
import { getActiveSalon } from "@/lib/server/salon";

/**
 * Booking-area layout, themed per salon.
 *
 * The theme (colours, fonts, radius, shadow) comes from the parent
 * `app/s/[slug]/layout.tsx`. The wizard itself sits on a light "sheet" so the
 * existing booking components stay readable on dark themes too; their brand
 * colours (`primary`/`secondary`) are re-pointed at the salon's ink and accent
 * by `themeStyle`, so they re-skin without code changes.
 *
 * `BookingProvider` wraps the whole segment, so `/book/confirmation` shares the
 * wizard state with `/book` on a client-side navigation.
 */

export const metadata: Metadata = {
  title: "Book an appointment",
};

export default async function BookLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}>) {
  const { slug } = await params;
  const salon = await getActiveSalon(slug);
  if (!salon) notFound();
  const homeHref = `/s/${salon.slug}`;

  return (
    <BookingProvider>
      <div className="flex min-h-dvh flex-col">
        <header className="border-b border-th-border">
          <div className="container-page flex items-center justify-between gap-4 py-4">
            <Link href={homeHref} className="min-w-0 focus-visible:outline focus-visible:outline-2 focus-visible:outline-th-accent">
              <span className={`${shopHeading} block truncate text-2xl text-th-text`}>{salon.name}</span>
              <span className="block text-xs font-semibold uppercase tracking-[0.2em] text-th-accent">Book online</span>
            </Link>
            <Link
              href={homeHref}
              className="inline-flex min-h-11 shrink-0 items-center rounded-th border-th border-th-border px-4 text-sm font-semibold text-th-text transition hover:-translate-y-0.5"
            >
              ← Back to salon
            </Link>
          </div>
        </header>

        <main className="container-page w-full flex-1 py-6 sm:py-10">
          <div className="rounded-th-lg border-th border-th-border bg-white p-4 text-primary shadow-th sm:p-8">
            {children}
          </div>
          <p className="mt-6 text-center text-xs text-th-muted">
            No account needed · You pay at the salon
          </p>
        </main>
      </div>
    </BookingProvider>
  );
}
