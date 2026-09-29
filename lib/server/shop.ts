import "server-only";

import type { Salon } from "@prisma/client";

import { directionsUrl, osmEmbedUrl, osmViewUrl, pointFromMapUrl } from "@/lib/geo";

import { toDateString, weekdayOf } from "./availability";
import { listActiveBarbersView } from "./barbers";
import { getRatingSummaries, getRecentReviews } from "./reviews";
import { listActiveServicesView } from "./services";
import { getSalonSettingsView } from "./settings";

/** Everything the public shop page renders, loaded in parallel. */
export async function getShopData(salon: Salon) {
  const [settings, services, barbers, ratings, reviews] = await Promise.all([
    getSalonSettingsView(salon.id).catch(() => null),
    listActiveServicesView(salon.id).catch(() => []),
    listActiveBarbersView(salon.id).catch(() => []),
    getRatingSummaries([salon.id]).catch(() => new Map()),
    getRecentReviews({ salonId: salon.id, take: 6 }).catch(() => []),
  ]);

  // Group services by category, keeping the catalogue order within each group.
  const groups = new Map<string, typeof services>();
  for (const s of services) {
    const key = s.category?.trim() || "Services";
    groups.set(key, [...(groups.get(key) ?? []), s]);
  }

  const todayWeekday = weekdayOf(toDateString(new Date()));
  const hours = settings?.openingHours ?? [];
  const today = hours.find((h) => h.weekday === todayWeekday) ?? null;

  return {
    settings,
    serviceGroups: [...groups.entries()].map(([category, items]) => ({ category, items })),
    serviceCount: services.length,
    fromPrice: services.length ? Math.min(...services.map((s) => s.price)) : null,
    barbers,
    rating: ratings.get(salon.id) ?? null,
    reviews,
    hours,
    todayWeekday,
    today: today && today.isOpen ? { open: today.openTime, close: today.closeTime } : null,
  };
}

export type ShopData = Awaited<ReturnType<typeof getShopData>>;

/**
 * "Get directions" link: exact directions when the salon has coordinates,
 * otherwise a map search for its name + address.
 */
export function mapLinkFor(salon: Pick<Salon, "mapUrl" | "address" | "name">): string | null {
  const point = pointFromMapUrl(salon.mapUrl);
  if (point) return directionsUrl(point);
  if (!salon.address) return null;
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${salon.name}, ${salon.address}`)}`;
}

/** Full-size OpenStreetMap view of the salon's pin, or null. */
export function mapViewUrlFor(salon: Pick<Salon, "mapUrl">): string | null {
  const point = pointFromMapUrl(salon.mapUrl);
  return point ? osmViewUrl(point) : null;
}

/**
 * OpenStreetMap embed URL for the iframe. ALWAYS rebuilt from the parsed
 * coordinates, never the stored string itself, so a tampered `mapUrl` can
 * never point the iframe at another site.
 */
export function embedUrlFor(salon: Pick<Salon, "mapUrl">): string | null {
  const point = pointFromMapUrl(salon.mapUrl);
  return point ? osmEmbedUrl(point) : null;
}
