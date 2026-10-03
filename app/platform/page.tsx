"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { popButton } from "@/components/marketing/pop/ui";
import { inputClass } from "@/components/platform/fields";
import { listPlatformSalons } from "@/lib/api/platform";
import { useAdminData } from "@/lib/admin/useAdminData";
import { THEMES } from "@/lib/themes";
import { PlatformListSkeleton } from "@/components/loading/marketing";

export default function PlatformSalonsPage() {
  const { data, error, isLoading, refresh } = useAdminData((signal) => listPlatformSalons({ signal }), []);
  const [q, setQ] = useState("");

  const salons = useMemo(() => {
    const term = q.trim().toLowerCase();
    if (!data) return [];
    if (!term) return data;
    return data.filter((s) =>
      [s.name, s.slug, s.address ?? "", s.owner?.email ?? ""].some((v) => v.toLowerCase().includes(term)),
    );
  }, [data, q]);

  const active = data?.filter((s) => s.isActive).length ?? 0;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-chunky text-5xl font-extrabold tracking-tight text-plum">Salons</h1>
          <p className="mt-1 font-medium text-plum/75">
            {data ? `${data.length} total · ${active} active` : "Every salon on the platform."}
          </p>
        </div>
        <Link href="/platform/salons/new" className={popButton("tomato", "md")}>
          + New salon
        </Link>
      </div>

      <div className="mt-8 max-w-md">
        <label htmlFor="salon-filter" className="sr-only">
          Filter salons
        </label>
        <input
          id="salon-filter"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Filter by name, address or owner email…"
          className={inputClass}
        />
      </div>

      {isLoading && <PlatformListSkeleton header={false} label="Loading salons…" />}

      {error && (
        <div role="alert" className="mt-8 rounded-2xl border-2 border-plum bg-tomato/25 p-4 font-semibold">
          {error}{" "}
          <button type="button" onClick={refresh} className="font-bold underline">
            Try again
          </button>
        </div>
      )}

      {data && salons.length === 0 && (
        <div className="mt-10 rounded-[2rem] border-[3px] border-dashed border-plum bg-white p-12 text-center">
          <p className="font-chunky text-2xl font-extrabold">{q ? "No salons match that filter." : "No salons yet."}</p>
          {!q && (
            <Link href="/platform/salons/new" className={`${popButton("butter", "md")} mt-6`}>
              Create the first salon
            </Link>
          )}
        </div>
      )}

      <ul className="mt-8 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
        {salons.map((s) => {
          const theme = THEMES[s.theme] ?? THEMES.SPA;
          return (
            <li key={s.id}>
              <Link
                href={`/platform/salons/${s.id}`}
                className="group block h-full rounded-[2rem] border-[3px] border-plum bg-white p-5 shadow-[5px_5px_0_0_#3b1a3f] transition hover:-translate-y-1 hover:shadow-[8px_8px_0_0_#3b1a3f]"
              >
                <div className="flex items-start justify-between gap-3">
                  <span className="flex h-10 w-24 overflow-hidden rounded-xl border-2 border-plum" title={theme.name}>
                    {theme.swatch.map((c, i) => (
                      <span key={i} className="flex-1" style={{ background: i === 3 && s.accentColor ? s.accentColor : c }} />
                    ))}
                  </span>
                  <span
                    className={`rounded-full border-2 border-plum px-3 py-0.5 text-xs font-bold ${
                      s.isActive ? "bg-mint" : "bg-tomato/40"
                    }`}
                  >
                    {s.isActive ? "Active" : "Disabled"}
                  </span>
                </div>
                <h2 className="mt-4 font-chunky text-2xl font-extrabold leading-tight group-hover:underline">{s.name}</h2>
                <p className="mt-0.5 font-mono text-sm text-plum/70">/s/{s.slug}</p>
                <dl className="mt-4 flex flex-col gap-1.5 text-sm">
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-bold text-plum/60">Owner</dt>
                    <dd className="truncate font-semibold">{s.owner ? s.owner.email : "No owner login"}</dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-bold text-plum/60">Plan</dt>
                    <dd className="font-semibold">
                      {s.plan ? s.plan.summary : <span className="text-red-700">No plan set</span>}
                    </dd>
                  </div>
                  <div className="flex gap-2">
                    <dt className="w-16 shrink-0 font-bold text-plum/60">Activity</dt>
                    <dd className="font-semibold">
                      {s.counts.appointments} bookings · {s.counts.barbers} team · {s.counts.services} services
                    </dd>
                  </div>
                </dl>
              </Link>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
