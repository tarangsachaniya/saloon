import Image from "next/image";
import Link from "next/link";

import { FadeUp, Marquee } from "@/components/marketing/fx/primitives";
import { Hero } from "@/components/marketing/pop/Hero";
import { PopFaq } from "@/components/marketing/pop/PopFaq";
import { popButton } from "@/components/marketing/pop/ui";
import { SalonCard } from "@/components/marketing/SalonCard";
import prisma from "@/lib/server/prisma";
import { getRatingSummaries, getRecentReviews } from "@/lib/server/reviews";

/**
 * Marketing homepage (playful direction). Salon counts, ratings and reviews
 * come from the database or are left out; nothing is invented.
 */

export const revalidate = 300;

const CATEGORIES = [
  { label: "Haircuts", img: "/images/services/haircut.jpg", fill: "bg-lilac" },
  { label: "Colour", img: "/images/services/color.jpg", fill: "bg-tomato" },
  { label: "Fades", img: "/images/services/styling.jpg", fill: "bg-mint" },
  { label: "Facials", img: "/images/services/facial.jpg", fill: "bg-butter" },
  { label: "Beard", img: "/images/salon/tools.jpg", fill: "bg-lilac" },
];

const STEPS = [
  { n: "1", t: "Pick a salon", d: "Browse salons, their menus, their team and real reviews.", fill: "bg-lilac", tilt: "-rotate-2" },
  { n: "2", t: "Grab a slot", d: "Choose a service, your stylist (or anyone free) and a time that's genuinely free.", fill: "bg-mint", tilt: "rotate-1" },
  { n: "3", t: "Show up, glow up", d: "No account, no card. Pay at the salon, then leave a review if you like.", fill: "bg-tomato", tilt: "-rotate-1" },
];

const OWNER_FEATURES = [
  { t: "Your own shop page", d: "Menu, team, hours and reviews on one link you can share anywhere.", fill: "bg-lilac" },
  { t: "No double-bookings. Ever.", d: "Live slots per stylist, and the database itself refuses a clash.", fill: "bg-butter" },
  { t: "Team & schedules", d: "Hours, breaks and days off for everyone on your team.", fill: "bg-mint" },
  { t: "Reviews that are real", d: "Only guests with a completed visit can review. Reply or hide.", fill: "bg-tomato" },
  { t: "Privacy sorted", d: "Consent on every booking. Export or delete client data on request.", fill: "bg-mint" },
  { t: "A calm dashboard", d: "Today's diary, clients and services, easy to use one-handed.", fill: "bg-lilac" },
];

const FAQ = [
  {
    q: "How does my salon join?",
    a: "Our team sets every salon up so it's right from day one. Send us a request and we'll create your page, your team and your dashboard, then hand you the keys.",
  },
  { q: "Do guests need an account?", a: "Nope. Just a name and phone number. Nothing to sign up for, no password to forget." },
  { q: "Do guests pay online?", a: "Not right now. Guests pay at the salon as usual; we just handle the booking." },
  {
    q: "What does it cost a salon?",
    a: "Each salon picks a plan at set-up: a fixed monthly fee, or a small commission on completed bookings. Whichever suits you.",
  },
  {
    q: "What about my clients' data?",
    a: "It's your salon's. Stored securely, every guest gives consent when booking, and you can export or delete a client's data on request.",
  },
];

function SectionTitle({ kicker, children, center = false }: { kicker: string; children: React.ReactNode; center?: boolean }) {
  return (
    <FadeUp className={center ? "text-center" : ""}>
      <span className="inline-block -rotate-2 rounded-full border-2 border-plum bg-white px-4 py-1 text-sm font-bold text-plum">
        {kicker}
      </span>
      <h2 className="mt-4 font-chunky text-5xl font-extrabold leading-[0.95] tracking-tight text-plum sm:text-6xl lg:text-7xl">
        {children}
      </h2>
    </FadeUp>
  );
}

