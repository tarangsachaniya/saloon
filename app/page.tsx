import Image from "next/image";
import Link from "next/link";
import { listActiveBarbersView } from "@/lib/server/barbers";
import { listActiveServicesView } from "@/lib/server/services";
import { getSalonSettingsView } from "@/lib/server/settings";
import type { SalonSettings, Service } from "@/lib/booking/types";
import { Badge, buttonClasses, Card, CardContent } from "@/components/ui";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { formatPrice } from "@/lib/utils/format";
import { formatDuration, formatTime12h, WEEKDAY_LABELS } from "@/lib/utils/time";
import { getBarberPhotoUrl, getServiceImageUrl } from "@/lib/utils/barberImages";

export const revalidate = 300;

const FALLBACK_NAME = "Classic Cuts Barbershop";

const WEEKDAY_ORDER = [1, 2, 3, 4, 5, 6, 0] as const;

const TESTIMONIALS = [
  {
    name: "Arjun Verma",
    role: "Regular Client (3+ yrs)",
    rating: 5,
    text: "Rahul has been cutting my hair for over two years now. The fade is razor-sharp every single time. Booking online takes 30 seconds and there is never any waiting around in the chair.",
  },
  {
    name: "Sameer Joshi",
    role: "Executive Grooming",
    rating: 5,
    text: "Best beard sculpting and grooming experience in town. Jay pays exceptional attention to detail and the hot towel finish is pure luxury. Highly recommended!",
  },
  {
    name: "Devendra Patel",
    role: "Styling & Color",
    rating: 5,
    text: "Akash is a true artist with hair styling and modern cuts. The shop has a great vintage luxury vibe, fantastic hospitality, and meticulous hygiene standards.",
  },
];

const FEATURES = [
  {
    title: "Master Craftsmen",
    description: "Our barbers bring decades of collective scissor and straight-razor mastery, tailoring each cut to your unique face structure.",
    icon: (
      <svg className="h-6 w-6 text-secondary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879a3 3 0 11-4.242-4.242L10.758 4.758a3 3 0 014.242 0l4.242 4.242a3 3 0 010 4.242L14.12 14.12z" />
      </svg>
    ),
  },
  {
    title: "Instant Live Booking",
    description: "Select your favorite barber, pick your exact time slot, and receive instant confirmation with zero phone tag.",
    icon: (
      <svg className="h-6 w-6 text-secondary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
      </svg>
    ),
  },
  {
    title: "Artisanal Products",
    description: "We use only premium pomades, organic beard oils, and soothing botanicals that keep your hair and scalp healthy.",
    icon: (
      <svg className="h-6 w-6 text-secondary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
      </svg>
    ),
  },
  {
    title: "Sterilized & Hygienic",
    description: "Hospital-grade UV sterilization between every single appointment, single-use neck strips, and impeccably clean chairs.",
    icon: (
      <svg className="h-6 w-6 text-secondary-light" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
      </svg>
    ),
  },
];

