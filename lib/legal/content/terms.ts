import { BRAND } from "@/lib/brand";
import type { LegalDoc } from "@/lib/legal/types";

const L = BRAND.legal;

export const TERMS: LegalDoc = {
  eyebrow: "Legal",
  title: "Terms & Conditions",
  summary: `The rules for using ${BRAND.name}, as a customer booking a salon or as a salon using the platform. Governed by Indian law.`,
  sections: [
    {
      id: "acceptance",
      title: "Agreement",
      body: [
        `These Terms form a legally binding agreement under the Indian Contract Act, 1872 between you and ${L.entityName} ("${BRAND.name}", "we"). By using the website or booking an appointment you accept them. This is an electronic record under the Information Technology Act, 2000 and needs no signature. If you do not agree, please do not use the platform.`,
        "You must be 18 or older, and capable of entering a contract, to use the platform. Anyone younger may only use it through a parent or guardian.",
      ],
    },
    {
      id: "our-role",
      title: "Our role: an intermediary",
      body: [
        `${BRAND.name} is a technology platform and an "intermediary" under the IT Act. Salons independently provide beauty, grooming and wellness services. The contract for a service is between you and the salon; we are not the seller of those services and do not control their quality, safety, pricing or availability.`,
        "We show salon information as supplied by the salon and take reasonable care to keep the platform running, but we do not guarantee that a listing is complete or that a slot will always be available.",
      ],
    },
    {
      id: "bookings",
      title: "Bookings",
      body: [
        {
          list: [
            "A booking is a request for a slot that is confirmed on the screen and, where enabled, by message.",
            "Provide accurate name and mobile details; the salon may use them to contact you about your appointment.",
            "Prices, durations and staff shown are set by the salon and may change before you book. Prices are in Indian rupees (INR) and include or exclude GST as the salon states.",
            "Payment for services is made directly to the salon unless the platform clearly offers online payment for a booking.",
            "Cancellations and rescheduling are governed by the salon's own policy and by our Cancellations & Refunds page.",
          ],
        },
      ],
    },
    {
      id: "accounts",
      title: "Salon and staff accounts",
      body: [
        "Accounts are created by us for salons. You are responsible for keeping your password confidential and for all activity under your account. Tell us immediately about any unauthorised use.",
        "Salons are responsible for the accuracy and legality of what they publish (prices, photos, offers, policies), for holding all licences and registrations required to operate (including GST where applicable), and for handling customers' personal data lawfully.",
      ],
    },
    {
      id: "acceptable-use",
      title: "Acceptable use",
      body: [
        "In line with Rule 3(1)(b) of the IT (Intermediary Guidelines and Digital Media Ethics Code) Rules, 2021, you must not post or transmit anything that:",
        {
          list: [
            "is defamatory, obscene, pornographic, invasive of another's privacy, hateful, or promotes violence or discrimination;",
            "infringes any patent, trademark, copyright or other right, or impersonates another person;",
            "is false or misleading, including fake reviews or bookings made in bad faith;",
            "contains software viruses or code meant to disrupt the platform;",
            "threatens the unity, integrity, defence, security or sovereignty of India, or is otherwise unlawful.",
          ],
        },
        "You also must not scrape the platform, attempt to access other salons' data, or interfere with its security. We may remove content and suspend or terminate access that breaches these rules, and may report unlawful activity to the authorities.",
      ],
    },
    {
      id: "reviews",
      title: "Reviews",
      body: [
        "Reviews must reflect a genuine experience. By posting a review you grant the salon and us a non-exclusive, royalty-free licence to display it on the platform. We may remove reviews that break these Terms.",
      ],
    },
    {
      id: "ip",
      title: "Intellectual property",
      body: [
        `The ${BRAND.name} name, logo, design and software belong to us or our licensors. Salons keep ownership of their own logos, photos and text and grant us a licence to display them to operate their shop page. You may not copy or reuse our materials without written permission.`,
      ],
    },
    {
      id: "fees",
      title: "Fees for salons",
      body: [
        "Salons pay platform fees (a monthly fee, a commission, or both) as agreed in writing with us. Fees are in INR, exclusive of GST, which is charged extra at the applicable rate and for which we issue tax invoices. Unpaid amounts may lead to suspension of the account.",
      ],
    },
    {
      id: "liability",
      title: "Disclaimer and limitation of liability",
      body: [
        "The platform is provided on an \"as is\" and \"as available\" basis. To the fullest extent permitted by law, we are not liable for the acts, omissions, services or products of any salon, including injury, allergic reaction, damage or dissatisfaction arising from a service, or for indirect or consequential loss.",
        "Where we are found liable to you, our total liability is limited to the fees you paid us in the 12 months before the claim (and, for customers who paid us nothing, to INR 1,000). Nothing in these Terms excludes liability that cannot be excluded under law, including your rights under the Consumer Protection Act, 2019.",
      ],
    },
    {
      id: "privacy",
      title: "Privacy",
      body: [
        "Our Privacy Policy, Cookie Policy and Data Consent notice explain how we handle personal data, and form part of these Terms.",
      ],
    },
    {
      id: "termination",
      title: "Suspension and termination",
      body: [
        "You may stop using the platform at any time. We may suspend or terminate access, with or without notice, for breach of these Terms, unlawful use, non-payment or if required by law. Sections that by nature should survive (such as liability, IP and governing law) will survive termination.",
      ],
    },
    {
      id: "law",
      title: "Governing law and disputes",
      body: [
        `These Terms are governed by the laws of India. Subject to your rights as a consumer, the courts at ${L.jurisdictionCity}, ${L.jurisdictionState} have exclusive jurisdiction. Please first raise any dispute with our Grievance Officer; we will try to resolve it in good faith. Consumers may also approach the National Consumer Helpline (1915) or the appropriate Consumer Commission.`,
      ],
    },
    {
      id: "changes",
      title: "Changes and contact",
      body: [
        "We may update these Terms; the new version applies from the date shown on this page, and continued use means you accept it.",
        `Questions: ${BRAND.contact.email}, ${BRAND.contact.phone}. Grievances: ${BRAND.grievanceOfficer.email}. Registered office: ${L.registeredAddress}. GSTIN: ${L.gstin}.`,
      ],
    },
  ],
};
