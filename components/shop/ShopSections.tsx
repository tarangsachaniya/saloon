import Image from "next/image";
import Link from "next/link";

import type { ShopData } from "@/lib/server/shop";
import { getBarberPhotoUrl } from "@/lib/utils/barberImages";
import { formatDuration, formatTime12h, WEEKDAY_LABELS } from "@/lib/utils/time";
import { kicker, shopButton, shopCard, shopHeading } from "./ui";

const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];
const inr = (n: number) => `₹${n.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function SectionHead({ eyebrow, title, id }: { eyebrow: string; title: string; id: string }) {
  return (
    <div>
      <p className={kicker}>{eyebrow}</p>
      <h2 id={id} className={`${shopHeading} mt-3 text-4xl sm:text-5xl lg:text-6xl`}>
        {title}
      </h2>
    </div>
  );
}

/* -------------------------------- Services -------------------------------- */
export function ServicesSection({ slug, data, onBand = true }: { slug: string; data: ShopData; onBand?: boolean }) {
  return (
    <section
      id="services"
      aria-labelledby="services-h"
      className={`scroll-mt-20 ${onBand ? "bg-th-band text-th-on-band" : "bg-th-bg text-th-text"}`}
    >
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead eyebrow="Menu" title="Services & prices" id="services-h" />
          <Link href={`/s/${slug}/book`} className={shopButton}>
            Book a service
          </Link>
        </div>

        {data.serviceCount === 0 ? (
          <p className="mt-10 text-lg opacity-80">The menu is being prepared. Please check back soon.</p>
        ) : (
          <div className="mt-12 gap-14 lg:columns-2">
            {data.serviceGroups.map((group) => (
              <div key={group.category} className="mb-12 break-inside-avoid">
                <h3 className={`${shopHeading} text-2xl`}>{group.category}</h3>
                <ul className="mt-4 flex flex-col">
                  {group.items.map((s) => (
                    <li
                      key={s.id}
                      className="flex items-baseline gap-4 border-b py-4 [border-color:color-mix(in_srgb,currentColor_18%,transparent)]"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="text-lg font-semibold">{s.name}</p>
                        {s.description && <p className="mt-0.5 text-sm opacity-75">{s.description}</p>}
                      </div>
                      <span className="shrink-0 text-sm opacity-75">{formatDuration(s.durationMinutes)}</span>
                      <span className="w-20 shrink-0 text-right text-lg font-bold">{inr(s.price)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

/* ---------------------------------- Team ---------------------------------- */
export function TeamSection({ data }: { data: ShopData }) {
  if (data.barbers.length === 0) return null;
  return (
    <section id="team" aria-labelledby="team-h" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <SectionHead eyebrow="The team" title="Meet your stylists" id="team-h" />
        <ul className="mt-12 grid grid-cols-2 gap-5 md:grid-cols-3 lg:grid-cols-4">
          {data.barbers.map((b) => (
            <li key={b.id} className={`${shopCard} group overflow-hidden`}>
              <div className="relative aspect-[4/5] overflow-hidden">
                <Image
                  src={getBarberPhotoUrl(b)}
                  alt={`${b.name}, stylist`}
                  fill
                  sizes="(min-width:1024px) 22vw, 45vw"
                  className="object-cover transition duration-700 group-hover:scale-105"
                />
              </div>
              <div className="p-4">
                <p className={`${shopHeading} text-xl`}>{b.name}</p>
                {b.specializations.length > 0 && (
                  <p className="mt-1 line-clamp-2 text-sm text-th-muted">{b.specializations.slice(0, 3).join(" · ")}</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

/* --------------------------------- Gallery -------------------------------- */
export function GallerySection({ images, name }: { images: string[]; name: string }) {
  if (images.length === 0) return null;
  return (
    <section aria-labelledby="gallery-h" className="mx-auto max-w-7xl px-4 pb-20 sm:px-6">
      <h2 id="gallery-h" className="sr-only">
        Gallery
      </h2>
      <ul className="grid grid-cols-2 gap-4 md:grid-cols-3">
        {images.slice(0, 6).map((src, i) => (
          <li key={src} className={`relative overflow-hidden rounded-th-lg ${i === 0 ? "col-span-2 row-span-2 aspect-square md:aspect-auto" : "aspect-square"}`}>
            <Image src={src} alt={`${name} gallery photo ${i + 1}`} fill sizes="(min-width:768px) 33vw, 50vw" className="object-cover" />
          </li>
        ))}
      </ul>
    </section>
  );
}

/* --------------------------------- Reviews -------------------------------- */
export function ReviewsSection({ data }: { data: ShopData }) {
  return (
    <section id="reviews" aria-labelledby="reviews-h" className="scroll-mt-20">
      <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 sm:py-28">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <SectionHead eyebrow="Guest reviews" title="What guests say" id="reviews-h" />
          {data.rating && (
            <p className={`${shopHeading} text-5xl`} aria-label={`Average ${data.rating.average} out of 5 from ${data.rating.count} reviews`}>
              ★ {data.rating.average.toFixed(1)}
              <span className="ml-2 font-th-body text-base font-medium normal-case tracking-normal text-th-muted">
                {data.rating.count} review{data.rating.count === 1 ? "" : "s"}
              </span>
            </p>
          )}
        </div>

        {data.reviews.length === 0 ? (
          <div className={`${shopCard} mt-10 p-8 text-center`}>
            <p className={`${shopHeading} text-2xl`}>No reviews yet</p>
            <p className="mt-2 text-th-muted">After your visit you&apos;ll get a private link to leave the first one.</p>
          </div>
        ) : (
          <ul className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {data.reviews.map((r) => (
              <li key={r.id} className={`${shopCard} flex flex-col p-7`}>
                <p className="text-th-accent" aria-label={`${r.rating} out of 5 stars`}>
                  {"★".repeat(r.rating)}
                  <span className="opacity-30">{"★".repeat(5 - r.rating)}</span>
                </p>
                <blockquote className="mt-4 flex-1 text-lg leading-relaxed">“{r.comment}”</blockquote>
                <p className="mt-5 text-sm font-semibold text-th-muted">
                  {r.authorName} · {new Date(r.createdAt).toLocaleDateString("en-IN", { month: "short", year: "numeric" })}
                </p>
                {r.ownerReply && (
                  <p className="mt-4 border-l-2 border-th-accent pl-4 text-sm text-th-muted">
                    <span className="font-semibold text-th-text">Reply from the salon: </span>
                    {r.ownerReply}
                  </p>
                )}
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

/* ------------------------------- Visit / hours ------------------------------ */
export function VisitSection({
  salon,
  data,
  mapLink,
  mapEmbedUrl,
  mapViewUrl,
}: {
  salon: { name: string; address: string | null; phone: string | null; email: string | null; slug: string };
  data: ShopData;
  mapLink: string | null;
  /** OpenStreetMap embed URL generated from lat/lng. When set, an interactive map is rendered. */
  mapEmbedUrl?: string | null;
  /** Full-size OpenStreetMap page for the pin. */
  mapViewUrl?: string | null;
}) {
  const byDay = new Map(data.hours.map((h) => [h.weekday, h]));
  return (
    <section id="visit" aria-labelledby="visit-h" className="scroll-mt-20 bg-th-band text-th-on-band">
      <div className="mx-auto max-w-7xl gap-12 px-4 py-20 sm:px-6 sm:py-28">
        {/* Section heading */}
        <div className="mb-10">
          <SectionHead eyebrow="Visit us" title="Hours & location" id="visit-h" />
        </div>

        <div className="grid gap-12 lg:grid-cols-2">
          {/* Left: contact details + map */}
          <div className="flex flex-col gap-8">
            <dl className="flex flex-col gap-5 text-lg">
              {salon.address && (
                <div>
                  <dt className="text-sm font-semibold uppercase tracking-widest opacity-60">Address</dt>
                  <dd className="mt-1 font-medium">{salon.address}</dd>
                  {mapLink && (
                    <a href={mapLink} target="_blank" rel="noreferrer" className="mt-2 inline-block text-base font-semibold underline underline-offset-4">
                      Get directions ↗
                    </a>
                  )}
                </div>
              )}
              {salon.phone && (
                <div>
                  <dt className="text-sm font-semibold uppercase tracking-widest opacity-60">Phone</dt>
                  <dd className="mt-1 font-medium">
                    <a href={`tel:${salon.phone.replace(/\s+/g, "")}`} className="underline-offset-4 hover:underline">
                      {salon.phone}
                    </a>
                  </dd>
                </div>
              )}
              {salon.email && (
                <div>
                  <dt className="text-sm font-semibold uppercase tracking-widest opacity-60">Email</dt>
                  <dd className="mt-1 break-all font-medium">
                    <a href={`mailto:${salon.email}`} className="underline-offset-4 hover:underline">
                      {salon.email}
                    </a>
                  </dd>
                </div>
              )}
            </dl>

            {/* ---- Interactive Map + Open in Native Maps ---- */}
            {mapEmbedUrl ? (
              <div className="flex flex-col gap-3">
                <div className="relative h-72 sm:h-80 w-full overflow-hidden rounded-th-lg shadow-lg border border-th-border">
                  <iframe
                    title={`${salon.name} location`}
                    src={mapEmbedUrl}
                    className="absolute inset-0 w-full h-[calc(100%+42px)] border-0"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    sandbox="allow-scripts allow-same-origin"
                    allowFullScreen
                  />
                </div>
                {mapLink && (
                  <a
                    href={mapLink}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center justify-center gap-2 rounded-th bg-th-accent px-5 py-3 text-sm font-bold text-th-on-accent transition hover:opacity-90 shadow-md"
                  >
                    <svg className="h-4 w-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    Open Directions in Google / Apple Maps ↗
                  </a>
                )}
              </div>
            ) : salon.address ? (
              /* Fallback: no coordinates — show a search-map button */
              <a
                href={mapLink ?? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${salon.name}, ${salon.address}`)}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 self-start rounded-th text-base font-bold underline underline-offset-4"
              >
                <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden>
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Open in Maps ↗
              </a>
            ) : null}
          </div>

          {/* Right: Opening hours table */}
          <div className={`${shopCard} self-start p-6 text-th-text sm:p-8`}>
            <h3 className={`${shopHeading} text-2xl`}>Opening hours</h3>
            <table className="mt-5 w-full text-base">
              <caption className="sr-only">Opening hours by day</caption>
              <tbody>
                {WEEK_ORDER.map((d) => {
                  const h = byDay.get(d);
                  const isToday = d === data.todayWeekday;
                  return (
                    <tr key={d} className={`border-b border-th-border last:border-0 ${isToday ? "font-bold" : ""}`}>
                      <th scope="row" className="py-3 text-left font-medium">
                        {WEEKDAY_LABELS[d]}
                        {isToday && (
                          <span className="ml-2 rounded-full bg-th-accent px-2 py-0.5 text-xs font-bold text-th-on-accent">Today</span>
                        )}
                      </th>
                      <td className={`py-3 text-right tabular-nums ${h?.isOpen ? "" : "text-th-muted"}`}>
                        {h?.isOpen ? `${formatTime12h(h.openTime)} – ${formatTime12h(h.closeTime)}` : "Closed"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            <Link href={`/s/${salon.slug}/book`} className={`${shopButton} mt-7 w-full`}>
              Book your visit
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
