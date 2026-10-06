import type { Metadata } from "next";

import { ContactForm } from "@/components/marketing/ContactForm";
import { BRAND } from "@/lib/brand";

export const metadata: Metadata = {
  title: "List your salon",
  description: `Tell us about your salon and we'll set up your ${BRAND.name} shop page and dashboard.`,
};

const NEXT = [
  { t: "We say hi", d: "We read your request and reach out to learn about your salon.", fill: "bg-lilac" },
  { t: "We set it up", d: "Your page, team and dashboard, plus a plan that suits you.", fill: "bg-mint" },
  { t: "You take bookings", d: "You get your login and the bookings start rolling in.", fill: "bg-tomato" },
];

export default function ContactPage() {
  return (
    <>
      <section className="bg-butter pb-16 pt-32 sm:pb-20 sm:pt-40">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <span className="inline-block -rotate-2 rounded-full border-2 border-plum bg-white px-4 py-1 text-sm font-bold text-plum">
            For salon owners
          </span>
          <h1 className="mt-5 animate-reveal-up font-chunky text-6xl font-extrabold leading-[0.92] tracking-tight text-plum sm:text-8xl">
            Let&apos;s get you <span className="text-tomato">online!</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg font-medium text-plum/85">
            Every salon is set up by our team, so it&apos;s right from day one. Tell us a little about yours.
          </p>
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-12 px-5 py-16 sm:px-8 sm:py-20 lg:grid-cols-[1.4fr_1fr]">
        <ContactForm />
        <aside className="space-y-5">
          <h2 className="font-chunky text-3xl font-extrabold text-plum">What happens next</h2>
          {NEXT.map((n, i) => (
            <div key={n.t} className={`rounded-[1.75rem] border-[3px] border-plum ${n.fill} p-6 shadow-[4px_4px_0_0_#3b1a3f]`}>
              <p className="font-chunky text-xl font-extrabold text-plum">
                {i + 1}. {n.t}
              </p>
              <p className="mt-1 font-medium text-plum/85">{n.d}</p>
            </div>
          ))}
          <div className="rounded-[1.75rem] border-[3px] border-dashed border-plum bg-white p-6">
            <p className="font-bold text-plum">Rather chat?</p>
            <p className="mt-1">
              <a href={`mailto:${BRAND.contact.email}`} className="font-semibold text-plum underline underline-offset-2">
                {BRAND.contact.email}
              </a>
              <br />
              <a href={`tel:${BRAND.contact.phone.replace(/\s+/g, "")}`} className="font-semibold text-plum underline underline-offset-2">
                {BRAND.contact.phone}
              </a>
              <br />
              <a
                href={`https://wa.me/${BRAND.contact.whatsapp.replace(/\D/g, "")}`}
                className="font-semibold text-plum underline underline-offset-2"
              >
                WhatsApp {BRAND.contact.whatsapp}
              </a>
            </p>
          </div>
        </aside>
      </section>
    </>
  );
}
