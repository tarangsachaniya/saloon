import Link from "next/link";

import { BRAND } from "@/lib/brand";

import { CookiePreferencesButton } from "@/components/consent/CookiePreferencesButton";

import { ListSalonLink } from "./ListSalonLink";

const COLUMNS = [
  {
    title: "Explore",
    links: [
      { href: "/salons", label: "Find a salon" },
      { href: "/#how-it-works", label: "How it works" },
      { href: "/#for-salons", label: "For owners" },
      { href: "/#faq", label: "FAQ" },
    ],
  },
  {
    title: "Salons",
    links: [
      { href: "/contact", label: "List your salon" },
      { href: "/login", label: "Owner sign in" },
      { href: `mailto:${BRAND.contact.email}`, label: "Email us" },
    ],
  },
  {
    title: "Legal",
    links: [
      { href: "/legal/terms", label: "Terms & Conditions" },
      { href: "/legal/privacy", label: "Privacy Policy" },
      { href: "/legal/cookies", label: "Cookie Policy" },
      { href: "/legal/refund-cancellation", label: "Cancellations & Refunds" },
      { href: "/legal/data-consent", label: "Data Consent" },
      { href: "/legal/grievance", label: "Grievance Officer" },
    ],
  },
] as const;

export function PopFooter() {
  return (
    <footer className="overflow-hidden bg-plum text-cream">
      <div className="mx-auto max-w-7xl px-5 pt-20 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <p className="font-chunky text-4xl font-extrabold text-butter">
              {BRAND.name.toLowerCase()}
              <span className="text-tomato">●</span>
            </p>
            <p className="mt-4 max-w-sm text-cream/75">{BRAND.description}</p>
            <p className="mt-6 text-sm text-cream/75">
              <a href={`mailto:${BRAND.contact.email}`} className="font-semibold text-butter hover:underline">
                {BRAND.contact.email}
              </a>
              <br />
              <a href={`tel:${BRAND.contact.phone.replace(/\s+/g, "")}`} className="hover:underline">
                {BRAND.contact.phone}
              </a>
              <br />
              <a href={`https://wa.me/${BRAND.contact.whatsapp.replace(/\D/g, "")}`} className="hover:underline">
                WhatsApp {BRAND.contact.whatsapp}
              </a>
            </p>
            <p className="mt-4 max-w-sm text-xs text-cream/60">
              {BRAND.legal.entityName}
              <br />
              {BRAND.legal.registeredAddress}
            </p>
          </div>
          <div className="grid gap-10 sm:grid-cols-3">
            {COLUMNS.map((c) => (
              <nav key={c.title} aria-label={c.title}>
                <h2 className="font-chunky text-lg font-bold text-butter">{c.title}</h2>
                <ul className="mt-4 space-y-2.5">
                  {c.links.map((l) => (
                    <li key={l.label}>
                      {l.href === "/contact" ? (
                        <ListSalonLink className="text-sm text-cream/80 transition hover:text-butter">{l.label}</ListSalonLink>
                      ) : (
                        <Link href={l.href} className="text-sm text-cream/80 transition hover:text-butter">
                          {l.label}
                        </Link>
                      )}
                    </li>
                  ))}
                  {c.title === "Legal" && (
                    <li>
                      <CookiePreferencesButton className="text-sm text-cream/80 transition hover:text-butter" />
                    </li>
                  )}
                </ul>
              </nav>
            ))}
          </div>
        </div>
        <div className="mt-16 flex flex-col gap-2 border-t border-cream/15 py-6 text-xs text-cream/55 sm:flex-row sm:justify-between">
          <span>
            &copy; {new Date().getFullYear()} Priinteve Innovations LLP. All rights reserved.
          </span>
          <span>Made for salons with personality.</span>
        </div>
      </div>
      <p
        aria-hidden="true"
        className="select-none whitespace-nowrap px-4 pb-[2vw] text-center font-chunky text-[17vw] font-extrabold leading-[0.9] tracking-tighter text-plum-soft"
      >
        {BRAND.name.toLowerCase()}
      </p>
    </footer>
  );
}
