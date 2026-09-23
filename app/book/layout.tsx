import type { Metadata } from "next";
import Link from "next/link";
import { BookingProvider } from "@/lib/booking/BookingContext";

/**
 * Booking-area layout.
 *
 * Mounts `BookingProvider` here rather than in the root layout — same reasoning
 * as `app/admin/layout.tsx` mounting `AuthProvider`: the wizard state has no
 * meaning outside `/book`, and scoping it to this segment keeps it out of the
 * home page's bundle.
 *
 * Because the provider wraps the whole segment, `/book/confirmation` shares the
 * same state as `/book`, so a client-side navigation carries the confirmed
 * appointment across. A hard refresh legitimately clears it (see the design
 * note in `BookingContext.tsx`) and the confirmation page handles that.
 */

export const metadata: Metadata = {
  title: "Book an appointment",
};

export default function BookLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <BookingProvider>
      <div className="flex min-h-dvh flex-col bg-surface-muted">
        <header className="border-b border-slate-200/80 bg-surface shadow-sm">
          <div className="container-page flex items-center justify-between gap-4 py-3.5">
            <Link
              href="/"
              className="inline-flex items-center gap-2.5 rounded-lg text-sm font-bold text-primary transition-colors hover:text-secondary focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary"
            >
              <div className="relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-amber-500/20 to-amber-700/20 border border-amber-500/30">
                <svg
                  className="h-5 w-5 text-amber-600"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <circle cx="6" cy="6" r="3" />
                  <circle cx="6" cy="18" r="3" />
                  <line x1="20" y1="4" x2="8.12" y2="15.88" />
                  <line x1="14.47" y1="14.48" x2="20" y2="20" />
                  <line x1="8.12" y1="8.12" x2="12" y2="12" />
                </svg>
              </div>
              <div className="flex flex-col text-left">
                <span className="text-base font-extrabold text-primary leading-tight">
                  Classic Cuts
                </span>
                <span className="text-[9px] font-bold uppercase tracking-wider text-amber-600">
                  Master Barbershop
                </span>
              </div>
            </Link>
            
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline-block text-xs font-bold uppercase tracking-wider text-slate-400">
                Live Appointment Desk
              </span>
              <Link
                href="/"
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50 transition-colors"
              >
                ← Return to Home
              </Link>
            </div>
          </div>
        </header>

        <main className="container-page w-full flex-1 py-5 sm:py-8">
          {children}
        </main>
      </div>
    </BookingProvider>
  );
}
