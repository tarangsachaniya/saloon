import type { MetadataRoute } from "next";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000").replace(/\/$/, "");

const ROUTES = [
  { path: "", priority: 1 },
  { path: "/salons", priority: 0.8 },
  { path: "/contact", priority: 0.6 },
  { path: "/legal/terms", priority: 0.3 },
  { path: "/legal/privacy", priority: 0.3 },
  { path: "/legal/cookies", priority: 0.3 },
  { path: "/legal/refund-cancellation", priority: 0.3 },
  { path: "/legal/data-consent", priority: 0.3 },
  { path: "/legal/grievance", priority: 0.3 },
];

export default function sitemap(): MetadataRoute.Sitemap {
  return ROUTES.map((r) => ({ url: `${BASE}${r.path}`, priority: r.priority }));
}
