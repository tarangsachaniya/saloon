"use client";

import { MotionConfig } from "framer-motion";
import Lenis from "lenis";
import { useEffect, type ReactNode } from "react";

/** The live Lenis instance, so overlays (the menu) can pause scrolling. */
export const lenisStore: { current: Lenis | null } = { current: null };

/**
 * Marketing-site motion shell.
 *
 *  - `MotionConfig reducedMotion="user"`: every framer-motion transform/opacity
 *    animation below is switched off for people who ask the OS for reduced motion.
 *  - Lenis inertial scrolling, also skipped under reduced motion. In-page anchors
 *    (`/#faq`) are routed through Lenis so they glide instead of jumping.
 */
export function MotionShell({ children }: { children: ReactNode }) {
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const lenis = new Lenis({ lerp: 0.075, wheelMultiplier: 0.95, smoothWheel: true });
    lenisStore.current = lenis;
    let frame = 0;
    const raf = (time: number) => {
      lenis.raf(time);
      frame = requestAnimationFrame(raf);
    };
    frame = requestAnimationFrame(raf);

    const onClick = (event: MouseEvent) => {
      const anchor = (event.target as HTMLElement).closest?.("a[href*='#']") as HTMLAnchorElement | null;
      if (!anchor || anchor.origin !== window.location.origin || anchor.pathname !== window.location.pathname) return;
      const target = anchor.hash && document.querySelector(anchor.hash);
      if (target instanceof HTMLElement) {
        event.preventDefault();
        lenis.scrollTo(target, { offset: -72, duration: 1.4 });
        history.replaceState(null, "", anchor.hash);
      }
    };
    document.addEventListener("click", onClick);

    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("click", onClick);
      lenis.destroy();
      lenisStore.current = null;
    };
  }, []);

  return <MotionConfig reducedMotion="user">{children}</MotionConfig>;
}
