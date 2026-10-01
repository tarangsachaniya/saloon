"use client";

import { motion, useScroll, useTransform } from "framer-motion";
import Image from "next/image";
import Link from "next/link";
import { useRef } from "react";

import { ListSalonLink } from "./ListSalonLink";
import { popButton } from "./ui";

const spring = { type: "spring", stiffness: 260, damping: 18 } as const;

/** A sticker you can pick up and toss; springs back into the hero bounds. */
function Sticker({
  children,
  className,
  bounds,
  delay,
}: {
  children: React.ReactNode;
  className: string;
  bounds: React.RefObject<HTMLDivElement | null>;
  delay: number;
}) {
  return (
    <motion.div
      drag
      dragConstraints={bounds}
      dragElastic={0.35}
      whileDrag={{ scale: 1.12, rotate: 0, cursor: "grabbing" }}
      whileHover={{ scale: 1.06 }}
      initial={{ scale: 0, rotate: -20 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ ...spring, delay }}
      className={`absolute z-20 cursor-grab touch-none select-none ${className}`}
    >
      {children}
    </motion.div>
  );
}

export function Hero({ salonCount }: { salonCount: number }) {
  const section = useRef<HTMLElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({ target: section, offset: ["start start", "end start"] });
  const blobY = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const photoY = useTransform(scrollYProgress, [0, 1], [0, -60]);
  const photoRotate = useTransform(scrollYProgress, [0, 1], [0, -6]);

  return (
    <section ref={section} className="relative overflow-hidden bg-butter pt-28 sm:pt-32">
      <div className="mx-auto grid max-w-7xl items-center gap-12 px-5 pb-20 sm:px-8 lg:grid-cols-[1.1fr_0.9fr] lg:pb-28">
        <div>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.05 }}
            className="inline-flex items-center gap-2 rounded-full border-2 border-plum bg-white px-4 py-1.5 text-sm font-bold text-plum"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-tomato opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-tomato" />
            </span>
            {salonCount > 0
              ? `${salonCount} ${salonCount === 1 ? "salon" : "salons"} taking bookings`
              : "Salon booking, made fun"}
          </motion.p>

          <h1 className="mt-7 font-chunky text-[3.6rem] font-extrabold leading-[0.92] tracking-tight text-plum sm:text-8xl lg:text-[7.2rem]">
            {["Book your", "good hair", "day."].map((line, i) => (
              <span key={line} className="block overflow-hidden pb-1">
                <motion.span
                  className="relative inline-block"
                  initial={{ y: "110%", rotate: 4 }}
                  animate={{ y: "0%", rotate: 0 }}
                  transition={{ type: "spring", stiffness: 140, damping: 16, delay: 0.1 + i * 0.1 }}
                >
                  {line === "good hair" ? (
                    <>
                      <span className="relative z-10">{line}</span>
                      <motion.span
                        aria-hidden="true"
                        className="absolute inset-x-[-0.1em] bottom-[0.08em] -z-0 h-[0.36em] origin-left rounded-full bg-lilac"
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: 1 }}
                        transition={{ duration: 0.6, delay: 0.6, ease: [0.34, 1.56, 0.64, 1] }}
                      />
                    </>
                  ) : (
                    line
                  )}
                </motion.span>
              </span>
            ))}
          </h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.45 }}
            className="mt-7 max-w-md text-lg font-medium text-plum/85"
          >
            Find a salon you&apos;ll love, pick your person, grab a slot. No sign-up, no card, no faff. You just pay at
            the salon.
          </motion.p>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ ...spring, delay: 0.55 }}
            className="mt-9 flex flex-wrap gap-4"
          >
            <Link href="/salons" className={popButton("plum")}>
              Find a salon <span aria-hidden="true">→</span>
            </Link>
            <ListSalonLink className={popButton("white")}>I own a salon</ListSalonLink>
          </motion.div>
        </div>

        {/* Playground: blobs, the photo, and draggable stickers */}
        <div ref={stage} className="relative mx-auto h-[26rem] w-full max-w-md sm:h-[32rem]">
          <motion.div style={{ y: blobY }} className="absolute right-0 top-2 h-64 w-64 rounded-full bg-lilac sm:h-80 sm:w-80" />
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ ...spring, delay: 0.3 }}
            className="absolute bottom-6 left-0 h-36 w-36 rounded-[42%_58%_55%_45%/50%_45%_55%_50%] bg-tomato sm:h-44 sm:w-44"
          />
          <motion.div
            style={{ y: photoY, rotate: photoRotate }}
            initial={{ opacity: 0, scale: 0.85, rotate: 6 }}
            animate={{ opacity: 1, scale: 1, rotate: 0 }}
            transition={{ type: "spring", stiffness: 120, damping: 14, delay: 0.2 }}
            className="absolute inset-6 overflow-hidden border-[3px] border-plum shadow-[8px_8px_0_0_#3b1a3f] [border-radius:58%_42%_50%_50%/45%_55%_45%_55%] sm:inset-8"
          >
            <Image
              src="/images/services/styling.jpg"
              alt="A barber shaping a fresh fade"
              fill
              priority
              sizes="(min-width:1024px) 28rem, 90vw"
              className="object-cover"
            />
          </motion.div>

          <Sticker bounds={stage} delay={0.7} className="-left-2 top-8">
            <span className="block -rotate-6 rounded-full border-2 border-plum bg-white px-4 py-2 text-sm font-extrabold text-plum shadow-[3px_3px_0_0_#3b1a3f]">
              ✦ No sign-up!
            </span>
          </Sticker>
          <Sticker bounds={stage} delay={0.85} className="-right-1 bottom-24">
            <span className="block rotate-3 rounded-2xl border-2 border-plum bg-mint px-4 py-3 text-sm font-extrabold text-plum shadow-[3px_3px_0_0_#3b1a3f]">
              Pay at the salon ✓
            </span>
          </Sticker>
          <Sticker bounds={stage} delay={1} className="bottom-0 right-1/3">
            <span className="flex h-20 w-20 rotate-12 items-center justify-center rounded-full border-2 border-plum bg-butter text-center font-chunky text-xs font-extrabold leading-tight text-plum shadow-[3px_3px_0_0_#3b1a3f]">
              Real
              <br />
              reviews ★
            </span>
          </Sticker>
          <p className="absolute -bottom-8 right-0 text-xs font-semibold text-plum/60">psst… drag the stickers</p>
        </div>
      </div>

      <svg viewBox="0 0 1440 70" overflow="visible" className="-mb-px block w-full" preserveAspectRatio="none" aria-hidden="true">
        <path d="M0 35 C 240 80 480 -10 720 35 S 1200 80 1440 35 V72 H0Z" className="fill-cream" />
      </svg>
    </section>
  );
}
