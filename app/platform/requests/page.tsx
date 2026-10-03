"use client";

import { useState } from "react";

import { popButton } from "@/components/marketing/pop/ui";
import { card } from "@/components/platform/fields";
import { useAdminData } from "@/lib/admin/useAdminData";
import { getSalonRequest, listSalonRequests, type SalonRequest } from "@/lib/api/platform";
import { PlatformListSkeleton } from "@/components/loading/marketing";

const formatDate = (iso: string) =>
  new Date(iso).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });

/**
 * Salon listing requests from the public "List your salon" form. Read-only: the
 * team contacts each person manually, so there is nothing to approve here and no
 * account is created from a request.
 */
export default function SalonRequestsPage() {
  const { data, error, isLoading, refresh } = useAdminData((signal) => listSalonRequests({ signal }), []);
  const [openId, setOpenId] = useState<string | null>(null);
  const [seen, setSeen] = useState<Set<string>>(new Set());

  function toggle(request: SalonRequest) {
    if (openId === request.id) return setOpenId(null);
    setOpenId(request.id);
    if (request.isNew && !seen.has(request.id)) {
      // Opening the request is what clears its "new" notification.
      setSeen((s) => new Set(s).add(request.id));
      getSalonRequest(request.id).catch(() => undefined);
    }
  }

  return (
    <div>
      <h1 className="font-chunky text-5xl font-extrabold tracking-tight text-plum">Salon listing requests</h1>
      <p className="mt-1 font-medium text-plum/75">
        {data ? `${data.counts.total} total · ${data.counts.unseen} new. ` : ""}
        People who asked to list their salon. Contact them directly using the details below.
      </p>

      {isLoading && <PlatformListSkeleton header={false} label="Loading requests…" />}
      {error && (
        <div role="alert" className="mt-8 rounded-2xl border-2 border-plum bg-tomato/25 p-4 font-semibold">
          {error}{" "}
          <button type="button" onClick={refresh} className="font-bold underline">
            Try again
          </button>
        </div>
      )}

      {data && data.requests.length === 0 && (
        <div className="mt-10 rounded-[2rem] border-[3px] border-dashed border-plum bg-white p-12 text-center">
          <p className="font-chunky text-2xl font-extrabold">No requests yet.</p>
        </div>
      )}

      <ul className="mt-8 grid gap-6">
        {data?.requests.map((r) => {
          const isOpen = openId === r.id;
          const isNew = r.isNew && !seen.has(r.id);
          return (
            <li key={r.id} className={`${card} !p-5 sm:!p-6`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-bold text-plum/60">New Salon Listing Request</p>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="font-chunky text-2xl font-extrabold leading-tight">{r.salonName}</h2>
                    {isNew && (
                      <span className="rounded-full border-2 border-plum bg-tomato px-2.5 py-0.5 text-xs font-extrabold">NEW</span>
                    )}
                  </div>
                </div>
                <p className="text-sm font-semibold text-plum/70">Submitted {formatDate(r.createdAt)}</p>
              </div>

              <dl className="mt-4 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2">
                <Row label="Owner" value={r.ownerName} />
                <Row label="Email" value={r.email} href={`mailto:${r.email}`} />
                <Row label="Phone" value={r.phone ?? "-"} href={r.phone ? `tel:${r.phone.replace(/\s+/g, "")}` : undefined} />
                <Row label="City" value={r.city ?? "-"} />
              </dl>

              {isOpen && (
                <div className="mt-4 rounded-2xl border-2 border-plum bg-cream p-4 text-sm">
                  <p className="font-bold text-plum/70">Message from the applicant</p>
                  <p className="mt-1 whitespace-pre-wrap font-medium">{r.message || "No message."}</p>
                </div>
              )}

              <div className="mt-5">
                <button type="button" onClick={() => toggle(r)} aria-expanded={isOpen} className={popButton("white", "md")}>
                  {isOpen ? "Hide details" : "View details"}
                </button>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function Row({ label, value, href }: { label: string; value: string; href?: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-14 shrink-0 font-bold text-plum/60">{label}</dt>
      <dd className="min-w-0 break-words font-semibold">
        {href ? (
          <a href={href} className="underline underline-offset-2">
            {value}
          </a>
        ) : (
          value
        )}
      </dd>
    </div>
  );
}
