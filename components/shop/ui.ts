/**
 * Shared class strings for the themed shop page. Everything goes through the
 * `t-*` tokens (colours, radius, border width, shadow, fonts), so one markup
 * renders all four themes.
 */

export const shopButton =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-th border-th border-th-border bg-th-accent px-7 text-base font-semibold text-th-on-accent shadow-th transition duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-th-accent";

export const shopButtonGhost =
  "inline-flex min-h-12 items-center justify-center gap-2 rounded-th border-th border-current px-7 text-base font-semibold transition duration-200 hover:-translate-y-0.5 focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-th-accent";

export const shopCard = "rounded-th-lg border-th border-th-border bg-th-surface shadow-th";

export const shopHeading = "font-th-display leading-[1] [text-transform:var(--t-case)] [letter-spacing:var(--t-tracking)] [font-weight:var(--t-weight)]";

export const kicker = "text-xs font-semibold uppercase tracking-[0.22em] text-th-accent";

export const FALLBACK_COVER = "/images/salon/interior.jpg";
export const FALLBACK_DETAIL = "/images/salon/tools.jpg";
