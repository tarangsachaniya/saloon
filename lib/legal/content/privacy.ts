import { BRAND } from "@/lib/brand";
import type { LegalDoc } from "@/lib/legal/types";

const L = BRAND.legal;

export const PRIVACY: LegalDoc = {
  eyebrow: "Legal",
  title: "Privacy Policy",
  summary: `How ${BRAND.name} collects, uses, stores and protects personal data, in line with the Digital Personal Data Protection Act, 2023, the Information Technology Act, 2000 and the SPDI Rules, 2011.`,
  sections: [
    {
      id: "who-we-are",
      title: "Who we are and our role",
      body: [
        `${BRAND.name} is operated by ${L.entityName}, with its registered office at ${L.registeredAddress} ("we", "us"). We run a platform on which salons publish a shop page and accept appointment bookings.`,
        "Our role depends on whose data it is:",
        {
          list: [
            "Customers who book a salon: the salon you book with decides why your booking details are collected and is the primary Data Fiduciary for them. We operate the platform and process that data on the salon's behalf (as Data Processor), and we also act as a Data Fiduciary for the limited platform-level records described below.",
            "Salon owners, staff and people who enquire about listing a salon: we are the Data Fiduciary for your account and enquiry data.",
          ],
        },
      ],
    },
    {
      id: "data-we-collect",
      title: "Personal data we collect",
      body: [
        {
          list: [
            "Booking details (customers): name, mobile number, optional email address, optional notes, the service, staff member, date and time booked, and the consent you gave (with the date and wording version).",
            "Reviews (customers): the name you enter, your rating and your comment. Reviews are shown publicly on the salon's page.",
            "Enquiries to list a salon: your name, salon name, email, phone, city, message and consent record.",
            "Accounts (salon owners and staff): name, email, phone, a hashed password, and device information used to keep your session secure.",
            "Salon business details entered by the salon: business phone, email, address, social links and map link.",
            "Technical data: a sign-in cookie and a small amount of browser storage for signed-in users (see our Cookie Policy), and standard server logs such as IP address and browser type for security and troubleshooting.",
          ],
        },
        "We do not ask for or store payment card details, Aadhaar, PAN or other government identifiers, and we do not knowingly collect sensitive personal data such as health or financial information.",
      ],
    },
    {
      id: "purposes",
      title: "Why we use your data",
      body: [
        "We use personal data only for specified purposes for which you have given consent or which the law permits:",
        {
          list: [
            "to create, confirm, reschedule and cancel your appointment, and to let the salon serve you;",
            "to contact you about your booking (confirmations, reminders and changes);",
            "to send offers or news from a salon, only if you tick the separate optional marketing box;",
            "to respond to enquiries and set up salon accounts;",
            "to secure the platform, prevent fraud and abuse, and fix errors;",
            "to meet legal obligations, including tax, accounting and responding to lawful requests from authorities.",
          ],
        },
      ],
    },
    {
      id: "consent",
      title: "Consent and withdrawing it",
      body: [
        "We ask for your consent before booking, using a tick-box that is never pre-ticked, with a link to this policy and to the Data Consent notice. Marketing consent is separate and optional; you can book without it.",
        `You can withdraw consent at any time as easily as you gave it, by writing to ${BRAND.grievanceOfficer.email} or contacting the salon. Withdrawal does not affect processing done before it, and we may keep data we are legally required to keep.`,
      ],
    },
    {
      id: "sharing",
      title: "Who we share data with",
      body: [
        "We do not sell personal data. We share it only as needed:",
        {
          list: [
            "with the salon you book with, which sees your booking details;",
            "with service providers who host or run the platform for us, such as our database host (Neon, Postgres, Singapore region) and our application hosting provider, bound by confidentiality and security obligations;",
            "with email or messaging providers, if and when we enable booking notifications;",
            "with courts, regulators or law-enforcement agencies where required by law.",
          ],
        },
        "Because some providers are located or store data outside India, your data may be transferred outside India. We do so only to countries and on terms permitted under the DPDP Act and its Rules.",
      ],
    },
    {
      id: "retention",
      title: "How long we keep data",
      body: [
        "We keep personal data only as long as needed for the purpose it was collected for, and as the law requires.",
        {
          list: [
            "Booking records are kept for the life of the salon's account so the salon can show your history, and are then erased or anonymised, unless the law requires us to keep them longer.",
            "Enquiries that do not lead to a salon account are deleted within 12 months.",
            "Account data is deleted within 90 days of account closure, except records we must retain for tax and legal reasons.",
            "You may ask for earlier erasure at any time (see your rights below).",
          ],
        },
      ],
    },
    {
      id: "security",
      title: "Security",
      body: [
        "We use reasonable security practices and procedures as required by Section 43A of the IT Act and the SPDI Rules: encrypted connections (HTTPS), hashed passwords, tenant separation between salons, and access limited to those who need it. No system is perfectly secure; if a personal data breach occurs we will notify the Data Protection Board of India and affected users as the law requires.",
      ],
    },
    {
      id: "rights",
      title: "Your rights",
      body: [
        "Under the DPDP Act you have the right to:",
        {
          list: [
            "obtain a summary of your personal data and the processing we do;",
            "correct inaccurate or incomplete data, and update it;",
            "have your data erased when it is no longer needed or you withdraw consent;",
            "get your grievance redressed (see below);",
            "nominate another person to exercise these rights if you die or become incapacitated.",
          ],
        },
        `To use any right, email ${BRAND.grievanceOfficer.email}. We may need to verify your identity first, and will respond within a reasonable time, no later than the period set by law.`,
      ],
    },
    {
      id: "children",
      title: "Children",
      body: [
        "Our services are for people aged 18 and over. If a booking is made for a child (under 18), it must be made by a parent or lawful guardian, whose verifiable consent we rely on. We do not track or target children or send them marketing.",
      ],
    },
    {
      id: "grievance",
      title: "Grievances and complaints",
      body: [
        `Contact our Grievance Officer first: ${BRAND.grievanceOfficer.name}, ${BRAND.grievanceOfficer.designation}, ${BRAND.grievanceOfficer.email}, ${BRAND.grievanceOfficer.phone}. We acknowledge complaints within 24 hours and aim to resolve them within 15 days. Full details are on our Grievance Officer page.`,
        "If you are not satisfied, you may complain to the Data Protection Board of India once it is operational and you have first exhausted our grievance process.",
      ],
    },
    {
      id: "changes",
      title: "Changes to this policy",
      body: [
        "We may update this policy. Material changes will be shown on this page with a new date and version, and where required we will ask for your consent again.",
      ],
    },
  ],
};
