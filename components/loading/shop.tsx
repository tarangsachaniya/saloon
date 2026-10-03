import { LoadingRegion, Skeleton, SkeletonText } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * Placeholders for a salon's public pages and the booking steps. They use no
 * colours of their own (blocks take the surrounding text colour), so they fit
 * whichever theme the salon has chosen.
 */

/** Service cards (a photo strip, a name, a price). `bare` skips the status region. */
export function ServiceCardsSkeleton({ count = 6, bare = false }: { count?: number; bare?: boolean }) {
  const grid = (
    <div aria-hidden="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border [border-color:color-mix(in_srgb,currentColor_12%,transparent)]">
          <Skeleton className="aspect-[16/10] w-full rounded-none" />
          <div className="space-y-3 p-5">
            <div className="flex items-start justify-between gap-3">
              <Skeleton className="h-5 w-2/3" />
              <Skeleton className="h-5 w-14" />
            </div>
            <SkeletonText lines={2} />
          </div>
        </div>
      ))}
    </div>
  );
  return bare ? grid : <LoadingRegion label="Loading salon services…">{grid}</LoadingRegion>;
}

/** A salon's page: hero (text and cover), services, team. */
export function ShopPageSkeleton() {
  return (
    <LoadingRegion label="Opening the salon…">
      <div aria-hidden="true" className="mx-auto max-w-7xl space-y-16 px-4 pb-24 pt-10 sm:px-6 lg:pt-16">
        <div className="grid items-center gap-14 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-5">
            <Skeleton className="h-7 w-44 rounded-full" />
            <Skeleton className="h-16 w-4/5 sm:h-24" />
            <SkeletonText lines={2} className="max-w-lg" />
            <div className="flex gap-3 pt-2">
              <Skeleton className="h-12 w-36 rounded-full" />
              <Skeleton className="h-12 w-28 rounded-full" />
            </div>
          </div>
          <Skeleton className="aspect-[4/3] w-full rounded-3xl" />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-9 w-48" />
          <ServiceCardsSkeleton count={6} bare />
        </div>
        <div className="space-y-6">
          <Skeleton className="h-9 w-40" />
          <div className="grid gap-5 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, i) => (
              <div key={i} className="flex items-center gap-4">
                <Skeleton className="h-16 w-16 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-32" />
                  <Skeleton className="h-3.5 w-24" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </LoadingRegion>
  );
}

/** Stylist cards in the wizard. */
export function StylistCardsSkeleton() {
  return (
    <LoadingRegion label="Loading available stylists…">
      <div aria-hidden="true" className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 4 }, (_, i) => (
          <div key={i} className="overflow-hidden rounded-2xl border [border-color:color-mix(in_srgb,currentColor_12%,transparent)]">
            <Skeleton className="aspect-[4/3] w-full rounded-none" />
            <div className="space-y-3 p-5">
              <Skeleton className="h-5 w-1/2" />
              <SkeletonText lines={2} />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** The date step: a month of day cells. */
export function CalendarSkeleton({ label = "Loading the calendar…" }: { label?: string }) {
  return (
    <LoadingRegion label={label}>
      <div aria-hidden="true" className="mx-auto max-w-md space-y-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-9 w-9 rounded-full" />
          <Skeleton className="h-6 w-36" />
          <Skeleton className="h-9 w-9 rounded-full" />
        </div>
        <div className="grid grid-cols-7 gap-2">
          {Array.from({ length: 35 }, (_, i) => (
            <Skeleton key={i} className="aspect-square rounded-xl" />
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

/** The time step: a grid of slot buttons. */
export function SlotGridSkeleton({ label = "Checking availability…" }: { label?: string }) {
  return (
    <LoadingRegion label={label}>
      <div aria-hidden="true" className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5">
        {Array.from({ length: 15 }, (_, i) => (
          <Skeleton key={i} className="h-12 rounded-xl" />
        ))}
      </div>
    </LoadingRegion>
  );
}

/** The whole booking route while it loads: stepper, a heading and the first step. */
export function BookingPageSkeleton({ label = "Preparing your booking…" }: { label?: string }) {
  return (
    <LoadingRegion label={label}>
      <div aria-hidden="true" className="mx-auto max-w-5xl space-y-8 px-4 py-8 sm:px-6">
        <div className="flex gap-2 overflow-hidden">
          {Array.from({ length: 6 }, (_, i) => (
            <Skeleton key={i} className={cn("h-10 flex-1 rounded-full", i > 2 && "hidden sm:block")} />
          ))}
        </div>
        <div className="space-y-3">
          <Skeleton className="h-9 w-64" />
          <Skeleton className="h-4 w-96 max-w-full" />
        </div>
        <ServiceCardsSkeleton count={6} bare />
      </div>
    </LoadingRegion>
  );
}