function OpeningHoursTable({ settings }: { settings: SalonSettings }) {
  const byWeekday = new Map(
    settings.openingHours.map((hour) => [hour.weekday, hour]),
  );

  const todayWeekday = new Date().getDay();

  return (
    <dl className="grid gap-x-8 gap-y-2.5 sm:grid-cols-2">
      {WEEKDAY_ORDER.map((weekday) => {
        const hour = byWeekday.get(weekday);
        const isToday = weekday === todayWeekday;

        return (
          <div
            key={weekday}
            className={`flex items-baseline justify-between gap-4 border-b pb-2 text-sm transition-colors ${
              isToday
                ? "border-secondary-light font-bold text-primary"
                : "border-slate-100 text-slate-700"
            }`}
          >
            <dt className="flex items-center gap-2 font-semibold">
              <span>{WEEKDAY_LABELS[weekday]}</span>
              {isToday && (
                <span className="rounded bg-secondary/15 px-1.5 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-secondary-700">
                  Today
                </span>
              )}
            </dt>
            <dd className={hour?.isOpen ? "tabular-nums text-slate-800" : "text-slate-400 font-medium"}>
              {hour?.isOpen
                ? `${formatTime12h(hour.openTime)} – ${formatTime12h(hour.closeTime)}`
                : "Closed"}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

export default async function HomePage() {
  const [settings, services, barbers] = await Promise.all([
    getSalonSettingsView().catch(() => null),
    listActiveServicesView().catch(() => [] as Service[]),
    listActiveBarbersView().catch(() => []),
  ]);

  const salonName = settings?.name ?? FALLBACK_NAME;
  const featured = services.slice(0, 6);

  return (
    <div className="flex min-h-dvh flex-col bg-surface-muted selection:bg-secondary selection:text-white">
      {/* Top Navigation */}
      <Navbar salonName={salonName} phone={settings?.phone} />

      {/* -------------------------------- HERO SECTION -------------------------------- */}
      <section className="relative overflow-hidden luxury-gradient-dark text-white">
        {/* Background photo backdrop with soft overlay */}
        <div className="absolute inset-0 z-0 opacity-20 mix-blend-overlay">
          <Image
            src="/images/salon/salon-hero.jpg"
            alt="Salon Interior"
            fill
            className="object-cover"
            priority
          />
        </div>

        {/* Decorative lighting elements */}
        <div className="absolute -top-40 -right-40 h-96 w-96 rounded-full bg-secondary-light/15 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-amber-500/10 blur-3xl" />

        <div className="container-page relative z-10 py-16 sm:py-24 lg:py-28">
          <div className="grid items-center gap-12 lg:grid-cols-12">
            <div className="flex flex-col items-start gap-6 lg:col-span-7">
              {/* Trust badge */}
              <div className="inline-flex items-center gap-2 rounded-full border border-secondary-light/30 bg-secondary-900/60 px-4 py-1.5 text-xs font-semibold tracking-wide text-secondary-light backdrop-blur-md">
                <span className="flex h-2 w-2 rounded-full bg-secondary-light animate-ping" />
                <span className="uppercase tracking-widest text-[11px]">Walk-Ins & Online Bookings</span>
                <span className="text-white/40">|</span>
                <span className="text-amber-300 font-bold">★ 4.9 (1,200+ Reviews)</span>
              </div>

              <h1 className="text-4xl font-extrabold tracking-tight sm:text-6xl lg:text-7xl leading-[1.08] text-white">
                The Art of <br />
                <span className="gold-gradient-text">Master Grooming</span>
              </h1>

              <p className="max-w-xl text-base leading-relaxed text-slate-200 sm:text-lg">
                Experience bespoke haircuts, precision beard sculpts, and traditional straight-razor shaves. Pick your barber, choose your time, and lock in your chair in under 60 seconds.
              </p>

              {/* Location & Phone pill */}
              {settings && (
                <div className="flex flex-wrap items-center gap-4 rounded-xl border border-white/10 bg-white/5 p-3 text-xs text-white/80 backdrop-blur-sm sm:text-sm">
                  <div className="flex items-center gap-2">
                    <svg className="h-4 w-4 text-secondary-light shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    </svg>
                    <span>{settings.address}</span>
                  </div>
                  {settings.phone && (
                    <div className="flex items-center gap-2">
                      <svg className="h-4 w-4 text-secondary-light shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <a href={`tel:${settings.phone.replace(/\s+/g, "")}`} className="font-semibold hover:text-secondary-light">
                        {settings.phone}
                      </a>
                    </div>
                  )}
                </div>
              )}

              {/* CTAs */}
              <div className="flex w-full flex-col gap-4 pt-2 sm:w-auto sm:flex-row sm:items-center">
                <Link
                  href="/book"
                  className={buttonClasses({
                    variant: "secondary",
                    size: "lg",
                    fullWidth: true,
                    className: "font-extrabold sm:w-auto sm:px-9 shadow-xl shadow-secondary/25 hover:scale-[1.02] transition-transform",
                  })}
                >
                  Book Appointment Now
                </Link>
                <a
                  href="#services"
                  className="inline-flex min-h-12 items-center justify-center rounded-xl border border-white/20 bg-white/10 px-6 text-base font-bold text-white transition-all hover:bg-white/20 hover:border-white/30"
                >
                  Explore Services & Pricing
                </a>
              </div>
            </div>

            {/* Hero Image Card / Showcase */}
            <div className="lg:col-span-5">
              <div className="relative mx-auto max-w-md overflow-hidden rounded-3xl border-2 border-white/15 bg-slate-900 shadow-2xl">
                <div className="relative aspect-[4/5] w-full">
                  <Image
                    src="/images/services/haircut.jpg"
                    alt="Master Barber Craft"
                    fill
                    className="object-cover object-center"
                    priority
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/90 via-slate-950/20 to-transparent" />
                  
                  {/* Floating badge inside image */}
                  <div className="absolute bottom-5 inset-x-5 flex flex-col gap-2 rounded-2xl bg-slate-900/85 p-4 backdrop-blur-md border border-white/10">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-secondary-light">
                        The Master Standard
                      </span>
                      <span className="text-xs font-semibold text-white/70">
                        15+ Min Notice
                      </span>
                    </div>
                    <p className="text-sm font-semibold text-white">
                      Complimentary beverage, hot lather neck shave, and scalp massage with every haircut.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick Metrics Banner */}
          <div className="mt-16 grid grid-cols-2 gap-4 border-t border-white/10 pt-8 sm:grid-cols-4">
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-white">10+</span>
              <span className="text-xs font-medium text-slate-300">Years of Craft</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-secondary-light">15k+</span>
              <span className="text-xs font-medium text-slate-300">Haircuts Delivered</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-amber-400">4.9 ★</span>
              <span className="text-xs font-medium text-slate-300">Average Client Rating</span>
            </div>
            <div className="flex flex-col">
              <span className="text-3xl font-extrabold text-white">100%</span>
              <span className="text-xs font-medium text-slate-300">Sanitized Equipment</span>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------- SERVICES CATALOG -------------------------------- */}
      <section id="services" className="container-page py-16 sm:py-24">
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-10">
          <div>
            <span className="text-xs font-extrabold uppercase tracking-widest text-secondary-700">
              Our Craft & Treatments
            </span>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl text-primary">
              Signature Services
            </h2>
            <p className="mt-2 max-w-2xl text-base text-slate-600">
              Transparent, upfront pricing and guaranteed appointment lengths. What you see is exactly what you get.
            </p>
          </div>
          <Link
            href="/book"
            className={buttonClasses({
              variant: "primary",
              size: "md",
              className: "font-bold shrink-0 self-start md:self-auto",
            })}
          >
            Open Booking Wizard →
          </Link>
        </div>

        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {featured.map((service) => {
            const serviceImg = getServiceImageUrl(service.category, service.name);

            return (
              <Card key={service.id} className="group overflow-hidden rounded-2xl border-slate-200/80 bg-surface shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover">
                {/* Visual Header */}
                <div className="relative h-44 w-full overflow-hidden bg-slate-100">
                  <Image
                    src={serviceImg}
                    alt={service.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-900/70 via-transparent to-transparent" />
                  <div className="absolute top-3 right-3">
                    <span className="rounded-full bg-slate-900/80 px-3 py-1 text-xs font-bold text-white backdrop-blur-md">
                      {formatDuration(service.durationMinutes)}
                    </span>
                  </div>
                  {service.category && (
                    <div className="absolute bottom-3 left-3">
                      <span className="rounded-md bg-secondary/90 px-2.5 py-0.5 text-xs font-extrabold uppercase tracking-wider text-white">
                        {service.category}
                      </span>
                    </div>
                  )}
                </div>

                <CardContent className="flex flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <h3 className="text-lg font-bold text-primary group-hover:text-secondary-700 transition-colors">
                      {service.name}
                    </h3>
                    <span className="text-lg font-extrabold text-primary">
                      {formatPrice(service.price)}
                    </span>
                  </div>

                  <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-slate-600">
                    {service.description || "Tailored precision styling crafted with top-tier grooming products."}
                  </p>

                  <div className="mt-5 pt-4 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      In the chair: ~{service.durationMinutes}m
                    </span>
                    <Link
                      href="/book"
                      className="inline-flex items-center gap-1 text-sm font-bold text-secondary-700 hover:text-secondary-900 hover:underline"
                    >
                      Book this →
                    </Link>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </section>

      {/* -------------------------------- MASTER BARBERS SHOWCASE -------------------------------- */}
      <section id="barbers" className="border-t border-slate-200/80 bg-surface py-16 sm:py-24">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-extrabold uppercase tracking-widest text-secondary-700">
              The Craftsmen
            </span>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl text-primary">
              Meet Our Master Barbers
            </h2>
            <p className="mt-3 text-base text-slate-600">
              Choose your favorite barber or let us pair you with whoever is free first. Every artist on our floor is licensed, seasoned, and dedicated to their craft.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {(barbers.length > 0 ? barbers : [
              { id: "1", name: "Rahul", bio: "Senior barber with 12 years of experience.", specializations: ["Master Barber", "Haircut", "Beard Styling"] },
              { id: "2", name: "Akash", bio: "Hair stylist specializing in modern cuts and color.", specializations: ["Stylist", "Coloring", "Fades"] },
              { id: "3", name: "Jay", bio: "Barber focused on classic cuts and beard grooming.", specializations: ["Classic Cuts", "Beard Grooming"] },
              { id: "4", name: "Karan", bio: "Junior barber, cheerful and great with kids cuts.", specializations: ["Kids Haircut", "Modern Trims"] },
            ]).map((barber) => {
              const photoUrl = getBarberPhotoUrl(barber);

              return (
                <div
                  key={barber.id}
                  className="group flex flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-card transition-all duration-200 hover:-translate-y-1 hover:shadow-card-hover"
                >
                  {/* Barber Photo Container */}
                  <div className="relative aspect-square w-full overflow-hidden bg-slate-100">
                    <Image
                      src={photoUrl}
                      alt={barber.name}
                      fill
                      className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                    
                    <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between text-white">
                      <span className="flex items-center gap-1.5 text-xs font-semibold">
                        <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                        Available Today
                      </span>
                      <span className="text-xs font-bold text-amber-300">
                        ★ 4.9
                      </span>
                    </div>
                  </div>

                  {/* Info */}
                  <div className="flex flex-1 flex-col p-5">
                    <h3 className="text-lg font-bold text-primary">{barber.name}</h3>
                    
                    <p className="mt-1 text-xs leading-relaxed text-slate-600 line-clamp-2">
                      {barber.bio || "Dedicated master barber crafting sharp looks and comfortable chair experiences."}
                    </p>

                    {/* Specialization pills */}
                    {barber.specializations && barber.specializations.length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {barber.specializations.slice(0, 2).map((spec) => (
                          <span
                            key={spec}
                            className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-700"
                          >
                            {spec}
                          </span>
                        ))}
                      </div>
                    )}

                    <div className="mt-auto pt-5">
                      <Link
                        href="/book"
                        className={buttonClasses({
                          variant: "outline",
                          size: "sm",
                          fullWidth: true,
                          className: "font-bold text-xs hover:border-secondary hover:bg-secondary hover:text-white transition-colors",
                        })}
                      >
                        Book with {barber.name}
                      </Link>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* -------------------------------- WHY CHOOSE US -------------------------------- */}
      <section id="why-us" className="border-t border-slate-200/80 bg-surface-muted py-16 sm:py-24">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-extrabold uppercase tracking-widest text-secondary-700">
              The Experience
            </span>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl text-primary">
              Why Discerning Clients Choose Us
            </h2>
            <p className="mt-3 text-base text-slate-600">
              We have re-engineered the barbershop visit from the moment you book to the moment you leave the chair.
            </p>
          </div>

          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {FEATURES.map((feat) => (
              <Card key={feat.title} className="rounded-2xl border-slate-200/80 p-6 shadow-sm hover:shadow-md transition-shadow">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary-50 text-primary-700 mb-4">
                  {feat.icon}
                </div>
                <h3 className="text-base font-bold text-primary">{feat.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-600">
                  {feat.description}
                </p>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------- PHOTO GALLERY / ATMOSPHERE -------------------------------- */}
      <section id="gallery" className="border-t border-slate-200/80 bg-surface py-16 sm:py-24">
        <div className="container-page">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-12">
            <div>
              <span className="text-xs font-extrabold uppercase tracking-widest text-secondary-700">
                Atmosphere & Craft
              </span>
              <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl text-primary">
                Step Inside the Shop
              </h2>
              <p className="mt-2 max-w-xl text-base text-slate-600">
                A warm, refined space designed for relaxation, craftsmanship, and great conversation.
              </p>
            </div>
            <Link
              href="/book"
              className={buttonClasses({
                variant: "secondary",
                size: "md",
                className: "font-bold shrink-0 self-start md:self-auto",
              })}
            >
              Reserve Your Chair →
            </Link>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-md group">
              <Image
                src="/images/salon/salon-hero.jpg"
                alt="Barbershop floor"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <span className="absolute bottom-3 left-3 text-xs font-bold text-white">Classic Styling Chairs</span>
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-md group">
              <Image
                src="/images/salon/tools.jpg"
                alt="Grooming tools"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <span className="absolute bottom-3 left-3 text-xs font-bold text-white">Precision Implements</span>
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-md group">
              <Image
                src="/images/services/beard.jpg"
                alt="Beard sculpt"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <span className="absolute bottom-3 left-3 text-xs font-bold text-white">Straight-Razor Lineup</span>
            </div>
            <div className="relative aspect-[3/4] overflow-hidden rounded-2xl shadow-md group">
              <Image
                src="/images/salon/interior.jpg"
                alt="Salon lounge"
                fill
                className="object-cover transition-transform duration-500 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-900/60 to-transparent" />
              <span className="absolute bottom-3 left-3 text-xs font-bold text-white">Lounge & Refreshments</span>
            </div>
          </div>
        </div>
      </section>

      {/* -------------------------------- CLIENT TESTIMONIALS -------------------------------- */}
      <section className="border-t border-slate-200/80 bg-surface-muted py-16 sm:py-24">
        <div className="container-page">
          <div className="text-center max-w-2xl mx-auto mb-14">
            <span className="text-xs font-extrabold uppercase tracking-widest text-secondary-700">
              Customer Love
            </span>
            <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl text-primary">
              Loved by Gentlemen of All Ages
            </h2>
          </div>

          <div className="grid gap-6 sm:grid-cols-3">
            {TESTIMONIALS.map((t) => (
              <Card key={t.name} className="rounded-2xl border-slate-200/80 p-6 shadow-sm flex flex-col justify-between">
                <div>
                  <div className="flex items-center gap-1 text-amber-400 mb-3">
                    {Array.from({ length: t.rating }).map((_, i) => (
                      <span key={i} className="text-base">★</span>
                    ))}
                  </div>
                  <p className="text-sm leading-relaxed text-slate-700 italic">
                    &ldquo;{t.text}&rdquo;
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-slate-100 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-full bg-primary-100 text-primary-800 flex items-center justify-center font-bold text-xs">
                    {t.name.charAt(0)}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-primary">{t.name}</p>
                    <p className="text-xs text-slate-500">{t.role}</p>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* -------------------------------- VISIT US & OPENING HOURS -------------------------------- */}
      {settings && (
        <section id="visit-us" className="border-t border-slate-200/80 bg-surface py-16 sm:py-24">
          <div className="container-page">
            <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
              <div className="lg:col-span-5 flex flex-col gap-6">
                <div>
                  <span className="text-xs font-extrabold uppercase tracking-widest text-secondary-700">
                    Location & Schedule
                  </span>
                  <h2 className="mt-1 text-3xl font-extrabold tracking-tight sm:text-4xl text-primary">
                    Visit Our Salon
                  </h2>
                  <p className="mt-3 text-base text-slate-600 leading-relaxed">
                    Conveniently located with dedicated customer parking and easy walk-in accessibility.
                  </p>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 flex flex-col gap-4">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary">
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      </svg>
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-primary">Salon Address</h4>
                      <address className="not-italic text-sm text-slate-600 mt-0.5">
                        {settings.address}
                      </address>
                    </div>
                  </div>

                  {settings.phone && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-secondary-100 text-secondary-800">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-primary">Phone</h4>
                        <a
                          href={`tel:${settings.phone.replace(/\s+/g, "")}`}
                          className="text-sm font-semibold text-secondary-700 hover:underline mt-0.5 block"
                        >
                          {settings.phone}
                        </a>
                      </div>
                    </div>
                  )}

                  {settings.email && (
                    <div className="flex items-start gap-3">
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
                        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-primary">Email Support</h4>
                        <a
                          href={`mailto:${settings.email}`}
                          className="text-sm font-semibold text-secondary-700 hover:underline mt-0.5 block"
                        >
                          {settings.email}
                        </a>
                      </div>
                    </div>
                  )}
                </div>

                <Link
                  href="/book"
                  className={buttonClasses({
                    variant: "secondary",
                    size: "lg",
                    className: "font-extrabold shadow-lg shadow-secondary/20",
                  })}
                >
                  Book Your Appointment Now
                </Link>
              </div>

              {/* Opening Hours Matrix */}
              <div className="lg:col-span-7">
                <Card className="rounded-3xl border-slate-200/80 p-6 sm:p-8 shadow-card">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-4 mb-6">
                    <div>
                      <h3 className="text-lg font-bold text-primary">Weekly Hours</h3>
                      <p className="text-xs text-slate-500">Live booking slots generate within these times</p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200">
                      <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                      Taking Bookings
                    </span>
                  </div>

                  <OpeningHoursTable settings={settings} />

                  <div className="mt-6 rounded-xl bg-slate-50 p-4 text-xs leading-relaxed text-slate-600 border border-slate-100">
                    <span className="font-bold text-primary">Booking Policy: </span>
                    Appointments can be scheduled up to {settings.maximumAdvanceBookingDays} days in advance, starting from {settings.minimumAdvanceBookingMinutes} minutes before chair time. Free cancellation up to {settings.cancellationWindowMinutes} minutes prior.
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </section>
      )}

      {/* Footer */}
      <Footer settings={settings} />
    </div>
  );
}
