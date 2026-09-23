import Image from "next/image";
import Link from "next/link";
import type { SalonSettings } from "@/lib/booking/types";

interface FooterProps {
  settings?: SalonSettings | null;
}

export function Footer({ settings }: FooterProps) {
  const salonName = settings?.name ?? "Classic Cuts Barbershop";

  return (
    <footer className="border-t border-slate-800 bg-[#03202c] text-white">
      <div className="container-page py-14 lg:py-16">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Col 1: Brand */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/25 via-amber-500/15 to-transparent border border-amber-400/40 shadow-inner">
                <svg
                  className="h-6 w-6 text-amber-400 drop-shadow"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="1.8"
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
                <span className="text-lg font-extrabold tracking-tight text-white leading-tight">
                  {salonName}
                </span>
                <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-400">
                  Master Barbershop
                </span>
              </div>
            </div>
            <p className="text-sm leading-relaxed text-slate-400">
              Where traditional craft meets contemporary style. Uncompromising quality haircuts, beard sculpting, and premium grooming since 2018.
            </p>
            <div className="flex items-center gap-3 text-xs text-secondary-light font-semibold">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              Online Appointments Available 24/7
            </div>
          </div>

          {/* Col 2: Quick Links */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary-light">
              Quick Links
            </h4>
            <ul className="mt-4 flex flex-col gap-2.5 text-sm text-slate-300">
              <li>
                <Link href="/book" className="hover:text-white transition-colors">
                  Book Appointment
                </Link>
              </li>
              <li>
                <Link href="/#services" className="hover:text-white transition-colors">
                  Services & Price List
                </Link>
              </li>
              <li>
                <Link href="/#barbers" className="hover:text-white transition-colors">
                  Meet Our Barbers
                </Link>
              </li>
              <li>
                <Link href="/#why-us" className="hover:text-white transition-colors">
                  Why Choose Us
                </Link>
              </li>
              <li>
                <Link href="/#gallery" className="hover:text-white transition-colors">
                  Salon Gallery
                </Link>
              </li>
              <li>
                <Link href="/#visit-us" className="hover:text-white transition-colors">
                  Opening Hours
                </Link>
              </li>
            </ul>
          </div>

          {/* Col 3: Contact Details */}
          <div>
            <h4 className="text-xs font-bold uppercase tracking-wider text-secondary-light">
              Contact & Visit
            </h4>
            <ul className="mt-4 flex flex-col gap-3 text-sm text-slate-300">
              {settings?.address && (
                <li className="flex items-start gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-secondary-light mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>{settings.address}</span>
                </li>
              )}
              {settings?.phone && (
                <li className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-secondary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <a href={`tel:${settings.phone.replace(/\s+/g, "")}`} className="hover:text-white">
                    {settings.phone}
                  </a>
                </li>
              )}
              {settings?.email && (
                <li className="flex items-center gap-2.5">
                  <svg className="h-4 w-4 shrink-0 text-secondary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  <a href={`mailto:${settings.email}`} className="hover:text-white">
                    {settings.email}
                  </a>
                </li>
              )}
            </ul>
          </div>

          {/* Col 4: Staff Portal */}
          <div className="flex flex-col gap-3 rounded-2xl bg-white/5 p-5 ring-1 ring-white/10">
            <h4 className="text-sm font-bold text-white">Staff Management</h4>
            <p className="text-xs leading-relaxed text-slate-400">
              Authorized salon staff and barbers can manage the live diary, roster schedules, and services.
            </p>
            <Link
              href="/admin/login"
              className="mt-1 inline-flex items-center justify-center rounded-lg bg-white/10 px-4 py-2.5 text-xs font-bold text-white hover:bg-white/20 transition-colors"
            >
              Sign in to Staff Portal →
            </Link>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 flex flex-col items-center justify-between gap-4 border-t border-white/10 pt-8 text-xs text-slate-500 sm:flex-row">
          <p>&copy; {new Date().getFullYear()} {salonName}. All rights reserved.</p>
          <div className="flex items-center gap-6">
            <Link href="/admin/login" className="hover:text-slate-400">
              Staff Portal
            </Link>
            <Link href="/book" className="hover:text-slate-400">
              Online Booking
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}

