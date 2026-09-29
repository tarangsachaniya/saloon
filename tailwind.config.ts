import type { Config } from "tailwindcss";

/**
 * Design tokens ported from the legacy React app (`Frontend/src/index.css` `:root`).
 * The legacy `tailwind.config.js` had zero customisation, so the real branding lived
 * in CSS custom properties. Those values are promoted to first-class Tailwind tokens
 * here so components never need inline hex values.
 */
/**
 * Brand colours resolve through CSS variables (RGB channels, so `/opacity`
 * modifiers keep working). With no variable set they fall back to the original
 * navy/teal, so the dashboard is unchanged; a salon's pages set them from the
 * salon's theme (see `themeStyle` in lib/themes.ts) and every booking component
 * re-skins itself without code changes.
 */
function themed(name: string, fallback: string): string {
  return `rgb(var(--c-${name}, ${fallback}) / <alpha-value>)`;
}

const config: Config = {
  content: [
    "./app/**/*.{ts,tsx,mdx}",
    "./components/**/*.{ts,tsx,mdx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        /** Dark teal/navy — buttons, headers, borders, default body text. */
        primary: {
          DEFAULT: themed("primary-700", "5 59 80"),
          50: themed("primary-50", "238 245 248"),
          100: themed("primary-100", "211 228 236"),
          200: themed("primary-200", "166 201 216"),
          300: themed("primary-300", "111 165 189"),
          400: themed("primary-400", "60 125 156"),
          500: themed("primary-500", "23 107 135"),
          600: themed("primary-600", "13 85 112"),
          700: themed("primary-700", "5 59 80"),
          800: themed("primary-800", "4 47 64"),
          900: themed("primary-900", "3 36 49"),
          foreground: themed("primary-fg", "255 255 255"),
        },
        /** Teal-green accent — hover/active states, success affordances. */
        secondary: {
          DEFAULT: themed("secondary-500", "27 153 139"),
          50: themed("secondary-50", "238 250 248"),
          100: themed("secondary-100", "210 242 238"),
          200: themed("secondary-200", "165 229 221"),
          300: themed("secondary-300", "100 204 197"),
          400: themed("secondary-400", "53 176 165"),
          500: themed("secondary-500", "27 153 139"),
          600: themed("secondary-600", "21 122 111"),
          700: themed("secondary-700", "17 96 84"),
          800: themed("secondary-800", "13 74 67"),
          900: themed("secondary-900", "10 58 52"),
          foreground: themed("secondary-fg", "255 255 255"),
        },
        /** Lighter teal used for soft fills, rings and muted accents. */
        "secondary-light": "#64ccc5",
        /** Alias of `secondary-light`, kept for readability at call sites. */
        "accent-teal": "#64ccc5",
        /** Magenta/plum highlight — the legacy `.gold` heading colour. */
        accent: {
          DEFAULT: "rgba(162, 47, 140, 1)",
          soft: "rgba(162, 47, 140, 0.12)",
          muted: "rgba(162, 47, 140, 0.76)",
          foreground: "#ffffff",
        },
        /** Semantic status colours (appointment states, form feedback). */
        success: "#15803d",
        warning: "#b45309",
        danger: "#b91c1c",
        info: "#1d4ed8",
        /**
         * Marketing-site palette (premium ink + gold on warm ivory). Contrast:
         * `gold` #A16207 on `ivory` = 4.9:1 (AA text); on dark `ink` use `gold-light`.
         */
        ink: {
          DEFAULT: "#0c0a09",
          soft: "#1c1917",
          muted: "#44403c",
        },
        ivory: {
          DEFAULT: "#faf9f6",
          deep: "#f1ede4",
        },
        gold: {
          DEFAULT: "#a16207",
          light: "#d9b45f",
          soft: "#f5ecd6",
        },
        line: "#e7e2d6",
        /** Playful marketing palette. Text on these fills is always `plum` (AA). */
        butter: "#ffe27a",
        lilac: "#c9b8ff",
        plum: { DEFAULT: "#3b1a3f", soft: "#5c3462" },
        tomato: "#ff6b4a",
        mint: "#b8f0d8",
        cream: "#fffaf0",
        /** (legacy editorial tokens, unused by the playful site) */
        paper: {
          DEFAULT: "#efebe3",
          deep: "#e5dfd2",
        },
        signal: "#c43a1f",
        /** Salon shop-page theme tokens (set by `themeStyle`). Prefix `th`, NOT `t`: Tailwind reads `t` as "top" (rounded-t, border-t). No opacity modifiers. */
        th: {
          bg: "var(--t-bg)",
          surface: "var(--t-surface)",
          text: "var(--t-text)",
          muted: "var(--t-muted)",
          border: "var(--t-border)",
          accent: "var(--t-accent)",
          "on-accent": "var(--t-on-accent)",
          band: "var(--t-band)",
          "on-band": "var(--t-on-band)",
        },
        /** Page + surface neutrals. */
        surface: "#ffffff",
        "surface-muted": "#f6f8f9",
        border: "#e2e8f0",
      },
      fontFamily: {
        // Bound to the `next/font/google` Nunito CSS variable in app/layout.tsx.
        sans: ["var(--font-nunito)", "Segoe UI", "Helvetica", "sans-serif"],
        // Marketing site only: bound in app/(marketing)/layout.tsx.
        marketing: ["var(--font-marketing)", "Segoe UI", "Helvetica", "sans-serif"],
        folio: ["var(--font-folio)", "ui-monospace", "SFMono-Regular", "monospace"],
        chunky: ["var(--font-chunky)", "Segoe UI", "sans-serif"],
        "th-display": ["var(--t-font-display)"],
        "th-body": ["var(--t-font-body)"],
      },
      borderRadius: {
        th: "var(--t-radius)",
        "th-lg": "var(--t-radius-lg)",
        card: "0.875rem",
      },
      borderWidth: {
        th: "var(--t-border-w)",
      },
      boxShadow: {
        th: "var(--t-shadow)",
        card: "0 1px 2px rgba(5, 59, 80, 0.06), 0 8px 24px -12px rgba(5, 59, 80, 0.18)",
        "card-hover":
          "0 2px 4px rgba(5, 59, 80, 0.08), 0 16px 32px -16px rgba(5, 59, 80, 0.28)",
      },
      keyframes: {
        wiggle: {
          "0%, 100%": { transform: "rotate(-7deg)" },
          "50%": { transform: "rotate(5deg)" },
        },
        "glow-pulse": {
          "0%, 100%": { opacity: "0.55", transform: "scale(1)" },
          "50%": { opacity: "0.9", transform: "scale(1.08)" },
        },
        marquee: {
          from: { transform: "translateX(0)" },
          to: { transform: "translateX(-50%)" },
        },
        "reveal-up": {
          from: { opacity: "0", transform: "translateY(18px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0)" },
          "50%": { transform: "translateY(-8px)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "translate(-50%, -48%) scale(0.97)" },
          to: { opacity: "1", transform: "translate(-50%, -50%) scale(1)" },
        },
        "slide-down": {
          from: { opacity: "0", transform: "translateY(-4px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        wiggle: "wiggle 3.2s ease-in-out infinite",
        "glow-pulse": "glow-pulse 6s ease-in-out infinite",
        "reveal-up": "reveal-up 700ms cubic-bezier(0.16, 1, 0.3, 1) both",
        "float-slow": "float-slow 7s ease-in-out infinite",
        "fade-in": "fade-in 150ms ease-out",
        "scale-in": "scale-in 150ms ease-out",
        "slide-down": "slide-down 120ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
