"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { getServices } from "@/lib/api";
import { useBooking } from "@/lib/booking/BookingContext";
import { useSalon } from "@/lib/salon/SalonContext";
import type { Service } from "@/lib/booking/types";
import { Badge, EmptyState, Loader } from "@/components/ui";
import { formatPrice } from "@/lib/utils/format";
import { formatDuration } from "@/lib/utils/time";
import { getServiceImageUrl } from "@/lib/utils/barberImages";
import { StepError, StepShell } from "./StepShell";
import { useAsync } from "./useAsync";

export function ServiceSelector({ onSelected }: { onSelected: () => void }) {
  const { service: selected, selectService } = useBooking();
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const { slug } = useSalon();

  const { data, error, isLoading, reload } = useAsync(
    (signal) => getServices(slug, { signal }),
    [slug],
  );

  const categories = useMemo(() => {
    if (!data) return [];
    const set = new Set<string>();
    for (const item of data) {
      if (item.category) set.add(item.category);
    }
    return Array.from(set);
  }, [data]);

  const filteredServices = useMemo(() => {
    if (!data) return [];
    if (activeCategory === "all") return data;
    return data.filter((s) => s.category?.toLowerCase() === activeCategory.toLowerCase());
  }, [data, activeCategory]);

  function choose(service: Service) {
    selectService(service);
    onSelected();
  }

  return (
    <StepShell
      title="Choose a service"
      description="Select from our range of bespoke haircutting, beard grooming, and relaxation services."
    >
      {/* Category filter pills */}
      {categories.length > 1 && (
        <div className="flex flex-wrap items-center gap-2 pb-1">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            aria-pressed={activeCategory === "all"}
            className={`min-h-9 rounded-full px-3.5 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary text-xs font-bold transition-all ${
              activeCategory === "all"
                ? "bg-primary text-white shadow-sm scale-105"
                : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            All Services ({data?.length ?? 0})
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              aria-pressed={activeCategory.toLowerCase() === cat.toLowerCase()}
              className={`min-h-9 rounded-full px-3.5 py-1.5 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary text-xs font-bold transition-all ${
                activeCategory.toLowerCase() === cat.toLowerCase()
                  ? "bg-primary text-white shadow-sm scale-105"
                  : "bg-white border border-slate-200 text-slate-600 hover:bg-slate-50"
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      )}

      {isLoading && <Loader label="Loading salon services…" />}

      {error && <StepError message={error} onRetry={reload} />}

      {data && data.length === 0 && (
        <EmptyState
          title="No services available"
          description="The salon has not published any bookable services yet. Please call us to arrange your appointment."
        />
      )}

      {filteredServices.length > 0 && (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {filteredServices.map((service) => {
            const isSelected = selected?.id === service.id;
            const imgUrl = getServiceImageUrl(service.category, service.name);

            return (
              <button
                key={service.id}
                type="button"
                onClick={() => choose(service)}
                aria-pressed={isSelected}
                className={`group relative flex flex-col overflow-hidden rounded-2xl border text-left transition-all duration-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-secondary ${
                  isSelected
                    ? "border-secondary bg-white ring-2 ring-secondary/40 shadow-card-hover"
                    : "border-slate-200 bg-white hover:border-secondary hover:shadow-card-hover hover:-translate-y-1"
                }`}
              >
                {/* Photo Header */}
                <div className="relative aspect-[16/10] w-full overflow-hidden bg-slate-100">
                  <Image
                    src={imgUrl}
                    alt={service.name}
                    fill
                    className="object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-slate-950/70 via-transparent to-transparent" />

                  {/* Top-right duration badge */}
                  <div className="absolute top-2.5 right-2.5">
                    <span className="rounded-full bg-slate-900/85 px-2.5 py-0.5 text-xs font-bold text-white backdrop-blur-md">
                      {formatDuration(service.durationMinutes)}
                    </span>
                  </div>

                  {/* Bottom category tag */}
                  {service.category && (
                    <div className="absolute bottom-2.5 left-3">
                      <span className="rounded-md bg-secondary/90 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wider text-white shadow-sm">
                        {service.category}
                      </span>
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex flex-1 flex-col p-5">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-base font-bold text-primary group-hover:text-secondary-700 transition-colors">
                      {service.name}
                    </h3>
                    <span className="shrink-0 text-base font-extrabold text-primary">
                      {formatPrice(service.price)}
                    </span>
                  </div>

                  <p className="mt-2 text-xs leading-relaxed text-slate-600 line-clamp-2 flex-1">
                    {service.description || "Precision styling and grooming crafted with luxury salon products."}
                  </p>

                  <div className="mt-5 pt-3.5 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-xs font-semibold text-slate-500">
                      ~{service.durationMinutes} minutes
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
