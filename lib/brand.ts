/**
 * Platform brand. One place to rename the product; every marketing surface and
 * legal page reads from here. Replace `name` (and the contact details) with the
 * real business identity before launch.
 */
export const BRAND = {
  name: "Salonly",
  tagline: "Where every chair is booked beautifully.",
  description:
    "Salonly gives every salon a beautiful online shop page, effortless booking and a back office that runs itself.",
  /** Public contact channels shown on the marketing site and legal pages. */
  contact: {
    email: "hello@salonly.example",
    phone: "+91 90000 00000",
    address: "Bengaluru, India",
  },
  /** Statutory grievance contact (DPDP Act / IT Rules): a real person before launch. */
  grievanceEmail: "grievance@salonly.example",
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Cover" },
  { href: "/salons", label: "The Index" },
  { href: "/#chapters", label: "How it works" },
  { href: "/#supplement", label: "For salons" },
  { href: "/#faq", label: "Q & A" },
  { href: "/contact", label: "List your salon" },
] as const;
