"use client";

import Link from "next/link";
import { useEffect, useId, useRef, useState, useSyncExternalStore, type KeyboardEvent } from "react";

import { popButton } from "@/components/marketing/pop/ui";
import {
  acceptAll,
  closePreferences,
  getConsentServerSnapshot,
  getConsentSnapshot,
  openPreferences,
  rejectNonEssential,
  saveConsent,
  subscribeConsent,
  type CookieConsent as Consent,
} from "@/lib/consent/consent";

/**
 * Cookie banner + Cookie Preferences modal. Mounted once in the root layout.
 * Purely a consent UI: it never touches the authentication/session cookies.
 */
export function CookieConsent() {
  const { ready, consent, prefsOpen } = useSyncExternalStore(
    subscribeConsent,
    getConsentSnapshot,
    getConsentServerSnapshot,
  );

  if (!ready) return null;
  return (
    <>
      {!consent && !prefsOpen && <Banner />}
      {prefsOpen && <PreferencesModal consent={consent} />}
    </>
  );
}

function Banner() {
  const titleId = useId();
  return (
    <section
      role="region"
      aria-labelledby={titleId}
      className="fixed inset-x-0 bottom-0 z-[120] px-3 pb-3 sm:px-5 sm:pb-5"
    >
      <div className="mx-auto max-h-[85dvh] w-full max-w-3xl overflow-y-auto rounded-[1.75rem] border-[3px] border-plum bg-cream p-5 text-plum shadow-[6px_6px_0_0_#3b1a3f] sm:p-6">
        <h2 id={titleId} className="font-chunky text-xl font-extrabold sm:text-2xl">
          We use cookies <span aria-hidden="true">🍪</span>
        </h2>
        <p className="mt-2 text-sm font-medium leading-relaxed text-plum/85 sm:text-base">
          We use essential cookies to keep Salonly secure and working properly. With your permission, we may also use
          optional cookies for analytics and other features. Read our{" "}
          <Link href="/legal/cookies" className="font-bold underline underline-offset-2">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:justify-end">
          <button type="button" onClick={openPreferences} className={popButton("white", "md")}>
            Cookie Settings
          </button>
          <button type="button" onClick={rejectNonEssential} className={popButton("butter", "md")}>
            Reject Non-Essential
          </button>
          <button type="button" onClick={acceptAll} className={popButton("plum", "md")}>
            Accept All
          </button>
        </div>
      </div>
    </section>
  );
}

function PreferencesModal({ consent }: { consent: Consent | null }) {
  const titleId = useId();
  const dialogRef = useRef<HTMLDivElement>(null);
  const [analytics, setAnalytics] = useState(consent?.analytics ?? false);
  const [marketing, setMarketing] = useState(consent?.marketing ?? false);

  // Move focus into the dialog, and give it back to whatever opened it on close.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    return () => opener?.focus?.();
  }, []);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === "Escape") {
      event.stopPropagation();
      closePreferences();
      return;
    }
    if (event.key !== "Tab") return;
    const focusable = dialogRef.current?.querySelectorAll<HTMLElement>(
      'button:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])',
    );
    if (!focusable || focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  return (
    <div
      className="fixed inset-0 z-[130] flex items-end justify-center bg-plum/60 p-3 sm:items-center sm:p-5"
      onMouseDown={(event) => event.target === event.currentTarget && closePreferences()}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        onKeyDown={onKeyDown}
        className="max-h-[90dvh] w-full max-w-lg overflow-y-auto rounded-[1.75rem] border-[3px] border-plum bg-cream p-5 text-plum shadow-[6px_6px_0_0_#3b1a3f] outline-none sm:p-7"
      >
        <div className="flex items-start justify-between gap-4">
          <h2 id={titleId} className="font-chunky text-2xl font-extrabold">
            Cookie Preferences
          </h2>
          <button
            type="button"
            onClick={closePreferences}
            aria-label="Close cookie preferences"
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border-2 border-plum bg-white text-lg font-bold"
          >
            <span aria-hidden="true">×</span>
          </button>
        </div>

        <div className="mt-5 space-y-4">
          <Category
            title="Essential Cookies"
            description="Required for authentication, security, booking and core website functionality. These can't be turned off."
            status={<span className="rounded-full border-2 border-plum bg-mint px-3 py-1 text-xs font-bold">Always Active</span>}
          />
          <Category
            title="Analytics Cookies"
            description="Help us understand how visitors use the website. Salonly doesn't currently run any analytics."
            status={<Toggle label="Analytics cookies" checked={analytics} onChange={setAnalytics} />}
          />
          <Category
            title="Marketing Cookies"
            description="Used for marketing and advertising purposes. Salonly doesn't currently run any marketing tools."
            status={<Toggle label="Marketing cookies" checked={marketing} onChange={setMarketing} />}
          />
        </div>

        <p className="mt-5 text-sm font-medium text-plum/80">
          Learn more in our{" "}
          <Link href="/legal/cookies" onClick={closePreferences} className="font-bold underline underline-offset-2">
            Cookie Policy
          </Link>
          .
        </p>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:justify-end">
          <button type="button" onClick={closePreferences} className={popButton("white", "md")}>
            Cancel
          </button>
          <button type="button" onClick={() => saveConsent({ analytics, marketing })} className={popButton("plum", "md")}>
            Save Preferences
          </button>
        </div>
      </div>
    </div>
  );
}

function Category({
  title,
  description,
  status,
}: {
  title: string;
  description: string;
  status: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border-2 border-plum bg-white p-4">
      <div className="flex items-center justify-between gap-4">
        <h3 className="font-chunky text-lg font-bold">{title}</h3>
        {status}
      </div>
      <p className="mt-1.5 text-sm font-medium leading-relaxed text-plum/80">{description}</p>
    </div>
  );
}

function Toggle({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-8 w-14 shrink-0 items-center rounded-full border-2 border-plum transition-colors focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-plum ${
        checked ? "bg-mint" : "bg-white"
      }`}
    >
      <span
        aria-hidden="true"
        className={`absolute top-1/2 h-5 w-5 -translate-y-1/2 rounded-full bg-plum transition-all ${checked ? "left-8" : "left-1"}`}
      />
      <span className="sr-only">{checked ? "On" : "Off"}</span>
    </button>
  );
}
