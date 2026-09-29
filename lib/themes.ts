/**
 * Shop-page themes. A salon's public page and booking flow are ONE component
 * tree; a theme only swaps design tokens (colours, fonts, radius, shadow style)
 * and a couple of layout variants. The salon's own `accentColor` then tints it.
 *
 * Safe to import on server and client (pure data + helpers).
 */

export const THEME_IDS = ["SPA", "CUT", "PLAYFUL", "LUXE"] as const;
export type ThemeId = (typeof THEME_IDS)[number];

export interface ThemeDefinition {
  id: ThemeId;
  name: string;
  /** Who it suits: shown in the pickers. */
  bestFor: string;
  description: string;
  /** Preview swatches: background, surface, text, default accent. */
  swatch: [string, string, string, string];
  /** Default accent when the salon has not chosen one. */
  defaultAccent: string;
}

export const THEMES: Record<ThemeId, ThemeDefinition> = {
  SPA: {
    id: "SPA",
    name: "Soft Spa",
    bestFor: "Beauty, skin, bridal & unisex salons",
    description: "Cream and sage with arched photos and gentle motion.",
    swatch: ["#f7f1ea", "#ffffff", "#3d2f2a", "#7d8f7a"],
    defaultAccent: "#7d8f7a",
  },
  CUT: {
    id: "CUT",
    name: "The Cut",
    bestFor: "Barbershops",
    description: "Monochrome, condensed type and sharp diagonal cuts.",
    swatch: ["#0b0b0b", "#f2f1ee", "#f2f1ee", "#b8733f"],
    defaultAccent: "#b8733f",
  },
  PLAYFUL: {
    id: "PLAYFUL",
    name: "Playful",
    bestFor: "Nail bars & trendy, young salons",
    description: "Bright colour blocks, chunky type and sticker details.",
    swatch: ["#ffe27a", "#fffaf0", "#3b1a3f", "#ff6b4a"],
    defaultAccent: "#ff6b4a",
  },
  LUXE: {
    id: "LUXE",
    name: "Luxe Night",
    bestFor: "High-end salons & men's grooming",
    description: "Dark glass, soft glow and crisp modern type.",
    swatch: ["#07070a", "#16161d", "#f4f4f5", "#8b5cf6"],
    defaultAccent: "#8b5cf6",
  },
};

export function isThemeId(value: unknown): value is ThemeId {
  return typeof value === "string" && (THEME_IDS as readonly string[]).includes(value);
}

