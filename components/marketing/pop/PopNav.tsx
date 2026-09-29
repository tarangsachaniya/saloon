"use client";

import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { BRAND } from "@/lib/brand";
import { popButton } from "./ui";

const LINKS = [
  { href: "/salons", label: "Salons" },
  { href: "/#how-it-works", label: "How it works" },
  { href: "/#for-salons", label: "For owners" },
  { href: "/#faq", label: "FAQ" },
];

/** Sticky pill navigation. On scroll it tucks into a floating cream capsule. */
export function PopNav() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-5">
      <div
        className={`mx-auto flex max-w-7xl items-center justify-between rounded-full px-4 py-2.5 transition-all duration-300 sm:px-6 ${
          scrolled || open ? "border-2 border-plum bg-cream shadow-[4px_4px_0_0_#3b1a3f]" : "border-2 border-transparent"
        }`}
      >
        <Link href="/" className="font-chunky text-2xl font-extrabold tracking-tight text-plum sm:text-3xl">
          {BRAND.name.toLowerCase()}
          <span className="text-tomato">●</span>
        </Link>

        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className={`rounded-full px-4 py-2 text-sm font-semibold text-plum transition hover:bg-white/80 ${
                pathname === l.href ? "bg-white" : ""
              }`}
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-3 lg:flex">
          <Link href="/login" className="rounded-full px-4 py-2 text-sm font-semibold text-plum hover:bg-white/80">
            Sign in
          </Link>
          <Link href="/contact" className={popButton("tomato", "md")}>
            List your salon
          </Link>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls="pop-menu"
          aria-label={open ? "Close menu" : "Open menu"}
          className="flex h-11 w-11 items-center justify-center rounded-full border-2 border-plum bg-white text-plum lg:hidden"
        >
          <span className="relative block h-3 w-5" aria-hidden="true">
            <span className={`absolute left-0 h-0.5 w-full rounded bg-plum transition ${open ? "top-1/2 rotate-45" : "top-0"}`} />
            <span className={`absolute left-0 h-0.5 w-full rounded bg-plum transition ${open ? "top-1/2 -rotate-45" : "bottom-0"}`} />
          </span>
        </button>
      </div>

      <AnimatePresence>
        {open && (
          <motion.nav
            id="pop-menu"
            aria-label="Mobile"
            initial={{ opacity: 0, y: -12, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 30 }}
            className="mx-auto mt-2 max-w-7xl rounded-[1.75rem] border-2 border-plum bg-cream p-3 shadow-[4px_4px_0_0_#3b1a3f] lg:hidden"
          >
            {[...LINKS, { href: "/login", label: "Sign in" }].map((l) => (
              <Link
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="flex min-h-12 items-center rounded-2xl px-4 font-chunky text-xl font-bold text-plum hover:bg-white"
              >
                {l.label}
              </Link>
            ))}
            <Link href="/contact" onClick={() => setOpen(false)} className={`${popButton("tomato")} mt-2 w-full`}>
              List your salon
            </Link>
          </motion.nav>
        )}
      </AnimatePresence>
    </header>
  );
}
