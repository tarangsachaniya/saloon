import type { Metadata } from "next";
import Link from "next/link";

import { CookiePreferencesButton } from "@/components/consent/CookiePreferencesButton";
import { popButton } from "@/components/marketing/pop/ui";
import { BRAND } from "@/lib/brand";
import { COOKIE_CONSENT_VERSION } from "@/lib/consent/consent";

export const metadata: Metadata = {
  title: "Cookie Policy",
  description: `How ${BRAND.name} uses cookies and similar technologies, and how to manage your choices.`,
};

const ESSENTIAL = [
  {
    name: "sbs_admin_token",
    purpose: "Keeps you signed in. It holds your secure sign-in token for this site only.",
    lifetime: "Up to 7 days, or until you log out",
  },
  {
    name: "sbs_oauth / sbs_oauth_link",
    purpose: "Only used while you sign in with Google: protects that sign-in from forgery. Not set otherwise.",
    lifetime: "10 minutes",
  },
  {
    name: "sbs_admin_user (browser storage)",
    purpose: "Remembers your name and account type on this device so the page can greet you without a delay.",
    lifetime: "Until you log out or clear site data",
  },
  {
    name: "salonly_cookie_consent (browser storage)",
    purpose: "Remembers the cookie choices you make here so we don't ask on every visit.",
    lifetime: "Until you clear site data or the policy changes",
  },
];

const h2 = "mt-10 font-chunky text-2xl font-extrabold text-plum sm:text-3xl";
const p = "mt-3 text-base font-medium leading-relaxed text-plum/85";

export default function CookiePolicyPage() {
  return (
    <>
      <section className="bg-butter pb-12 pt-32 sm:pb-16 sm:pt-40">
        <div className="mx-auto max-w-3xl px-5 sm:px-8">
          <span className="inline-block -rotate-2 rounded-full border-2 border-plum bg-white px-4 py-1 text-sm font-bold text-plum">
            Legal
          </span>
          <h1 className="mt-5 font-chunky text-5xl font-extrabold leading-[0.95] tracking-tight text-plum sm:text-7xl">
            Cookie <span className="text-tomato">Policy</span>
          </h1>
          <p className="mt-4 text-sm font-semibold text-plum/75">Version {COOKIE_CONSENT_VERSION}</p>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <h2 className="font-chunky text-2xl font-extrabold text-plum sm:text-3xl">What are cookies?</h2>
        <p className={p}>
          Cookies are small text files a website stores in your browser. Similar technologies, like your browser&apos;s
          local storage, work in the same way. They let a site remember things between pages and visits. We use
          &ldquo;cookies&rdquo; in this policy to mean both.
        </p>

        <h2 className={h2}>Essential cookies</h2>
        <p className={p}>
          These are needed for {BRAND.name} to work: signing in, staying secure, booking and managing appointments. They
          are always active and can&apos;t be switched off here. They are used only for those purposes.
        </p>
        <div className="mt-5 overflow-x-auto rounded-2xl border-2 border-plum bg-white">
          <table className="w-full min-w-[34rem] text-left text-sm">
            <thead className="bg-lilac text-plum">
              <tr>
                <th className="px-4 py-3 font-bold">Name</th>
                <th className="px-4 py-3 font-bold">What it does</th>
                <th className="px-4 py-3 font-bold">How long</th>
              </tr>
            </thead>
            <tbody>
              {ESSENTIAL.map((row) => (
                <tr key={row.name} className="border-t-2 border-plum/15 align-top">
                  <td className="px-4 py-3 font-mono text-xs font-semibold">{row.name}</td>
                  <td className="px-4 py-3 text-plum/85">{row.purpose}</td>
                  <td className="px-4 py-3 text-plum/85">{row.lifetime}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className={p}>
          Salon pages that show a location include an embedded OpenStreetMap map. It loads when you open such a page and
          is run by OpenStreetMap, which may set its own cookies under its own policy.
        </p>

        <h2 className={h2}>Optional cookies</h2>
        <p className={p}>
          Optional cookies are used only if you say yes, and they are off until you do. There are two categories:
        </p>
        <ul className="mt-3 list-disc space-y-2 pl-6 font-medium text-plum/85">
          <li>
            <strong className="text-plum">Analytics</strong> would help us understand how visitors use the site.
          </li>
          <li>
            <strong className="text-plum">Marketing</strong> would be used for marketing and advertising.
          </li>
        </ul>
        <p className={p}>
          <strong className="text-plum">Right now, {BRAND.name} does not use any analytics or marketing cookies.</strong>{" "}
          The categories are there so that, if we ever add such tools, nothing runs without your permission. If that
          happens we will update this policy and ask you again.
        </p>

        <h2 className={h2}>Your choices</h2>
        <p className={p}>
          You can accept all, reject everything optional, or pick categories in Cookie Preferences. You can change your
          mind at any time, and rejecting optional cookies never stops you from browsing, signing in or booking. You can
          also delete cookies in your browser settings, though removing essential ones will sign you out.
        </p>
        <div className="mt-5">
          <CookiePreferencesButton className={popButton("plum", "md")}>Open Cookie Preferences</CookiePreferencesButton>
        </div>

        <h2 className={h2}>More information</h2>
        <p className={p}>
          See how we handle personal data in our{" "}
          <Link href="/legal/privacy" className="font-bold underline underline-offset-2">
            Privacy Policy
          </Link>
          . Questions about cookies? Email{" "}
          <a href={`mailto:${BRAND.contact.email}`} className="font-bold underline underline-offset-2">
            {BRAND.contact.email}
          </a>
          .
        </p>
      </section>
    </>
  );
}
