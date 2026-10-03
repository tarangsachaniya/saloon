"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import Link from "next/link";
import { useMemo, useState } from "react";

import type { MyAppointment } from "@/lib/api/account";
import { popButton } from "@/components/marketing/pop/ui";
import { FormAlert } from "@/components/auth/fields";
import { formatDateLong, formatTime12h } from "@/lib/utils/time";
import { formatPrice } from "@/lib/utils/format";
import { CancelAppointmentDialog } from "./CancelAppointmentDialog";
import { RescheduleAppointmentDialog } from "./RescheduleAppointmentDialog";

type Bucket = MyAppointment["bucket"];

const BUCKETS: { id: Bucket; label: string }[] = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
];

const EMPTY: Record<Bucket, { title: string; body: string }> = {
  upcoming: { title: "No upcoming appointments", body: "When you book, your appointment shows up here." },
  past: { title: "No previous appointments", body: "Completed visits will appear here so you can book them again." },
  cancelled: { title: "No cancelled appointments", body: "Anything you cancel will be listed here." },
};

const STATUS_STYLE: Record<string, string> = {
  PENDING: "bg-butter",
  CONFIRMED: "bg-mint",
  ARRIVED: "bg-mint",
  IN_PROGRESS: "bg-lilac",
  COMPLETED: "bg-mint",
  CANCELLED: "bg-plum/10",
  NO_SHOW: "bg-tomato/40",
};

