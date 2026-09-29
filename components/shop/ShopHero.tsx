import Image from "next/image";
import Link from "next/link";

import type { HeroVariant } from "@/lib/themes";
import { formatTime12h } from "@/lib/utils/time";
import { FALLBACK_COVER, FALLBACK_DETAIL, kicker, shopButton, shopButtonGhost, shopHeading } from "./ui";

export interface HeroProps {
  variant: HeroVariant;
  salon: {
    slug: string;
    name: string;
    tagline: string | null;
    address: string | null;
    phone: string | null;
    coverUrl: string | null;
    gallery: string[];
  };
  rating: { average: number; count: number } | null;
  today: { open: number; close: number } | null;
  fromPrice: number | null;
}

/** Small facts under the hero: rating, today's hours, starting price. */
function Facts({ rating, today, fromPrice, className = "" }: Pick<HeroProps, "rating" | "today" | "fromPrice"> & { className?: string }) {
  const items = [
    rating ? `★ ${rating.average.toFixed(1)} · ${rating.count} review${rating.count === 1 ? "" : "s"}` : null,
    today ? `Open today ${formatTime12h(today.open)} – ${formatTime12h(today.close)}` : "Closed today",
    fromPrice !== null ? `From ₹${fromPrice.toLocaleString("en-IN")}` : null,
  ].filter(Boolean) as string[];
  return (
    <ul className={`flex flex-wrap gap-2 text-sm ${className}`}>
      {items.map((t) => (
        <li key={t} className="rounded-full border px-3 py-1 font-medium [border-color:color-mix(in_srgb,currentColor_25%,transparent)]">
          {t}
        </li>
      ))}
    </ul>
  );
}

function Actions({ slug, phone, ghostClass = "" }: { slug: string; phone: string | null; ghostClass?: string }) {
  return (
    <div className="flex flex-wrap gap-3">
      <Link href={`/s/${slug}/book`} className={shopButton}>
        Book an appointment <span aria-hidden="true">→</span>
      </Link>
      {phone && (
        <a href={`tel:${phone.replace(/\s+/g, "")}`} className={`${shopButtonGhost} ${ghostClass}`}>
          Call {phone}
        </a>
      )}
    </div>
  );
}

/* ------------------------------ SPA: arched ------------------------------ */
function Arch(p: HeroProps) {
  const cover = p.salon.coverUrl || FALLBACK_COVER;
  const detail = p.salon.gallery[0] || FALLBACK_DETAIL;
  return (
    <section className="mx-auto grid max-w-7xl items-center gap-14 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:pt-16">
      <div className="animate-reveal-up">
        {p.salon.address && <p className={kicker}>{p.salon.address}</p>}
        <h1 className={`${shopHeading} mt-5 text-6xl sm:text-7xl lg:text-8xl`}>{p.salon.name}</h1>
        {p.salon.tagline && <p className="mt-6 max-w-lg text-xl leading-relaxed text-th-muted">{p.salon.tagline}</p>}
        <Facts {...p} className="mt-7 text-th-muted" />
        <div className="mt-9">
          <Actions slug={p.salon.slug} phone={p.salon.phone} />
        </div>
      </div>
      <div className="relative mx-auto h-[30rem] w-full max-w-md animate-reveal-up [animation-delay:150ms] sm:h-[36rem]">
        <div className="absolute -right-6 top-10 h-64 w-64 animate-glow-pulse rounded-full bg-th-accent opacity-30 blur-3xl" />
        <div className="absolute inset-x-6 inset-y-0 overflow-hidden rounded-t-full shadow-th">
          <Image src={cover} alt={`Inside ${p.salon.name}`} fill priority sizes="(min-width:1024px) 28rem, 90vw" className="object-cover" />
        </div>
        <div className="absolute -left-2 bottom-14 h-32 w-32 overflow-hidden rounded-full border-4 border-th-bg shadow-th">
          <Image src={detail} alt="" fill sizes="8rem" className="object-cover" />
        </div>
      </div>
    </section>
  );
}

/* ---------------------------- CUT: sharp slice --------------------------- */
function Cut(p: HeroProps) {
  const cover = p.salon.coverUrl || FALLBACK_COVER;
  return (
    <section className="mx-auto max-w-7xl px-4 pb-20 pt-10 sm:px-6 lg:pt-14">
      {p.salon.address && <p className="text-xs font-semibold uppercase tracking-[0.3em] text-th-muted">{p.salon.address}</p>}
      <div className="relative mt-4">
        <h1 className={`${shopHeading} animate-reveal-up text-[15vw] leading-[0.86] sm:text-[12vw] lg:text-[10rem]`}>{p.salon.name}</h1>
        <span aria-hidden="true" className="absolute left-0 top-1/2 h-[3px] w-full -rotate-2 animate-reveal-up bg-th-accent [animation-delay:350ms]" />
      </div>
      <div className="mt-12 grid items-end gap-10 md:grid-cols-[1fr_1.35fr]">
        <div className="animate-reveal-up [animation-delay:200ms]">
          {p.salon.tagline && <p className="max-w-sm text-lg text-th-muted">{p.salon.tagline}</p>}
          <Facts {...p} className="mt-6 text-th-muted" />
          <div className="mt-8">
            <Actions slug={p.salon.slug} phone={p.salon.phone} />
          </div>
        </div>
        <div className="relative aspect-[16/10] overflow-hidden [clip-path:polygon(7%_0,100%_0,93%_100%,0_100%)]">
          <Image
            src={cover}
            alt={`Inside ${p.salon.name}`}
            fill
            priority
            sizes="(min-width:768px) 55vw, 100vw"
            className="object-cover grayscale contrast-125 transition duration-700 hover:grayscale-0"
          />
          <div className="absolute inset-0 bg-[linear-gradient(120deg,transparent_45%,var(--t-accent))] opacity-60 mix-blend-multiply" />
        </div>
      </div>
    </section>
  );
}

