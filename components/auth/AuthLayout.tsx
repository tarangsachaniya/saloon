"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { BRAND } from "@/lib/brand";

const spring = { type: "spring", stiffness: 260, damping: 20 } as const;

interface AuthLayoutProps {
  /** Small tilted pill above the heading. */
  badge: string;
  /** Heading; wrap the accent word in `<span className="text-tomato">`. */
  title: ReactNode;
  subtitle?: ReactNode;
  /** Brand-panel stickers and closing line (desktop only). */
  panel?: { sticker1: string; sticker2: string; line: ReactNode };
  children: ReactNode;
  /** Links under the form card. */
  footer?: ReactNode;
}

const DEFAULT_PANEL = {
  sticker1: "Welcome ✦",
  sticker2: "Your next appointment, sorted",
  line: (
    <>
      Book your salon, <span className="text-tomato">minus the hassle.</span>
    </>
  ),
};

/**
 * Shared frame for /login, /register, /forgot-password and /reset-password:
 * the playful butter brand panel on the left (lg+) and the form column on the
 * right - the same split the sign-in page always had, now parameterised.
 */
export function AuthLayout({ badge, title, subtitle, panel = DEFAULT_PANEL, children, footer }: AuthLayoutProps) {
  return (
    <main className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <section className="relative hidden overflow-hidden bg-butter lg:flex lg:flex-col lg:justify-between lg:p-12">
        <Link href="/" className="relative z-10 font-chunky text-3xl font-extrabold tracking-tight text-plum">
          {BRAND.name.toLowerCase()}
          <span className="text-tomato">●</span>
        </Link>

        <div className="relative mx-auto h-[26rem] w-full max-w-sm">
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...spring, delay: 0.1 }}
            className="absolute -right-6 top-0 h-64 w-64 rounded-full bg-lilac"
          />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...spring, delay: 0.2 }}
            className="absolute -left-4 bottom-2 h-36 w-36 rounded-[42%_58%_55%_45%/50%_45%_55%_50%] bg-tomato"
          />
          <motion.div
            initial={{ opacity: 0, rotate: 6, scale: 0.9 }}
            animate={{ opacity: 1, rotate: 0, scale: 1 }}
            transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.15 }}
            className="absolute inset-6 overflow-hidden border-[3px] border-plum shadow-[8px_8px_0_0_#3b1a3f] [border-radius:58%_42%_50%_50%/45%_55%_45%_55%]"
          >
            <Image src="/images/services/color.jpg" alt="" fill priority sizes="24rem" className="object-cover object-[50%_60%]" />
          </motion.div>
          <motion.span
            initial={{ scale: 0, rotate: -20 }}
            animate={{ scale: 1, rotate: -6 }}
            transition={{ ...spring, delay: 0.5 }}
            className="absolute -left-6 top-10 rounded-full border-2 border-plum bg-white px-4 py-2 text-sm font-extrabold text-plum shadow-[3px_3px_0_0_#3b1a3f]"
          >
            {panel.sticker1}
          </motion.span>
          <motion.span
            initial={{ scale: 0, rotate: 20 }}
            animate={{ scale: 1, rotate: 4 }}
            transition={{ ...spring, delay: 0.65 }}
            className="absolute -right-4 bottom-20 rounded-2xl border-2 border-plum bg-mint px-4 py-3 text-sm font-extrabold text-plum shadow-[3px_3px_0_0_#3b1a3f]"
          >
            {panel.sticker2}
          </motion.span>
        </div>

        <p className="relative z-10 max-w-sm font-chunky text-3xl font-extrabold leading-tight text-plum">{panel.line}</p>
      </section>

      <section className="flex min-w-0 flex-col px-5 py-8 sm:px-10">
        <div className="flex items-center justify-between">
          <Link href="/" className="font-chunky text-2xl font-extrabold tracking-tight text-plum lg:invisible">
            {BRAND.name.toLowerCase()}
            <span className="text-tomato">●</span>
          </Link>
          <Link
            href="/"
            className="rounded-full px-4 py-2 text-sm font-semibold text-plum hover:bg-white focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-lilac"
          >
            ← Back to site
          </Link>
        </div>

        <div className="flex flex-1 items-center justify-center py-10">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
            className="w-full max-w-md"
          >
            <span className="inline-block -rotate-2 rounded-full border-2 border-plum bg-lilac px-4 py-1 text-sm font-bold text-plum">
              {badge}
            </span>
            <h1 className="mt-4 font-chunky text-4xl font-extrabold leading-[0.95] tracking-tight text-plum min-[400px]:text-5xl sm:text-6xl">
              {title}
            </h1>
            {subtitle && <p className="mt-3 font-medium text-plum/75">{subtitle}</p>}

            {children}

            {footer && (
              <div className="mt-6 space-y-1 text-center text-sm font-medium leading-relaxed text-plum/75">{footer}</div>
            )}
          </motion.div>
        </div>
      </section>
    </main>
  );
}