export default async function MarketingHome() {
  const [salons, salonCount, reviews] = await Promise.all([
    prisma.salon
      .findMany({
        where: { isActive: true },
        orderBy: { createdAt: "asc" },
        take: 5,
        select: { id: true, slug: true, name: true, tagline: true, address: true, coverUrl: true },
      })
      .catch(() => []),
    prisma.salon.count({ where: { isActive: true } }).catch(() => 0),
    getRecentReviews({ take: 3, minRating: 4 }).catch(() => []),
  ]);
  const ratings = await getRatingSummaries(salons.map((s) => s.id)).catch(() => new Map());

  return (
    <>
      <Hero salonCount={salonCount} />

      {/* What are we doing today? */}
      <section className="mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionTitle kicker="Menu" center>
          What are we doing <span className="text-tomato">today?</span>
        </SectionTitle>
        <div className="mt-14 flex flex-wrap justify-center gap-6 sm:gap-8">
          {CATEGORIES.map((c, i) => (
            <FadeUp key={c.label} delay={i * 0.07}>
              <Link href="/salons" className="group flex flex-col items-center gap-3">
                <span
                  className={`relative block h-32 w-32 overflow-hidden rounded-full border-[3px] border-plum ${c.fill} shadow-[4px_4px_0_0_#3b1a3f] transition duration-300 group-hover:-translate-y-2 group-hover:rotate-6 sm:h-40 sm:w-40`}
                >
                  <Image src={c.img} alt="" fill sizes="10rem" className="object-cover transition duration-500 group-hover:scale-110" />
                </span>
                <span className="rounded-full border-2 border-plum bg-white px-4 py-1 font-chunky text-lg font-bold text-plum transition group-hover:bg-butter">
                  {c.label}
                </span>
              </Link>
            </FadeUp>
          ))}
        </div>
      </section>

      {/* Salons */}
      <section className="bg-lilac/40 py-20 sm:py-28">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="flex flex-wrap items-end justify-between gap-6">
            <SectionTitle kicker="Now booking">
              Salons you&apos;ll <span className="text-tomato">love</span>
            </SectionTitle>
            <FadeUp>
              <Link href="/salons" className={popButton("white", "md")}>
                See all salons →
              </Link>
            </FadeUp>
          </div>
          <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
            {salons.map((salon, i) => (
              <FadeUp key={salon.id} delay={(i % 3) * 0.08}>
                <SalonCard salon={salon} rating={ratings.get(salon.id)} index={i} />
              </FadeUp>
            ))}
            <FadeUp delay={0.16}>
              <Link
                href="/contact"
                className="group flex h-full min-h-72 flex-col items-center justify-center rounded-[2rem] border-[3px] border-dashed border-plum bg-cream p-8 text-center transition hover:bg-butter"
              >
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-plum bg-white text-3xl font-bold text-plum transition group-hover:rotate-90">
                  +
                </span>
                <span className="mt-5 font-chunky text-2xl font-extrabold text-plum">Your salon here?</span>
                <span className="mt-2 text-plum/75">We&apos;ll set it all up for you.</span>
              </Link>
            </FadeUp>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section id="how-it-works" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-20 sm:px-8 sm:py-28">
        <SectionTitle kicker="How it works" center>
          Three steps. <span className="text-tomato">Zero faff.</span>
        </SectionTitle>
        <ol className="relative mt-16 grid gap-8 md:grid-cols-3">
          <svg
            aria-hidden="true"
            className="absolute left-[16%] right-[16%] top-14 hidden h-10 md:block"
            viewBox="0 0 600 40"
            preserveAspectRatio="none"
          >
            <path d="M0 20 Q 75 -10 150 20 T 300 20 T 450 20 T 600 20" fill="none" stroke="#3b1a3f" strokeWidth="3" strokeDasharray="8 10" />
          </svg>
          {STEPS.map((s, i) => (
            <FadeUp as="li" key={s.n} delay={i * 0.12}>
              <div className={`relative h-full rounded-[2rem] border-[3px] border-plum ${s.fill} p-8 shadow-[6px_6px_0_0_#3b1a3f] transition duration-300 hover:rotate-0 hover:scale-[1.03] ${s.tilt}`}>
                <span className="flex h-16 w-16 items-center justify-center rounded-full border-[3px] border-plum bg-white font-chunky text-3xl font-extrabold text-plum">
                  {s.n}
                </span>
                <h3 className="mt-6 font-chunky text-3xl font-extrabold text-plum">{s.t}</h3>
                <p className="mt-2 text-lg font-medium text-plum/85">{s.d}</p>
              </div>
            </FadeUp>
          ))}
        </ol>
      </section>

      {/* Marquee band */}
      <div className="relative z-10 my-6 -rotate-2 border-y-[3px] border-plum bg-plum py-5 font-chunky text-3xl font-extrabold text-butter sm:text-5xl">
        <Marquee items={["No sign-up", "Pay at the salon", "Real reviews", "Pick your stylist", "Never double-booked"]} speed={30} />
      </div>
      <div className="relative -mt-3 rotate-1 border-y-[3px] border-plum bg-mint py-4 font-chunky text-2xl font-extrabold text-plum sm:text-4xl">
        <Marquee items={["Haircuts", "Colour", "Fades", "Facials", "Beards", "Styling", "Nails"]} speed={40} />
      </div>

      {/* For owners */}
      <section id="for-salons" className="scroll-mt-24 mx-auto max-w-7xl px-5 py-24 sm:px-8 sm:py-32">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr] lg:items-start">
          <div className="lg:sticky lg:top-32">
            <SectionTitle kicker="For salon owners">
              Run your salon <span className="text-tomato">happier.</span>
            </SectionTitle>
            <FadeUp delay={0.1}>
              <p className="mt-6 max-w-md text-lg font-medium text-plum/85">
                We set up your page, your team and your dashboard. You choose a plan that suits you: a fixed monthly
                fee, or a small commission on completed bookings.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <span className="rounded-full border-2 border-plum bg-butter px-4 py-2 font-bold text-plum">Monthly plan</span>
                <span className="rounded-full border-2 border-plum bg-white px-4 py-2 font-bold text-plum">or</span>
                <span className="rounded-full border-2 border-plum bg-lilac px-4 py-2 font-bold text-plum">Commission</span>
              </div>
              <Link href="/contact" className={`${popButton("tomato")} mt-10`}>
                List your salon →
              </Link>
            </FadeUp>
          </div>
          <div className="grid gap-6 sm:grid-cols-2">
            {OWNER_FEATURES.map((f, i) => (
              <FadeUp key={f.t} delay={(i % 2) * 0.08} className={i % 2 ? "sm:mt-10" : ""}>
                <div className={`h-full rounded-[2rem] border-[3px] border-plum ${f.fill} p-7 shadow-[5px_5px_0_0_#3b1a3f] transition duration-300 hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#3b1a3f]`}>
                  <span className="font-chunky text-4xl font-extrabold text-plum/30">0{i + 1}</span>
                  <h3 className="mt-2 font-chunky text-2xl font-extrabold leading-tight text-plum">{f.t}</h3>
                  <p className="mt-2 font-medium text-plum/85">{f.d}</p>
                </div>
              </FadeUp>
            ))}
          </div>
        </div>
      </section>

      {/* Real reviews only */}
      {reviews.length > 0 && (
        <section className="bg-butter py-20 sm:py-28">
          <div className="mx-auto max-w-7xl px-5 sm:px-8">
            <SectionTitle kicker="Guest love" center>
              Straight from the <span className="text-tomato">chair</span>
            </SectionTitle>
            <div className="mt-14 grid gap-8 md:grid-cols-3">
              {reviews.map((r, i) => (
                <FadeUp key={r.id} delay={i * 0.1}>
                  <figure className={`h-full rounded-[2rem] border-[3px] border-plum bg-white p-8 shadow-[6px_6px_0_0_#3b1a3f] ${i % 2 ? "rotate-1" : "-rotate-1"}`}>
                    <p className="text-xl text-tomato" aria-label={`${r.rating} out of 5 stars`}>
                      {"★".repeat(r.rating)}
                    </p>
                    <blockquote className="mt-4 font-chunky text-xl font-bold leading-snug text-plum">“{r.comment}”</blockquote>
                    <figcaption className="mt-5 text-sm font-semibold text-plum/70">
                      {r.authorName} ·{" "}
                      <Link href={`/s/${r.salon.slug}`} className="underline underline-offset-2">
                        {r.salon.name}
                      </Link>
                    </figcaption>
                  </figure>
                </FadeUp>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* FAQ */}
      <section id="faq" className="scroll-mt-24 mx-auto max-w-4xl px-5 py-24 sm:px-8 sm:py-32">
        <SectionTitle kicker="FAQ" center>
          Questions? <span className="text-tomato">Answers.</span>
        </SectionTitle>
        <div className="mt-14">
          <PopFaq items={FAQ} />
        </div>
      </section>

      {/* CTA */}
      <section className="px-5 pb-28 sm:px-8">
        <FadeUp>
          <div className="relative mx-auto max-w-5xl overflow-hidden rounded-[2.5rem] border-[3px] border-plum bg-lilac px-8 py-16 text-center shadow-[10px_10px_0_0_#3b1a3f] sm:py-20">
            <span aria-hidden="true" className="absolute -left-10 -top-10 h-40 w-40 rounded-full bg-butter" />
            <span aria-hidden="true" className="absolute -bottom-12 -right-8 h-44 w-44 rounded-[45%_55%_50%_50%] bg-tomato" />
            <div className="relative">
              <h2 className="font-chunky text-5xl font-extrabold leading-[0.95] text-plum sm:text-7xl">
                Own a salon?
                <br />
                Let&apos;s go.
              </h2>
              <p className="mx-auto mt-5 max-w-md text-lg font-medium text-plum/85">
                We set everything up. You just say yes.
              </p>
              <Link href="/contact" className={`${popButton("butter")} mt-9`}>
                List your salon →
              </Link>
            </div>
          </div>
        </FadeUp>
      </section>
    </>
  );
}
