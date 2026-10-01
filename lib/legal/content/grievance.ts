import { BRAND } from "@/lib/brand";
import type { LegalDoc } from "@/lib/legal/types";

const G = BRAND.grievanceOfficer;

export const GRIEVANCE: LegalDoc = {
  eyebrow: "Legal",
  title: "Grievance Officer",
  summary: `How to raise a complaint about ${BRAND.name}, a salon listing, content or your personal data, as required by the IT Rules, 2021 and the DPDP Act, 2023.`,
  sections: [
    {
      id: "officer",
      title: "Grievance Officer",
      body: [
        {
          list: [
            `Name: ${G.name}`,
            `Designation: ${G.designation}`,
            `Email: ${G.email}`,
            `Phone: ${G.phone} (${G.hours})`,
            `Address: ${BRAND.legal.entityName}, ${BRAND.legal.registeredAddress}`,
          ],
        },
      ],
    },
    {
      id: "what-to-report",
      title: "What you can raise",
      body: [
        {
          list: [
            "a booking, salon or service problem that the salon has not resolved;",
            "content on the platform that is unlawful, infringing, false or abusive (including a review or listing);",
            "a privacy concern: access, correction or erasure of your data, withdrawing consent, or a suspected data breach;",
            "any other complaint about how the platform operates.",
          ],
        },
      ],
    },
    {
      id: "how",
      title: "How to complain",
      body: [
        `Email ${G.email} with your name, contact details, the salon or page concerned, a clear description and any screenshots or reference numbers. Complaints from a person whose own content or image is misused may be made on their behalf by an authorised representative.`,
      ],
    },
    {
      id: "timelines",
      title: "Our timelines",
      body: [
        {
          list: [
            "We acknowledge your complaint within 24 hours.",
            "We resolve it within 15 days of receipt.",
            "Content that exposes a person's private areas, shows nudity or sexual acts, or is impersonation (including morphed images) is removed within 24 hours of a complaint, as the IT Rules require.",
            "Requests to exercise data rights are answered within the time the DPDP Rules prescribe.",
          ],
        },
      ],
    },
    {
      id: "escalation",
      title: "If you are not satisfied",
      body: [
        "You may approach the Data Protection Board of India for data-protection complaints (after using this process first), the National Consumer Helpline (1915 or consumerhelpline.gov.in) or the appropriate Consumer Commission for consumer disputes, and a Grievance Appellate Committee as permitted under the IT Rules for content decisions.",
        "Complaints of cybercrime can also be reported at cybercrime.gov.in or on 1930.",
      ],
    },
  ],
};
