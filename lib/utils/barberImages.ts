import { isPreviewableImageSrc } from "./imageSrc";
import type { Barber } from "@/lib/booking/types";

/**
 * Known default portrait mappings for seeded and common barber names.
 * Ensures that even if the database has photo as null, our roster displays
 * handsome, high-definition portraits.
 */
const DEFAULT_BARBER_PORTRAITS: Record<string, string> = {
  rahul: "/images/barbers/barber-rahul.jpg",
  akash: "/images/barbers/barber-akash.jpg",
  jay: "/images/barbers/barber-jay.jpg",
  karan: "/images/barbers/barber-karan.jpg",
};

const FALLBACK_PORTRAITS = [
  "/images/barbers/barber-rahul.jpg",
  "/images/barbers/barber-akash.jpg",
  "/images/barbers/barber-jay.jpg",
  "/images/barbers/barber-karan.jpg",
];

/**
 * Returns a photo URL or local asset path for a barber.
 * Never returns null/empty if the barber has a name — guarantees great visuals.
 */
export function getBarberPhotoUrl(barber: Partial<Barber> | null | undefined): string {
  if (!barber) return FALLBACK_PORTRAITS[0];

  const photo = barber.photo?.trim();
  // A malformed stored value would make next/image throw; fall back to a default portrait instead.
  if (photo && isPreviewableImageSrc(photo)) return photo;

  const nameKey = (barber.name ?? "").toLowerCase().trim();
  for (const [key, path] of Object.entries(DEFAULT_BARBER_PORTRAITS)) {
    if (nameKey.includes(key)) {
      return path;
    }
  }

  // Consistent fallback based on string char code
  const charCode = (barber.name ?? "B").charCodeAt(0) || 0;
  return FALLBACK_PORTRAITS[charCode % FALLBACK_PORTRAITS.length];
}

/**
 * Service image helper matching category or service name to photography.
 */
export function getServiceImageUrl(category?: string | null, serviceName?: string | null): string {
  const cat = (category ?? "").toLowerCase();
  const name = (serviceName ?? "").toLowerCase();

  if (cat.includes("beard") || name.includes("beard")) {
    return "/images/services/beard.jpg";
  }
  if (cat.includes("color") || name.includes("color")) {
    return "/images/services/color.jpg";
  }
  if (cat.includes("skin") || cat.includes("facial") || name.includes("facial")) {
    return "/images/services/facial.jpg";
  }
  if (cat.includes("style") || name.includes("style") || name.includes("wash")) {
    return "/images/services/styling.jpg";
  }
  return "/images/services/haircut.jpg";
}

