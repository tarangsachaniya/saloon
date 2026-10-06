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
    email: "contact@priinteve.com",
    phone: "+91 96620 70751",
    whatsapp: "+91 99090 70751",
    address: "416, Mukhi ne Khadki, Paldi Gaam, Paldi, Ahmedabad 380007, Gujarat, India",
  },
  /** Statutory grievance contact (DPDP Act / IT Rules): a real person before launch. */
  grievanceEmail: "contact@priinteve.com",
  /**
   * Legal identity shown on the legal pages. Every value in square brackets is a
   * PLACEHOLDER: replace it with the real registered details before launch.
   */
  legal: {
    entityName: "Priinteve Innovations LLP (operating as Salonly)",
    registeredAddress: "416, Mukhi ne Khadki, Paldi Gaam, Paldi, Ahmedabad 380007, Gujarat, India",
    gstin: "[GSTIN]",
    cin: "ADC-7224",
    jurisdictionCity: "Ahmedabad",
    jurisdictionState: "Gujarat",
  },
  grievanceOfficer: {
    name: "[Grievance Officer name]",
    designation: "Grievance Officer",
    email: "contact@priinteve.com",
    phone: "+91 96620 70751",
    hours: "Monday to Saturday, 10:00 to 18:00 IST",
  },
} as const;

export const NAV_LINKS = [
  { href: "/", label: "Cover" },
  { href: "/salons", label: "The Index" },
  { href: "/#chapters", label: "How it works" },
  { href: "/#supplement", label: "For salons" },
  { href: "/#faq", label: "Q & A" },
  { href: "/contact", label: "List your salon" },
] as const;
