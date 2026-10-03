"use client";

import Image from "next/image";
import { getBarbers } from "@/lib/api";
import { useBooking } from "@/lib/booking/BookingContext";
import { useSalon } from "@/lib/salon/SalonContext";
import type { Barber } from "@/lib/booking/types";
import { Badge, EmptyState, Loader } from "@/components/ui";
import { getBarberPhotoUrl } from "@/lib/utils/barberImages";
import { StepError, StepShell } from "./StepShell";
import { useAsync } from "./useAsync";

export function BarberAvatar({
  barber,
  size = 56,
  className = "",
}: {
  barber: Partial<Barber> | null | undefined;
  size?: number;
  className?: string;
}) {
  const photoUrl = getBarberPhotoUrl(barber);

  return (
    <div
      className={`relative shrink-0 overflow-hidden rounded-full ring-2 ring-slate-200 shadow-sm bg-slate-100 ${className}`}
      style={{ width: size, height: size }}
    >
      <Image
        src={photoUrl}
        alt={barber?.name ?? "Stylist"}
        fill
        className="object-cover object-top"
        sizes={`${size}px`}
      />
    </div>
  );
}

export function BarberSelector({ onSelected }: { onSelected: () => void }) {
  const { service, serviceIds, barber: selected, isAnyBarber, selectBarber, selectAnyBarber } =
    useBooking();
  const { slug } = useSalon();
  const serviceKey = serviceIds.join(",");

  const { data, error, isLoading, reload } = useAsync(
    (signal) =>
      serviceKey
        ? getBarbers(slug, serviceKey.split(","), { signal })
        : Promise.resolve<Barber[]>([]),
    [slug, serviceKey],
  );

  function chooseAny() {
    selectAnyBarber();
    onSelected();
  }

  function choose(barber: Barber) {
    selectBarber(barber);
    onSelected();
  }

  return (
    <StepShell
      title="Choose your stylist"
      description={
        service
          ? `Showing stylists who can do your ${service.name.toLowerCase()}.`
          : "Choose your favourite stylist, or pick Any Stylist for the fastest availability."
      }
    >
      {isLoading && <Loader label="Loading available stylists…" />}

      {error && <StepError message={error} onRetry={reload} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No stylists available for this service"
          description="Nobody is currently set up to perform this service. Please go back and choose a different one."
        />
      )}

      {data && data.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {/* Any Stylist Card */}
          <button
            type="button"
            onClick={chooseAny}
            aria-pressed={isAnyBarber}
            className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary ${
              isAnyBarber
                ? "border-secondary bg-white ring-2 ring-secondary/40 shadow-card-hover"
                : "border-slate-200 bg-white hover:border-secondary hover:shadow-card-hover hover:-translate-y-1"
            }`}
          >
            {/* Visual Top Banner */}
            <div className="relative aspect-[16/10] w-full overflow-hidden bg-gradient-to-br from-[#053b50] to-[#176b87] flex flex-col items-center justify-center text-white p-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 text-white ring-1 ring-white/30 backdrop-blur-md shadow-inner transition-transform group-hover:scale-105">
                <svg
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="h-8 w-8 text-secondary-light"
                >
                  <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                  <circle cx="9" cy="7" r="4" />
                  <path d="M23 21v-2a4 4 0 00-3-3.87" />
                  <path d="M16 3.13a4 4 0 010 7.75" />
                </svg>
              </div>

              <span className="mt-2.5 rounded-full bg-secondary px-2.5 py-0.5 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                ⚡ Fastest Available Slot
              </span>
            </div>

            {/* Content */}
            <div className="flex flex-1 flex-col p-5">
              <div className="flex items-center justify-between gap-2">
                <h3 className="text-lg font-bold text-primary">Any Stylist</h3>
                <span className="text-xs font-semibold text-secondary-700">Team Choice</span>
              </div>

              <p className="mt-2 text-xs leading-relaxed text-slate-600 flex-1">
                We assign the first qualified barber free at your preferred time. Gives you the widest choice of appointment slots.
              </p>

              <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500">
                  Maximum Flexibility
                </span>
                <span
                  className={`inline-flex items-center gap-1 text-xs font-bold ${
                    isAnyBarber ? "text-secondary-700" : "text-slate-400 group-hover:text-primary"
                  }`}
                >
                  {isAnyBarber ? "Selected ✓" : "Select →"}
                </span>
              </div>
            </div>
          </button>

          {/* Specific Barber Cards */}
          {data.map((barber) => {
            const isSelected = !isAnyBarber && selected?.id === barber.id;
            const photoUrl = getBarberPhotoUrl(barber);

            return (
              <button
                key={barber.id}
                type="button"
                onClick={() => choose(barber)}
                aria-pressed={isSelected}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary ${
                  isSelected
                    ? "border-secondary bg-white ring-2 ring-secondary/40 shadow-card-hover"
                    : "border-slate-200 bg-white hover:border-secondary hover:shadow-card-hover hover:-translate-y-1"
                }`}
              >
                {/* Visual Top Header: Barber Portrait */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={photoUrl}
                    alt={barber.name}
                    fill
                    sizes="(min-width: 1024px) 25vw, (min-width: 640px) 50vw, 100vw"
                    className="object-cover object-top transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/75 via-transparent to-transparent" />

                  <div className="absolute bottom-2.5 left-3 right-3 flex items-center justify-between text-white">
                    <span className="flex items-center gap-1 text-xs font-semibold">
                      <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                      Available
                    </span>
                    <span className="text-xs font-bold text-amber-300">
                      ★ 4.9
                    </span>
                  </div>
                </div>

                {/* Content */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-bold text-primary">{barber.name}</h3>
                    <span className="text-xs font-semibold text-slate-500">Stylist</span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2 flex-1">
                    {barber.bio || "Crafting sharp, bespoke haircuts and grooming tailored to your face structure."}
                  </p>

                  {barber.specializations.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {barber.specializations.slice(0, 2).map((spec) => (
                        <span
                          key={spec}
                          className="rounded-md bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
                        >
                          {spec}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      Individual Specialist
                    </span>
                    <span
                      className={`inline-flex items-center gap-1 text-xs font-bold ${
                        isSelected ? "text-secondary-700" : "text-slate-400 group-hover:text-primary"
                      }`}
                    >
                      {isSelected ? "Selected ✓" : "Select →"}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </StepShell>
  );
}