/* --------------------------- PLAYFUL: blob + stickers --------------------------- */
function Blob(p: HeroProps) {
  const cover = p.salon.coverUrl || FALLBACK_COVER;
  return (
    <section className="bg-th-band text-th-on-band">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-4 pb-20 pt-10 sm:px-6 lg:grid-cols-[1.1fr_0.9fr] lg:pt-14">
        <div className="animate-reveal-up">
          {p.salon.address && (
            <span className="inline-block -rotate-2 rounded-full border-2 border-current bg-th-surface px-4 py-1 text-sm font-bold">
              {p.salon.address}
            </span>
          )}
          <h1 className={`${shopHeading} mt-6 text-6xl leading-[0.92] sm:text-8xl`}>{p.salon.name}</h1>
          {p.salon.tagline && <p className="mt-6 max-w-md text-xl font-medium">{p.salon.tagline}</p>}
          <Facts {...p} className="mt-7 font-semibold" />
          <div className="mt-9">
            <Actions slug={p.salon.slug} phone={p.salon.phone} ghostClass="bg-th-surface" />
          </div>
        </div>
        <div className="relative mx-auto h-[26rem] w-full max-w-md sm:h-[31rem]">
          <div className="absolute right-0 top-2 h-64 w-64 rounded-full bg-th-accent opacity-80 sm:h-80 sm:w-80" />
          <div className="absolute bottom-6 left-0 h-36 w-36 rounded-[42%_58%_55%_45%/50%_45%_55%_50%] bg-th-surface border-th border-th-border" />
          <div className="absolute inset-6 animate-reveal-up overflow-hidden border-th border-th-border shadow-th [border-radius:58%_42%_50%_50%/45%_55%_45%_55%] sm:inset-8">
            <Image src={cover} alt={`Inside ${p.salon.name}`} fill priority sizes="(min-width:1024px) 28rem, 90vw" className="object-cover" />
          </div>
          {p.today && (
            <span className="absolute -left-2 top-10 animate-wiggle rounded-full border-2 border-th-border bg-th-surface px-4 py-2 text-sm font-extrabold shadow-th">
              Open today ✦
            </span>
          )}
          {p.rating && (
            <span className="absolute -right-2 bottom-20 animate-wiggle rounded-2xl border-2 border-th-border bg-th-surface px-4 py-3 text-sm font-extrabold shadow-th [animation-delay:-1.6s]">
              ★ {p.rating.average.toFixed(1)} from {p.rating.count}
            </span>
          )}
        </div>
      </div>
      {/* Curved hand-off into the (cream) section below. */}
      <svg viewBox="0 0 1440 70" overflow="visible" className="-mb-px block w-full" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 35 C 240 80 480 -10 720 35 S 1200 80 1440 35 V72 H0Z" fill="var(--t-bg)" />
      </svg>
    </section>
  );
}

/* ------------------------------ LUXE: glow ------------------------------ */
function Glow(p: HeroProps) {
  const cover = p.salon.coverUrl || FALLBACK_COVER;
  return (
    <section className="relative overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute left-1/2 top-0 h-[34rem] w-[60rem] -translate-x-1/2 animate-glow-pulse rounded-full opacity-40 blur-[120px]"
        style={{ background: "radial-gradient(closest-side, var(--t-accent), transparent)" }}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)",
          backgroundSize: "64px 64px",
          maskImage: "radial-gradient(ellipse at top, black 20%, transparent 70%)",
        }}
      />
      <div className="relative mx-auto max-w-5xl px-4 pb-16 pt-16 text-center sm:px-6 lg:pt-24">
        {p.salon.address && (
          <p className="inline-flex rounded-full border border-th-border bg-th-surface px-4 py-1.5 text-xs font-medium text-th-muted">
            {p.salon.address}
          </p>
        )}
        <h1
          className={`${shopHeading} mt-7 animate-reveal-up text-5xl sm:text-7xl lg:text-8xl`}
          style={{ backgroundImage: "linear-gradient(180deg, var(--t-text), var(--t-muted))", WebkitBackgroundClip: "text", color: "transparent" }}
        >
          {p.salon.name}
        </h1>
        {p.salon.tagline && <p className="mx-auto mt-6 max-w-xl text-lg text-th-muted">{p.salon.tagline}</p>}
        <div className="mt-7 flex justify-center">
          <Facts {...p} className="justify-center text-th-muted" />
        </div>
        <div className="mt-9 flex justify-center">
          <Actions slug={p.salon.slug} phone={p.salon.phone} />
        </div>
      </div>
      <div className="relative mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="relative aspect-[21/9] animate-reveal-up overflow-hidden rounded-th-lg border border-th-border shadow-th [animation-delay:200ms]">
          <Image src={cover} alt={`Inside ${p.salon.name}`} fill priority sizes="(min-width:1152px) 72rem, 100vw" className="object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[var(--t-bg)] via-transparent to-transparent" />
        </div>
      </div>
    </section>
  );
}

export function ShopHero(props: HeroProps) {
  switch (props.variant) {
    case "cut":
      return <Cut {...props} />;
    case "blob":
      return <Blob {...props} />;
    case "glow":
      return <Glow {...props} />;
    default:
      return <Arch {...props} />;
  }
}
