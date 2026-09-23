/** Currency formatting for service prices. */

/**
 * Display currency. The API returns bare numbers with no currency field, so
 * this is the single place to change it.
 *
 * Set to INR in M5: the seeded salon is unambiguously Indian (address
 * "12 MG Road, Bengaluru", +91 phone numbers, prices in the 100–800 range), so
 * the M4 placeholder of EUR rendered a ₹300 haircut as "€300.00" — a 100x
 * misstatement of price to the customer.
 */
export const CURRENCY = "INR";
export const CURRENCY_LOCALE = "en-IN";

/**
 * 300 -> "₹300", 250.5 -> "₹250.50".
 *
 * Accepts a string because the API serialises Prisma `Decimal` columns as JSON
 * strings; `lib/api/normalize.ts` coerces those at the boundary, and this is the
 * belt-and-braces for any shape that slips through (e.g. the trimmed `price` on
 * `Barber.services[]`).
 */
export function formatPrice(amount: number | string): string {
  const value = typeof amount === "number" ? amount : Number(amount);
  if (!Number.isFinite(value)) return "—";
  return new Intl.NumberFormat(CURRENCY_LOCALE, {
    style: "currency",
    currency: CURRENCY,
    // Whole rupees are the norm; only show paise when there are any.
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(value);
}

/** Initials for an avatar fallback: "Jane Doe" -> "JD". */
export function initials(name: string): string {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");
}
