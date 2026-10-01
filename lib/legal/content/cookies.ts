import { BRAND } from "@/lib/brand";
import type { LegalDoc } from "@/lib/legal/types";

export const COOKIES: LegalDoc = {
  eyebrow: "Legal",
  title: "Cookie Policy",
  summary: `What cookies and browser storage ${BRAND.name} uses. We use no advertising or tracking cookies.`,
  sections: [
    {
      id: "what",
      title: "What are cookies",
      body: [
        "Cookies are small text files a website stores on your device. Browser storage (such as localStorage) works similarly. They help a site remember who you are between pages.",
      ],
    },
    {
      id: "what-we-use",
      title: "What we use",
      body: [
        "We use only strictly necessary storage, and only for people who sign in to a salon owner, staff or admin account:",
        {
          list: [
            "sbs_admin_token (cookie, first-party, up to 7 days): keeps you signed in to the dashboard. Without it you could not use your account.",
            "user (browser localStorage): caches your name and role so the dashboard loads quickly.",
          ],
        },
        "Customers who simply browse salons or book an appointment are not given sign-in cookies.",
      ],
    },
    {
      id: "none",
      title: "What we do not use",
      body: [
        "We do not currently use analytics, advertising, social-media or other tracking cookies, and we do not use third-party tracking scripts. Fonts are served from our own domain.",
        "Because only essential storage is used, no cookie banner is shown. If we add analytics or any non-essential cookies in future, we will ask for your consent first and update this page.",
      ],
    },
    {
      id: "control",
      title: "Your choices",
      body: [
        "You can delete or block cookies in your browser settings. Blocking the sign-in cookie will stop you from using the dashboard. Signing out removes both items listed above.",
      ],
    },
    {
      id: "contact",
      title: "Questions",
      body: [`Email ${BRAND.contact.email} or see our Privacy Policy for how we handle personal data.`],
    },
  ],
};
