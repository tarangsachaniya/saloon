import { BRAND } from "@/lib/brand";
import type { LegalDoc } from "@/lib/legal/types";

export const DATA_CONSENT: LegalDoc = {
  eyebrow: "Legal",
  title: "Data Consent Notice",
  summary: `What you agree to when you tick the consent box while booking or contacting ${BRAND.name}. Notice under Section 5 and consent under Section 6 of the DPDP Act, 2023.`,
  sections: [
    {
      id: "what-data",
      title: "Personal data we will process",
      body: [
        {
          list: [
            "When booking: your name, mobile number, optional email and notes, and the details of your appointment.",
            "When listing a salon: your name, salon name, email, phone, city and message.",
          ],
        },
      ],
    },
    {
      id: "purpose",
      title: "Purpose",
      body: [
        "Only to make and manage your appointment (or to respond to your enquiry), to contact you about it, and to keep the platform secure. The salon you book with will see your details so it can serve you.",
      ],
    },
    {
      id: "optional-marketing",
      title: "Optional marketing consent",
      body: [
        "A separate, optional box lets you receive offers and news from that salon. It is never pre-ticked and you can still book without it.",
      ],
    },
    {
      id: "your-agreement",
      title: "By ticking the box you confirm that",
      body: [
        {
          list: [
            "the details you give are your own and are correct (or you are a parent or guardian acting for a child);",
            "you have read our Privacy Policy and the salon's terms;",
            "you give free, specific, informed and unambiguous consent to the processing described above.",
          ],
        },
      ],
    },
    {
      id: "withdraw",
      title: "Withdrawing consent and your rights",
      body: [
        `You may withdraw consent at any time, as easily as you gave it, by emailing ${BRAND.grievanceOfficer.email}. You can also ask to access, correct or erase your data, or nominate someone to act for you. Withdrawal may mean we cannot keep or honour your booking, and does not affect processing already done. The record of your consent (date and wording version) is kept as proof.`,
      ],
    },
    {
      id: "complaints",
      title: "Complaints",
      body: [
        `Contact our Grievance Officer (${BRAND.grievanceOfficer.email}). If unresolved, you may complain to the Data Protection Board of India. See the Grievance Officer page for the process and timelines.`,
      ],
    },
  ],
};