export const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function channel(hex: string, i: number): number {
  const c = parseInt(hex.slice(1 + i * 2, 3 + i * 2), 16) / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

/** WCAG relative luminance of a #rrggbb colour. */
export function luminance(hex: string): number {
  return 0.2126 * channel(hex, 0) + 0.7152 * channel(hex, 1) + 0.0722 * channel(hex, 2);
}

export function contrastRatio(a: string, b: string): number {
  const [hi, lo] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Text colour to put ON the accent (buttons, badges): whichever of near-black or
 * white contrasts more. Any accent a salon picks therefore stays readable.
 */
export function readableOn(accent: string): "#111111" | "#ffffff" {
  return contrastRatio(accent, "#111111") >= contrastRatio(accent, "#ffffff") ? "#111111" : "#ffffff";
}

/** The salon's accent if valid, otherwise the theme default. */
export function resolveAccent(theme: ThemeId, accent: string | null | undefined): string {
  return accent && HEX_COLOR.test(accent) ? accent.toLowerCase() : THEMES[theme].defaultAccent;
}

/* -------------------------------------------------------------------------- */
/* Design tokens                                                              */
/* -------------------------------------------------------------------------- */

export type HeroVariant = "arch" | "cut" | "blob" | "glow";

interface ThemeTokens {
  /** Page background, card surface, main text, secondary text, hairlines. */
  bg: string;
  surface: string;
  text: string;
  muted: string;
  border: string;
  /** A contrasting full-width band (services / hours sections). */
  band: string;
  onBand: string;
  /** Dark text used INSIDE light cards (booking flow). Always dark. */
  ink: string;
  radius: string;
  radiusLg: string;
  /** Shadow; "{accent}" is replaced with the salon's accent colour. */
  shadow: string;
  borderW: string;
  headingCase: "none" | "uppercase";
  tracking: string;
  weight: string;
  /** Font CSS variables (defined in lib/themeFonts.ts). */
  displayFont: string;
  bodyFont: string;
  hero: HeroVariant;
  dark: boolean;
}

export const THEME_TOKENS: Record<ThemeId, ThemeTokens> = {
  SPA: {
    bg: "#f7f1ea",
    surface: "#ffffff",
    text: "#3d2f2a",
    muted: "#76665e",
    border: "#e3d6c8",
    band: "#efe5d8",
    onBand: "#3d2f2a",
    ink: "#3d2f2a",
    radius: "1.25rem",
    radiusLg: "2.5rem",
    shadow: "0 22px 50px -28px rgba(61,47,42,0.35)",
    borderW: "1px",
    headingCase: "none",
    tracking: "-0.01em",
    weight: "400",
    displayFont: "var(--f-dmserif), Georgia, serif",
    bodyFont: "var(--f-dmsans), system-ui, sans-serif",
    hero: "arch",
    dark: false,
  },
  CUT: {
    bg: "#0b0b0b",
    surface: "#161616",
    text: "#f2f1ee",
    muted: "#a3a3a3",
    border: "#2c2c2c",
    band: "#f2f1ee",
    onBand: "#0b0b0b",
    ink: "#111111",
    radius: "0px",
    radiusLg: "0px",
    shadow: "none",
    borderW: "1px",
    headingCase: "uppercase",
    tracking: "0.01em",
    weight: "400",
    displayFont: "var(--f-anton), Impact, sans-serif",
    bodyFont: "var(--f-grotesk), system-ui, sans-serif",
    hero: "cut",
    dark: true,
  },
  PLAYFUL: {
    bg: "#fffaf0",
    surface: "#ffffff",
    text: "#3b1a3f",
    muted: "#6b4a6f",
    border: "#3b1a3f",
    band: "#ffe27a",
    onBand: "#3b1a3f",
    ink: "#3b1a3f",
    radius: "1.5rem",
    radiusLg: "2rem",
    shadow: "6px 6px 0 0 #3b1a3f",
    borderW: "3px",
    headingCase: "none",
    tracking: "-0.02em",
    weight: "800",
    displayFont: "var(--f-bricolage), system-ui, sans-serif",
    bodyFont: "var(--f-dmsans), system-ui, sans-serif",
    hero: "blob",
    dark: false,
  },
  LUXE: {
    bg: "#07070a",
    surface: "#111117",
    text: "#f4f4f5",
    muted: "#a1a1aa",
    border: "rgba(255,255,255,0.1)",
    band: "#0e0e14",
    onBand: "#f4f4f5",
    ink: "#18181b",
    radius: "1rem",
    radiusLg: "1.5rem",
    shadow: "0 30px 90px -35px {accent}",
    borderW: "1px",
    headingCase: "none",
    tracking: "-0.03em",
    weight: "600",
    displayFont: "var(--f-geist), system-ui, sans-serif",
    bodyFont: "var(--f-geist), system-ui, sans-serif",
    hero: "glow",
    dark: true,
  },
};

type RGB = [number, number, number];
const toRgb = (hex: string): RGB => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as RGB;
const toHex = (c: RGB) => `#${c.map((v) => Math.round(v).toString(16).padStart(2, "0")).join("")}`;
const mix = (a: string, b: string, t: number) => {
  const [x, y] = [toRgb(a), toRgb(b)];
  return toHex([0, 1, 2].map((i) => x[i] + (y[i] - x[i]) * t) as RGB);
};
const channels = (hex: string) => toRgb(hex).join(" ");

/** Darken until white text on it reaches `ratio` (keeps the hue). */
export function withWhiteText(hex: string, ratio = 4.5): string {
  let c = hex;
  for (let i = 0; i < 20 && contrastRatio(c, "#ffffff") < ratio; i++) c = mix(c, "#000000", 0.08);
  return c;
}

const TINTS = { 50: 0.93, 100: 0.84, 200: 0.66, 300: 0.46, 400: 0.24 } as const;
const SHADES = { 600: 0.14, 700: 0.28, 800: 0.42, 900: 0.56 } as const;

/** A 50-900 scale around `base`, as `--c-{name}-{n}` RGB channels. */
function scaleVars(name: string, base: string, baseKey: number): Record<string, string> {
  const out: Record<string, string> = {};
  for (const [k, t] of Object.entries(TINTS)) out[`--c-${name}-${k}`] = channels(mix(base, "#ffffff", t));
  out[`--c-${name}-500`] = channels(base);
  for (const [k, t] of Object.entries(SHADES)) out[`--c-${name}-${k}`] = channels(mix(base, "#000000", t));
  // The Tailwind DEFAULT points at `baseKey` (primary: 700, secondary: 500).
  out[`--c-${name}-${baseKey}`] = channels(base);
  out[`--c-${name}-fg`] = "255 255 255";
  return out;
}

/**
 * Every CSS variable a salon's pages need, as a React `style` object: the
 * `--t-*` shop tokens, font bindings, and the `--c-primary-*` /
 * `--c-secondary-*` scales that re-skin the existing booking components.
 */
export function themeStyle(theme: ThemeId, accentColor: string | null | undefined): Record<string, string> {
  const t = THEME_TOKENS[theme];
  const accent = resolveAccent(theme, accentColor);
  // The booking flow puts white text on `secondary`; keep that readable.
  const secondary = withWhiteText(accent);
  return {
    "--t-bg": t.bg,
    "--t-surface": t.surface,
    "--t-text": t.text,
    "--t-muted": t.muted,
    "--t-border": t.border,
    "--t-band": t.band,
    "--t-on-band": t.onBand,
    "--t-accent": accent,
    "--t-on-accent": readableOn(accent),
    "--t-radius": t.radius,
    "--t-radius-lg": t.radiusLg,
    "--t-shadow": t.shadow.replace("{accent}", accent),
    "--t-border-w": t.borderW,
    "--t-case": t.headingCase,
    "--t-tracking": t.tracking,
    "--t-weight": t.weight,
    "--t-font-display": t.displayFont,
    "--t-font-body": t.bodyFont,
    // Tailwind's `font-sans` is `var(--font-nunito)`: point it at the theme body font.
    "--font-nunito": t.bodyFont,
    ...scaleVars("primary", t.ink, 700),
    ...scaleVars("secondary", secondary, 500),
  };
}
