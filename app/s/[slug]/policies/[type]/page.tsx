import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { getActiveSalon } from "@/lib/server/salon";
import prisma from "@/lib/server/prisma";

type Params = Promise<{ slug: string; type: string }>;

/** URL segment -> stored `PolicyType`, with the platform page used as the fallback. */
const TYPES = {
  terms: { db: "TERMS", title: "Terms & conditions", fallback: "/legal/terms" },
  privacy: { db: "PRIVACY", title: "Privacy policy", fallback: "/legal/privacy" },
  cancellation: { db: "CANCELLATION", title: "Cancellation policy", fallback: "/legal/refund-cancellation" },
  consent: { db: "CONSENT", title: "Data consent", fallback: "/legal/data-consent" },
} as const;

type TypeKey = keyof typeof TYPES;
const isTypeKey = (v: string): v is TypeKey => Object.prototype.hasOwnProperty.call(TYPES, v);

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { type } = await params;
  return { title: isTypeKey(type) ? TYPES[type].title : "Policy" };
}

/** A salon's own policy text (owner-edited), falling back to the platform's page. */
export default async function SalonPolicyPage({ params }: { params: Params }) {
  const { slug, type } = await params;
  if (!isTypeKey(type)) notFound();
  const salon = await getActiveSalon(slug);
  if (!salon) notFound();

  const cfg = TYPES[type];
  const policy = await prisma.salonPolicy.findUnique({
    where: { salonId_type: { salonId: salon.id, type: cfg.db } },
  });

  return (
    <main className="mx-auto max-w-3xl px-5 py-16 sm:px-8">
      <h1 className="text-3xl font-bold">{cfg.title}</h1>
      <p className="mt-1 text-sm opacity-70">{salon.name}</p>
      {policy ? (
        <div className="mt-8 whitespace-pre-wrap leading-relaxed">{policy.body}</div>
      ) : (
        <p className="mt-8 leading-relaxed">
          {salon.name} has not published its own {cfg.title.toLowerCase()}. The platform&apos;s standard{" "}
          <Link href={cfg.fallback} className="font-semibold underline underline-offset-2">
            {cfg.title.toLowerCase()}
          </Link>{" "}
          applies.
        </p>
      )}
      <p className="mt-10">
        <Link href={`/s/${slug}`} className="font-semibold underline underline-offset-2">
          Back to {salon.name}
        </Link>
      </p>
    </main>
  );
}
