import Link from "next/link";

import { LEGAL_LAST_UPDATED } from "@/lib/legal/versions";
import type { LegalDoc } from "@/lib/legal/types";

const OTHER_PAGES = [
  { href: "/legal/terms", label: "Terms & Conditions" },
  { href: "/legal/privacy", label: "Privacy Policy" },
  { href: "/legal/cookies", label: "Cookie Policy" },
  { href: "/legal/refund-cancellation", label: "Cancellations & Refunds" },
  { href: "/legal/data-consent", label: "Data Consent" },
  { href: "/legal/grievance", label: "Grievance Officer" },
] as const;

/** Shared shell for every `/legal/*` page: hero, contents list and prose body. */
export function LegalPage({ doc, path }: { doc: LegalDoc; path: string }) {
  return (
    <>
      <section className="bg-butter pb-14 pt-32 sm:pb-16 sm:pt-40">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <span className="inline-block -rotate-2 rounded-full border-2 border-plum bg-white px-4 py-1 text-sm font-bold text-plum">
            {doc.eyebrow}
          </span>
          <h1 className="mt-5 animate-reveal-up font-chunky text-5xl font-extrabold leading-[0.95] tracking-tight text-plum sm:text-7xl">
            {doc.title}
          </h1>
          <p className="mt-6 max-w-2xl text-lg font-medium text-plum/85">{doc.summary}</p>
          <p className="mt-4 text-sm font-semibold text-plum/70">Last updated: {LEGAL_LAST_UPDATED}</p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 sm:py-20 lg:grid-cols-[1fr_16rem]">
        <article className="max-w-3xl">
          {doc.sections.map((s, i) => (
            <section key={s.id} id={s.id} className="scroll-mt-24 pb-10">
              <h2 className="font-chunky text-2xl font-extrabold text-plum sm:text-3xl">
                {i + 1}. {s.title}
              </h2>
              <div className="mt-3 space-y-3 text-base leading-relaxed text-plum/90">
                {s.body.map((b, j) =>
                  typeof b === "string" ? (
                    <p key={j}>{b}</p>
                  ) : (
                    <ul key={j} className="list-disc space-y-1.5 pl-6">
                      {b.list.map((li) => (
                        <li key={li}>{li}</li>
                      ))}
                    </ul>
                  ),
                )}
              </div>
            </section>
          ))}
        </article>

        <aside className="space-y-6 lg:sticky lg:top-28 lg:self-start">
          <nav aria-label="On this page" className="rounded-[1.75rem] border-[3px] border-plum bg-white p-5 shadow-[4px_4px_0_0_#3b1a3f]">
            <p className="font-chunky text-lg font-extrabold text-plum">On this page</p>
            <ol className="mt-2 space-y-1 text-sm font-semibold text-plum">
              {doc.sections.map((s, i) => (
                <li key={s.id}>
                  <a href={`#${s.id}`} className="underline-offset-2 hover:underline">
                    {i + 1}. {s.title}
                  </a>
                </li>
              ))}
            </ol>
          </nav>
          <nav aria-label="Other legal pages" className="rounded-[1.75rem] border-[3px] border-dashed border-plum bg-cream p-5">
            <p className="font-chunky text-lg font-extrabold text-plum">Other policies</p>
            <ul className="mt-2 space-y-1 text-sm font-semibold text-plum">
              {OTHER_PAGES.filter((p) => p.href !== path).map((p) => (
                <li key={p.href}>
                  <Link href={p.href} className="underline underline-offset-2">
                    {p.label}
                  </Link>
                </li>
              ))}
            </ul>
          </nav>
        </aside>
      </section>
    </>
  );
}
