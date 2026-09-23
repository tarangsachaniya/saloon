"use client";

import Link from "next/link";
import { useState } from "react";

interface NavbarProps {
  salonName?: string;
  phone?: string | null;
}

export function Navbar({ salonName = "Classic Cuts Barbershop", phone }: NavbarProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <header className="sticky top-0 z-50 w-full border-b border-white/10 bg-[#03202c]/95 backdrop-blur-md shadow-lg shadow-black/15 transition-all">
      <div className="mx-auto flex h-20 w-full max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand Emblem & Name */}
        <Link
          href="/"
          className="group flex items-center gap-3.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-amber-400 shrink-0"
        >
          <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-400/25 via-amber-500/15 to-transparent border border-amber-400/40 shadow-inner transition-transform group-hover:scale-105">
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
            <span className="font-heading text-lg font-black tracking-tight text-white sm:text-xl leading-tight">
              {salonName}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.22em] text-amber-400">
              Master Barbershop
            </span>
          </div>
        </Link>

        {/* Desktop Navigation Links */}
        <nav className="hidden items-center gap-1 xl:gap-2 lg:flex" aria-label="Main Navigation">
          <Link
            href="/#services"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-amber-300 whitespace-nowrap"
          >
            Services
          </Link>
          <Link
            href="/#barbers"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-amber-300 whitespace-nowrap"
          >
            Our Barbers
          </Link>
          <Link
            href="/#why-us"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-amber-300 whitespace-nowrap"
          >
            Why Choose Us
          </Link>
          <Link
            href="/#gallery"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-amber-300 whitespace-nowrap"
          >
            Gallery
          </Link>
          <Link
            href="/#visit-us"
            className="rounded-lg px-3.5 py-2 text-sm font-semibold text-white/80 transition-all hover:bg-white/10 hover:text-amber-300 whitespace-nowrap"
          >
            Hours & Location
          </Link>
        </nav>

        {/* Action Controls */}
        <div className="hidden items-center gap-3 lg:gap-4 md:flex shrink-0">
          {phone && (
            <a
              href={`tel:${phone.replace(/\s+/g, "")}`}
              className="hidden xl:inline-flex items-center gap-2 rounded-xl bg-white/5 px-3 py-2 text-xs font-semibold text-white/85 ring-1 ring-white/10 transition-colors hover:bg-white/10 hover:text-white whitespace-nowrap"
              title="Call barbershop"
            >
              <div className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-400/20 text-amber-400">
                <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                </svg>
              </div>
              <span>{phone}</span>
            </a>
          )}


          <Link
            href="/book"
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 via-amber-600 to-amber-700 px-5 py-2.5 text-sm font-extrabold text-white shadow-lg shadow-amber-950/40 transition-all duration-200 hover:brightness-110 hover:shadow-amber-500/25 active:scale-95 whitespace-nowrap"
          >
            <span>Book Appointment</span>
            <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
            </svg>
          </Link>
        </div>

        {/* Mobile menu trigger */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Close menu" : "Open menu"}
          className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/15 bg-white/5 text-white hover:bg-white/10 lg:hidden"
        >
          {isOpen ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </div>

      {/* Mobile Drawer */}
      {isOpen && (
        <div className="border-t border-white/10 bg-[#03202c]/98 px-5 py-6 backdrop-blur-2xl lg:hidden">
          <nav className="flex flex-col gap-3 text-base font-semibold text-white/90">
            <Link
              href="/#services"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10 hover:text-amber-300 transition-colors"
            >
              <span>Services & Pricing</span>
              <span className="text-white/40 text-sm">→</span>
            </Link>
            <Link
              href="/#barbers"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10 hover:text-amber-300 transition-colors"
            >
              <span>Our Master Barbers</span>
              <span className="text-white/40 text-sm">→</span>
            </Link>
            <Link
              href="/#why-us"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10 hover:text-amber-300 transition-colors"
            >
              <span>Why Choose Us</span>
              <span className="text-white/40 text-sm">→</span>
            </Link>
            <Link
              href="/#gallery"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10 hover:text-amber-300 transition-colors"
            >
              <span>Photo Gallery</span>
              <span className="text-white/40 text-sm">→</span>
            </Link>
            <Link
              href="/#visit-us"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-white/10 hover:text-amber-300 transition-colors"
            >
              <span>Hours & Location</span>
              <span className="text-white/40 text-sm">→</span>
            </Link>

          </nav>

          <div className="mt-6 pt-5 border-t border-white/10 flex flex-col gap-3">
            {phone && (
              <a
                href={`tel:${phone.replace(/\s+/g, "")}`}
                className="flex items-center justify-center gap-2 rounded-xl bg-white/5 py-2.5 text-sm font-semibold text-white/80 ring-1 ring-white/10"
              >
                <span>Call Shop: {phone}</span>
              </a>
            )}
            <Link
              href="/book"
              onClick={() => setIsOpen(false)}
              className="flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 py-3 text-base font-bold text-white shadow-lg shadow-amber-900/40"
            >
              <span>Book Appointment Now</span>
              <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
              </svg>
            </Link>
          </div>
        </div>
      )}
    </header>
  );
}

