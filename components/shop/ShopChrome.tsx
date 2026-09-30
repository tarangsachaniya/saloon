import Image from "next/image";
import Link from "next/link";

import { BRAND } from "@/lib/brand";
import { ShopAccountLink } from "./ShopAccountLink";
import { shopButton, shopHeading } from "./ui";

type Salon = { slug: string; name: string; logoUrl: string | null; phone: string | null };

const LINKS = [
  { href: "#services", label: "Services" },
  { href: "#team", label: "Team" },
  { href: "#reviews", label: "Reviews" },
  { href: "#visit", label: "Visit" },
];

export function ShopNav({ salon }: { salon: Salon }) {
  return (
    <header className="sticky top-0 z-40 border-b border-th-border backdrop-blur [background:color-mix(in_srgb,var(--t-bg)_92%,transparent)]">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <Link href={`/s/${salon.slug}`} className="flex min-w-0 items-center gap-3">
          {salon.logoUrl && (
            <span className="relative h-9 w-9 shrink-0 overflow-hidden rounded-th">
              <Image src={salon.logoUrl} alt="" fill sizes="36px" className="object-cover" />
            </span>
          )}
          <span className={`${shopHeading} truncate text-xl sm:text-2xl`}>{salon.name}</span>
        </Link>
        <nav aria-label="Sections" className="hidden items-center gap-8 text-sm font-medium lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="text-th-muted transition hover:text-th-text">
              {l.label}
            </a>
          ))}
        </nav>
        <div className="flex shrink-0 items-center gap-2">
          {salon.phone && (
            <a
              href={`tel:${salon.phone.replace(/\s+/g, "")}`}
              className="hidden min-h-11 items-center rounded-th px-4 text-sm font-semibold text-th-text hover:underline sm:inline-flex"
            >
              Call
            </a>
          )}
          <Link
            href="/"
            className="inline-flex min-h-11 items-center rounded-th px-4 text-sm font-semibold text-th-text hover:underline"
          >
            Home
          </Link>
          <ShopAccountLink />
          <Link href={`/s/${salon.slug}/book`} className={`${shopButton} min-h-11 px-5 text-sm`}>
            Book now
          </Link>
        </div>
      </div>
    </header>
  );
}

export function ShopFooter({ salon }: { salon: Salon }) {
  return (
    <footer className="border-t border-th-border">
      <div className="mx-auto flex max-w-7xl flex-col items-start justify-between gap-6 px-4 py-12 sm:flex-row sm:items-center sm:px-6">
        <div>
          <p className={`${shopHeading} text-2xl`}>{salon.name}</p>
          <p className="mt-1 text-sm text-th-muted">
            &copy; {new Date().getFullYear()} {salon.name}
          </p>
        </div>
        <div className="flex flex-col items-start gap-3 sm:items-end">
          <Link href={`/s/${salon.slug}/book`} className={shopButton}>
            Book an appointment
          </Link>
          <p className="text-xs text-th-muted">
            Online booking by{" "}
            <Link href="/" className="font-semibold underline underline-offset-2 hover:text-th-text">
              {BRAND.name}
            </Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
