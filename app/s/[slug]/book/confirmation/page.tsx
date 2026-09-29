"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useBooking } from "@/lib/booking/BookingContext";
import { useSalon } from "@/lib/salon/SalonContext";
import {
  Button,
  buttonClasses,
  Card,
  EmptyState,
  Loader,
  StatusPill,
} from "@/components/ui";
import { formatPrice } from "@/lib/utils/format";
import {
  formatDateLong,
  formatDuration,
  formatTime12h,
  minutesToTimeString,
} from "@/lib/utils/time";
import { BarberAvatar } from "@/components/booking/BarberSelector";

export default function ConfirmationPage() {
  const router = useRouter();
  const { slug } = useSalon();
  const { confirmedAppointment, service, barber, isAnyBarber, reset } =
    useBooking();
  const [isLeaving, setIsLeaving] = useState(false);

  function bookAnother() {
    setIsLeaving(true);
    reset();
    router.push(`/s/${slug}/book`);
  }

  if (isLeaving) {
    return <Loader label="Starting a new booking…" />;
  }

  if (!confirmedAppointment) {
    return (
      <EmptyState
        title="No confirmed booking to show"
        description="This page shows your confirmation right after you book. If you refreshed or opened it directly, the details aren't here any more — but any booking you completed is still in our diary."
        action={
          <Link href={`/s/${slug}/book`} className={buttonClasses()}>
            Book an appointment
          </Link>
        }
      />
    );
  }

  const appointment = confirmedAppointment;
  const serviceName = appointment.service?.name ?? service?.name ?? "—";
  const barberName =
    appointment.barber?.name ?? (isAnyBarber ? undefined : barber?.name) ?? "—";

  const startLabel = formatTime12h(appointment.startTime);
  const endLabel = formatTime12h(appointment.endTime);
  const start24 = minutesToTimeString(appointment.startTime);
  const end24 = minutesToTimeString(appointment.endTime);

  return (
    <div className="mx-auto flex w-full max-w-xl flex-col gap-6 py-4">
      {/* Celebration Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <span
          aria-hidden
          className="flex h-16 w-16 items-center justify-center rounded-2xl bg-secondary-100 text-secondary-800 ring-4 ring-secondary-200/60 shadow-lg shadow-secondary/20 animate-fade-in"
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="h-8 w-8 text-secondary-800"
          >
            <path d="M5 12.5l4.5 4.5L19 7.5" />
          </svg>
        </span>

        <h1 className="text-3xl font-extrabold tracking-tight text-primary">
          Appointment Confirmed!
        </h1>
        <p className="max-w-md text-sm text-slate-600 sm:text-base">
          We&rsquo;ve reserved your chair for{" "}
          <span className="font-bold text-primary">{formatDateLong(appointment.appointmentDate)}</span>{" "}
          at <span className="font-bold text-primary">{startLabel}</span>.
        </p>
        <StatusPill status={appointment.status} />
      </div>

      {/* Ticket / Pass Card */}
      <Card className="overflow-hidden rounded-3xl border-slate-200 bg-surface shadow-card">
        {/* Card Top: Barber & Service Banner */}
        <div className="border-b border-slate-100 bg-slate-50/80 p-5 sm:p-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <BarberAvatar barber={appointment.barber ?? barber} size={52} />
            <div>
              <span className="text-[10px] font-extrabold uppercase tracking-wider text-secondary-700">
                Craftsman
              </span>
              <p className="text-base font-extrabold text-primary leading-tight">
                {barberName}
              </p>
              <p className="text-xs text-slate-500 mt-0.5">
                {serviceName}
              </p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              Total Fee
            </span>
            <p className="text-xl font-extrabold text-primary">
              {formatPrice(appointment.price)}
            </p>
          </div>
        </div>

        {/* Card Body: Details */}
        <div className="p-5 sm:p-6">
          <dl className="divide-y divide-slate-100">
            {[
              { label: "Date", value: formatDateLong(appointment.appointmentDate) },
              {
                label: "Time Window",
                value: (
                  <span>
                    {startLabel} – {endLabel}{" "}
                    <span className="text-xs text-slate-400 font-normal">
                      ({start24}–{end24})
                    </span>
                  </span>
                ),
              },
              {
                label: "Estimated Duration",
                value: formatDuration(appointment.durationMinutes),
              },
              {
                label: "Customer",
                value: appointment.client?.name ?? "—",
              },
              ...(appointment.client?.phone
                ? [{ label: "Contact Phone", value: appointment.client.phone }]
                : []),
              ...(appointment.notes
                ? [{ label: "Appointment Notes", value: appointment.notes }]
                : []),
            ].map((row) => (
              <div
                key={row.label}
                className="flex items-start justify-between gap-4 py-2.5"
              >
                <dt className="shrink-0 text-xs font-bold uppercase tracking-wider text-slate-400">
                  {row.label}
                </dt>
                <dd className="min-w-0 break-words text-right text-sm font-bold text-primary">
                  {row.value}
                </dd>
              </div>
            ))}
          </dl>

          <div className="mt-5 rounded-2xl bg-primary-50 p-4 border border-primary-100 flex items-start gap-3">
            <svg className="h-5 w-5 text-primary shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div className="text-xs text-primary-800 leading-relaxed">
              Booking Ref: <span className="font-extrabold uppercase tracking-wider">{appointment.id.slice(0, 8)}</span>
              <p className="mt-0.5 text-primary-700">
                Payment is settled directly in the salon upon completion. Please arrive 5 minutes prior to your slot.
              </p>
            </div>
          </div>
        </div>
      </Card>

      {/* Action buttons */}
      <div className="flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button size="lg" onClick={bookAnother} className="sm:px-8 font-bold">
          Book Another Appointment
        </Button>
        <Link
          href={`/s/${slug}`}
          className={buttonClasses({
            variant: "outline",
            size: "lg",
            className: "sm:px-8 font-bold",
          })}
        >
          Return to Home
        </Link>
      </div>
    </div>
  );
}