const STATUS_LABEL: Record<string, string> = {
  PENDING: "Pending",
  CONFIRMED: "Confirmed",
  ARRIVED: "Arrived",
  IN_PROGRESS: "In progress",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

const smallButton = popButton("white", "md");

function AppointmentCard({
  a,
  onCancel,
  onReschedule,
}: {
  a: MyAppointment;
  onCancel: () => void;
  onReschedule: () => void;
}) {
  const serviceIds = a.services?.map((s) => s.id) ?? [a.service.id];
  const bookAgain = `/s/${a.salon.slug}/book?serviceIds=${encodeURIComponent(serviceIds.join(","))}&barberId=${encodeURIComponent(a.barber.id)}`;
  const upcoming = a.bucket === "upcoming";

  return (
    <div className="min-w-0 rounded-[1.5rem] border-[3px] border-plum bg-white p-4 shadow-[4px_4px_0_0_#3b1a3f] transition-transform duration-150 hover:-translate-y-0.5 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <h3 className="break-words font-chunky text-xl font-extrabold leading-tight text-plum">{a.service.name}</h3>
          <p className="mt-0.5 break-words text-sm font-semibold text-plum/70">
            {a.salon.name} · with {a.barber.name}
          </p>
        </div>
        <span
          className={`shrink-0 rounded-full border-2 border-plum px-3 py-0.5 text-xs font-bold text-plum ${STATUS_STYLE[a.status] ?? "bg-white"}`}
        >
          {STATUS_LABEL[a.status] ?? a.status}
        </span>
      </div>

      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-3">
        <div>
          <dt className="font-bold text-plum/60">Date</dt>
          <dd className="font-semibold text-plum">{formatDateLong(a.date)}</dd>
        </div>
        <div>
          <dt className="font-bold text-plum/60">Time</dt>
          <dd className="font-semibold text-plum">
            {formatTime12h(a.startTime)} – {formatTime12h(a.endTime)}
          </dd>
        </div>
        <div>
          <dt className="font-bold text-plum/60">Price</dt>
          <dd className="font-semibold text-plum">{formatPrice(a.price)}</dd>
        </div>
      </dl>

      {upcoming && (a.canReschedule || a.canCancel) && (
        <div className="mt-4 flex flex-col gap-2 sm:flex-row">
          {a.canReschedule && (
            <button type="button" onClick={onReschedule} className={`${smallButton} w-full sm:w-auto`}>
              Reschedule
            </button>
          )}
          {a.canCancel && (
            <button type="button" onClick={onCancel} className={`${smallButton} w-full sm:w-auto`}>
              Cancel
            </button>
          )}
        </div>
      )}
      {upcoming && !a.canCancel && !a.canReschedule && (a.cancelBlockedReason || a.rescheduleBlockedReason) && (
        <p className="mt-3 rounded-xl bg-butter/60 px-3 py-2 text-sm font-semibold text-plum">
          {a.cancelBlockedReason ?? a.rescheduleBlockedReason}
        </p>
      )}
      {upcoming && a.canCancel && !a.canReschedule && a.rescheduleBlockedReason && (
        <p className="mt-2 text-xs font-semibold text-plum/70">{a.rescheduleBlockedReason}</p>
      )}

      {!upcoming && a.canBookAgain && (
        <div className="mt-4">
          <Link href={bookAgain} className={`${smallButton} w-full sm:w-auto`}>
            Book again
          </Link>
        </div>
      )}
    </div>
  );
}

/** Upcoming / Past / Cancelled tabs over the customer's own appointments. */
export function AppointmentsSection({
  appointments,
  error,
  isLoading,
  onReload,
  onChanged,
}: {
  appointments: MyAppointment[] | null;
  error: string | null;
  isLoading: boolean;
  onReload: () => void;
  onChanged: (next: MyAppointment) => void;
}) {
  const reduceMotion = useReducedMotion();
  const [bucket, setBucket] = useState<Bucket>("upcoming");
  const [cancelling, setCancelling] = useState<MyAppointment | null>(null);
  const [rescheduling, setRescheduling] = useState<MyAppointment | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const grouped = useMemo(() => {
    const groups: Record<Bucket, MyAppointment[]> = { upcoming: [], past: [], cancelled: [] };
    for (const a of appointments ?? []) groups[a.bucket].push(a);
    groups.upcoming.sort((x, y) => x.startsAt - y.startsAt);
    groups.past.sort((x, y) => y.startsAt - x.startsAt);
    groups.cancelled.sort((x, y) => y.startsAt - x.startsAt);
    return groups;
  }, [appointments]);

  const list = grouped[bucket];

  return (
    <div className="space-y-5">
      <div role="tablist" aria-label="Appointment groups" className="flex flex-wrap gap-2">
        {BUCKETS.map((b) => (
          <button
            key={b.id}
            role="tab"
            type="button"
            aria-selected={bucket === b.id}
            onClick={() => setBucket(b.id)}
            className={`min-h-10 rounded-full border-2 border-plum px-4 text-sm font-bold text-plum transition focus-visible:outline focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-lilac ${
              bucket === b.id ? "bg-butter shadow-[3px_3px_0_0_#3b1a3f]" : "bg-white hover:bg-cream"
            }`}
          >
            {b.label}
            {appointments && <span className="ml-1.5 text-plum/60">{grouped[b.id].length}</span>}
          </button>
        ))}
      </div>

      {notice && <FormAlert tone="success">{notice}</FormAlert>}

      {isLoading && (
        <p role="status" className="py-10 text-center font-chunky text-lg font-bold text-plum/60">
          Loading appointments…
        </p>
      )}

      {error && (
        <div role="alert" className="rounded-2xl border-2 border-plum bg-tomato/25 p-4 text-sm font-bold text-plum">
          <p>{error}</p>
          <button type="button" onClick={onReload} className={`${smallButton} mt-3`}>
            Try again
          </button>
        </div>
      )}

      {appointments && list.length === 0 && (
        <div className="rounded-2xl border-2 border-dashed border-plum/40 p-6 text-center">
          <p className="font-chunky text-lg font-extrabold text-plum">{EMPTY[bucket].title}</p>
          <p className="mt-1 text-sm font-medium text-plum/70">{EMPTY[bucket].body}</p>
          {bucket === "upcoming" && (
            <Link href="/salons" className={`${popButton("plum", "md")} mt-4`}>
              Find a salon
            </Link>
          )}
        </div>
      )}

      <ul className="space-y-4">
        <AnimatePresence initial={false} mode="popLayout">
          {list.map((a) => (
            <motion.li
              key={a.id}
              layout={!reduceMotion}
              initial={reduceMotion ? false : { opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={reduceMotion ? undefined : { opacity: 0, y: -8 }}
              transition={{ duration: 0.18 }}
            >
              <AppointmentCard a={a} onCancel={() => setCancelling(a)} onReschedule={() => setRescheduling(a)} />
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>

      <CancelAppointmentDialog
        appointment={cancelling}
        onClose={() => setCancelling(null)}
        onCancelled={(next) => {
          onChanged(next);
          setCancelling(null);
          setNotice("Appointment cancelled.");
        }}
      />
      <RescheduleAppointmentDialog
        appointment={rescheduling}
        onClose={() => setRescheduling(null)}
        onRescheduled={(next) => {
          onChanged(next);
          setRescheduling(null);
          setNotice(`Appointment rescheduled to ${formatDateLong(next.date)} at ${formatTime12h(next.startTime)}.`);
        }}
      />
    </div>
  );
}
