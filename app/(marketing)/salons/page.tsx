import type { Metadata } from "next";

import { FadeUp } from "@/components/marketing/fx/primitives";
import { SalonCard } from "@/components/marketing/SalonCard";
import prisma from "@/lib/server/prisma";
import { getRatingSummaries } from "@/lib/server/reviews";

export const metadata: Metadata = {
  title: "Find a salon",
  description: "Browse salons on the platform and book your next appointment online.",
};

export const dynamic = "force-dynamic";

export default async function SalonsPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string | string[] }>;
}) {
  const { q: rawQ } = await searchParams;
  const q = (Array.isArray(rawQ) ? rawQ[0] : rawQ)?.trim().slice(0, 80) ?? "";

  const salons = await prisma.salon
    .findMany({
      where: {
        isActive: true,
        ...(q
          ? {
              OR: [
                { name: { contains: q, mode: "insensitive" } },
                { address: { contains: q, mode: "insensitive" } },
                { tagline: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      orderBy: { name: "asc" },
      select: { id: true, slug: true, name: true, tagline: true, address: true, coverUrl: true },
    })
    .catch(() => []);
  const ratings = await getRatingSummaries(salons.map((s) => s.id)).catch(() => new Map());

  return (
    <>
      <section className="bg-butter pb-16 pt-32 sm:pb-20 sm:pt-40">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <span className="inline-block -rotate-2 rounded-full border-2 border-plum bg-white px-4 py-1 text-sm font-bold text-plum">
            The salon list
          </span>
          <h1 className="mt-5 animate-reveal-up font-chunky text-6xl font-extrabold leading-[0.92] tracking-tight text-plum sm:text-8xl">
            Find your <span className="text-tomato">salon</span>
          </h1>
          <form action="/salons" method="get" role="search" className="mt-10 flex max-w-2xl flex-col gap-4 sm:flex-row">
            <label className="sr-only" htmlFor="salon-search">
              Search salons by name or area
            </label>
            <input
              id="salon-search"
              name="q"
              defaultValue={q}
              maxLength={80}
              placeholder="Search by name or area…"
              className="min-h-14 flex-1 rounded-full border-[3px] border-plum bg-white px-6 text-lg font-medium text-plum shadow-[4px_4px_0_0_#3b1a3f] placeholder:text-plum/40 focus:outline focus:outline-[3px] focus:outline-offset-2 focus:outline-lilac"
            />
            <button
              type="submit"
              className="min-h-14 rounded-full border-[3px] border-plum bg-plum px-8 text-lg font-bold text-butter shadow-[4px_4px_0_0_#3b1a3f] transition-all hover:translate-x-[3px] hover:translate-y-[3px] hover:shadow-none"
            >
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16 sm:px-8 sm:py-20">
        {salons.length === 0 ? (
          <p className="rounded-[2rem] border-[3px] border-dashed border-plum bg-white p-12 text-center font-chunky text-2xl font-bold text-plum">
            {q ? `No salons match “${q}” yet.` : "No salons are listed yet. Check back soon!"}
          </p>
        ) : (
          <>
            <p className="mb-8 font-bold text-plum/75" aria-live="polite">
              {salons.length} {salons.length === 1 ? "salon" : "salons"}
              {q ? ` matching “${q}”` : ""}
            </p>
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
              {salons.map((salon, i) => (
                <FadeUp key={salon.id} delay={(i % 3) * 0.08}>
                  <SalonCard salon={salon} rating={ratings.get(salon.id)} index={i} />
                </FadeUp>
              ))}
            </div>
          </>
        )}
      </section>
    </>
  );
}
