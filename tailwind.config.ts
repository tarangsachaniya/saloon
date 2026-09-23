import type { Config } from "tailwindcss";

/**
 * Design tokens ported from the legacy React app (`Frontend/src/index.css` `:root`).
 * The legacy `tailwind.config.js` had zero customisation, so the real branding lived
 * in CSS custom properties. Those values are promoted to first-class Tailwind tokens
 * here so components never need inline hex values.
 */
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
          DEFAULT: "#053b50",
          50: "#eef5f8",
          100: "#d3e4ec",
          200: "#a6c9d8",
          300: "#6fa5bd",
          400: "#3c7d9c",
          500: "#176b87",
          600: "#0d5570",
          700: "#053b50",
          800: "#042f40",
          900: "#032431",
          foreground: "#ffffff",
        },
        /** Teal-green accent — hover/active states, success affordances. */
        secondary: {
          DEFAULT: "#1b998b",
          50: "#eefaf8",
          100: "#d2f2ee",
          200: "#a5e5dd",
          300: "#64ccc5",
          400: "#35b0a5",
          500: "#1b998b",
          600: "#157a6f",
          700: "#116054",
          800: "#0d4a43",
          900: "#0a3a34",
          foreground: "#ffffff",
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
        /** Page + surface neutrals. */
        surface: "#ffffff",
        "surface-muted": "#f6f8f9",
        border: "#e2e8f0",
      },
      fontFamily: {
        // Bound to the `next/font/google` Nunito CSS variable in app/layout.tsx.
        sans: ["var(--font-nunito)", "Segoe UI", "Helvetica", "sans-serif"],
      },
      borderRadius: {
        card: "0.875rem",
      },
      boxShadow: {
        card: "0 1px 2px rgba(5, 59, 80, 0.06), 0 8px 24px -12px rgba(5, 59, 80, 0.18)",
        "card-hover":
          "0 2px 4px rgba(5, 59, 80, 0.08), 0 16px 32px -16px rgba(5, 59, 80, 0.28)",
      },
      keyframes: {
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
        "fade-in": "fade-in 150ms ease-out",
        "scale-in": "scale-in 150ms ease-out",
        "slide-down": "slide-down 120ms ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
