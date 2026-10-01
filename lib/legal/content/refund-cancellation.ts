import { BRAND } from "@/lib/brand";
import type { LegalDoc } from "@/lib/legal/types";

export const REFUND_CANCELLATION: LegalDoc = {
  eyebrow: "Legal",
  title: "Cancellations & Refunds",
  summary: `How cancelling, rescheduling and refunds work for bookings made through ${BRAND.name}.`,
  sections: [
    {
      id: "who-decides",
      title: "Who sets the rules",
      body: [
        `Each salon provides its own services and sets its own cancellation, no-show and refund rules. You can read them on the salon's page under "Terms" before you book. ${BRAND.name} only provides the booking platform.`,
      ],
    },
    {
      id: "cancel",
      title: "Cancelling or rescheduling",
      body: [
        {
          list: [
            "Use the link in your booking confirmation, or contact the salon directly, to cancel or change an appointment.",
            "Please give as much notice as you can. A salon may set a minimum notice period, shown in its policy.",
            "A salon may cancel or reschedule if a staff member is unavailable or for reasons outside its control; it should tell you promptly and offer another slot.",
          ],
        },
      ],
    },
    {
      id: "payments",
      title: "Payments",
      body: [
        `At present ${BRAND.name} does not collect payment for services. You pay the salon directly at the salon, so there is nothing to refund through the platform for an unpaid booking.`,
        "If online payment is introduced for a salon, the amount, any advance or cancellation fee, and the refund terms will be shown clearly before you pay.",
      ],
    },
    {
      id: "refunds",
      title: "Refunds and service complaints",
      body: [
        "Refunds for a service you have paid for at the salon are decided under that salon's policy and your rights as a consumer. If a service was defective or not as described, first raise it with the salon.",
        "If an approved refund is paid online, it will be returned to the original payment method within 7 working days of approval, or sooner as the payment provider allows.",
      ],
    },
    {
      id: "escalate",
      title: "If the salon does not resolve it",
      body: [
        `Write to our Grievance Officer at ${BRAND.grievanceOfficer.email}. We will acknowledge within 24 hours, share your complaint with the salon and help seek a resolution within 15 days. You also keep your rights under the Consumer Protection Act, 2019, including the National Consumer Helpline (1915) and the Consumer Commission.`,
      ],
    },
  ],
};
