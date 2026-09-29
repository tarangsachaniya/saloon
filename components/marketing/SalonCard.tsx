import Image from "next/image";
import Link from "next/link";

import type { RatingSummary } from "@/lib/server/reviews";
import { PALETTE } from "./pop/ui";

const FALLBACK_COVERS = [
  "/images/salon/interior.jpg",
  "/images/salon/salon-store.jpg",
  "/images/salon/tools.jpg",
  "/images/salon/salon-hero.jpg",
];

/** Stable pick so a salon keeps the same fallback image and colour. */
function hashOf(slug: string): number {
  let hash = 0;
  for (const ch of slug) hash = (hash * 31 + ch.charCodeAt(0)) >>> 0;
  return hash;
}

/** "12 MG Road, Bengaluru, India" -> "Bengaluru" */
function cityOf(address: string | null): string | null {
  if (!address) return null;
  const parts = address.split(",").map((p) => p.trim()).filter(Boolean);
  return parts.length >= 2 ? parts[parts.length - 2] : parts[0];
}

export function SalonCard({
  salon,
  rating,
  index = 0,
}: {
  salon: { slug: string; name: string; tagline: string | null; address: string | null; coverUrl: string | null };
  rating?: RatingSummary;
  index?: number;
}) {
  const h = hashOf(salon.slug);
  const tilt = index % 2 ? "hover:rotate-1" : "hover:-rotate-1";
  return (
    <Link
      href={`/s/${salon.slug}`}
      className={`group block h-full rounded-[2rem] border-[3px] border-plum bg-white p-3 shadow-[6px_6px_0_0_#3b1a3f] transition duration-300 hover:-translate-y-1 hover:shadow-[10px_10px_0_0_#3b1a3f] ${tilt} focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-4 focus-visible:outline-plum`}
    >
      <div className={`relative aspect-[4/3] overflow-hidden rounded-[1.4rem] border-2 border-plum ${PALETTE[h % PALETTE.length]}`}>
        <Image
          src={salon.coverUrl || FALLBACK_COVERS[h % FALLBACK_COVERS.length]}
          alt=""
          fill
          sizes="(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw"
          className="object-cover transition-transform duration-700 group-hover:scale-105"
        />
        {rating && (
          <span className="absolute right-3 top-3 rounded-full border-2 border-plum bg-butter px-3 py-1 text-sm font-bold text-plum">
            ★ {rating.average.toFixed(1)} <span className="font-medium">({rating.count})</span>
          </span>
        )}
      </div>
      <div className="px-3 pb-3 pt-5">
        <h3 className="font-chunky text-2xl font-extrabold leading-tight text-plum">{salon.name}</h3>
        {salon.tagline && <p className="mt-1 line-clamp-2 text-plum/75">{salon.tagline}</p>}
        <div className="mt-4 flex items-center justify-between gap-3">
          <span className="truncate rounded-full bg-cream px-3 py-1 text-sm font-semibold text-plum">
            {cityOf(salon.address) ?? "Book online"}
          </span>
          <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border-2 border-plum bg-tomato text-lg font-bold text-plum transition group-hover:rotate-45">
            ↗
          </span>
        </div>
      </div>
    </Link>
  );
}
