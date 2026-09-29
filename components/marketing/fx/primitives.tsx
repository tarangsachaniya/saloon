"use client";

import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
  type MotionValue,
} from "framer-motion";
import { useRef, type CSSProperties, type MouseEvent, type ReactNode } from "react";

/** The house easing: fast out, long settle. Feels expensive. */
export const EASE = [0.16, 1, 0.3, 1] as const;

/** Fade + rise when scrolled into view (once). */
export function FadeUp({
  children,
  delay = 0,
  y = 28,
  className,
  as = "div",
}: {
  children: ReactNode;
  delay?: number;
  y?: number;
  className?: string;
  as?: "div" | "li" | "section" | "article" | "figure";
}) {
  const Tag = motion[as];
  return (
    <Tag
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "0px 0px -8% 0px" }}
      transition={{ duration: 0.9, ease: EASE, delay }}
    >
      {children}
    </Tag>
  );
}

/**
 * Headline that rises line-by-line out of a mask. Pass each visual line as an
 * array item (JSX allowed) so wrapping never breaks the reveal.
 */
export function SplitLines({
  lines,
  className,
  delay = 0,
  stagger = 0.11,
  inView = false,
}: {
  lines: ReactNode[];
  className?: string;
  delay?: number;
  stagger?: number;
  /** Trigger on scroll instead of on mount. */
  inView?: boolean;
}) {
  const trigger = inView
    ? { whileInView: "show" as const, viewport: { once: true, margin: "0px 0px -10% 0px" } }
    : { animate: "show" as const };
  return (
    <motion.span
      className={className}
      initial="hidden"
      {...trigger}
      transition={{ staggerChildren: stagger, delayChildren: delay }}
      style={{ display: "block" }}
    >
      {lines.map((line, i) => (
        <span key={i} className="block overflow-hidden pb-[0.12em] -mb-[0.12em]">
          <motion.span
            className="block will-change-transform"
            variants={{ hidden: { y: "108%" }, show: { y: "0%" } }}
            transition={{ duration: 1.1, ease: EASE }}
          >
            {line}
          </motion.span>
        </span>
      ))}
    </motion.span>
  );
}

/** A button/link wrapper that leans toward the cursor. Off on touch. */
export function Magnetic({
  children,
  strength = 0.28,
  className,
}: {
  children: ReactNode;
  strength?: number;
  className?: string;
}) {
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { stiffness: 220, damping: 16, mass: 0.4 });
  const sy = useSpring(y, { stiffness: 220, damping: 16, mass: 0.4 });

  function onMove(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    x.set((e.clientX - (r.left + r.width / 2)) * strength);
    y.set((e.clientY - (r.top + r.height / 2)) * strength);
  }
  function reset() {
    x.set(0);
    y.set(0);
  }

  return (
    <motion.div
      className={className}
      style={{ x: sx, y: sy, display: "inline-block" }}
      onMouseMove={onMove}
      onMouseLeave={reset}
    >
      {children}
    </motion.div>
  );
}

/** Card with a soft gold light that follows the pointer. */
export function Spotlight({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  function onMove(e: MouseEvent<HTMLDivElement>) {
    const r = e.currentTarget.getBoundingClientRect();
    e.currentTarget.style.setProperty("--mx", `${e.clientX - r.left}px`);
    e.currentTarget.style.setProperty("--my", `${e.clientY - r.top}px`);
  }
  return (
    <div
      onMouseMove={onMove}
      className={`group/spot relative overflow-hidden ${className ?? ""}`}
      style={{ "--mx": "50%", "--my": "0%" } as CSSProperties}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-500 group-hover/spot:opacity-100"
        style={{
          background:
            "radial-gradient(420px circle at var(--mx) var(--my), rgba(217,180,95,0.16), transparent 60%)",
        }}
      />
      <div className="relative h-full">{children}</div>
    </div>
  );
}

function Word({
  word,
  range,
  progress,
}: {
  word: string;
  range: [number, number];
  progress: MotionValue<number>;
}) {
  const opacity = useTransform(progress, range, [0.14, 1]);
  return (
    <motion.span style={{ opacity }} className="mr-[0.28em] inline-block">
      {word}
    </motion.span>
  );
}

/** Scroll-linked statement: each word lights up as you scroll through it. */
export function WordReveal({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const { scrollYProgress } = useScroll({ target: ref, offset: ["start 0.85", "end 0.45"] });
  const words = text.split(" ");
  return (
    <p ref={ref} className={className}>
      {words.map((word, i) => {
        const start = i / words.length;
        return <Word key={i} word={word} range={[start, Math.min(1, start + 1.6 / words.length)]} progress={scrollYProgress} />;
      })}
    </p>
  );
}

/** Endless typographic ticker. Pure CSS animation; paused for reduced motion. */
export function Marquee({
  items,
  className,
  speed = 42,
}: {
  items: string[];
  className?: string;
  /** Seconds per full loop. */
  speed?: number;
}) {
  const row = (
    <ul className="flex shrink-0 items-center" aria-hidden="true">
      {items.map((item, i) => (
        <li key={i} className="flex items-center">
          <span className="px-8 sm:px-12">{item}</span>
          <span className="text-signal">✦</span>
        </li>
      ))}
    </ul>
  );
  return (
    <div className={`flex overflow-hidden ${className ?? ""}`} role="presentation">
      <div
        className="flex shrink-0 motion-safe:animate-[marquee_var(--d)_linear_infinite]"
        style={{ "--d": `${speed}s` } as CSSProperties}
      >
        {row}
        {row}
      </div>
    </div>
  );
}

/** Thin gold reading-progress bar pinned to the top of the viewport. */
export function ScrollProgress() {
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, { stiffness: 140, damping: 28, restDelta: 0.001 });
  return (
    <motion.div
      aria-hidden="true"
      className="fixed inset-x-0 top-0 z-[85] h-[2px] origin-left bg-signal"
      style={{ scaleX }}
    />
  );
}
