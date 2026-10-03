import { LoadingRegion, Skeleton, SkeletonText } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * Placeholders for the public marketing site and the account pages (plum on
 * cream, chunky outlines). They render inside the real nav and footer.
 */

const STICKER = "rounded-[2rem] border-[3px] border-plum bg-white shadow-[6px_6px_0_0_#3b1a3f]";

/** A butter hero band with a heading and a line of copy. */
export function HeroBandSkeleton({ className }: { className?: string }) {
  return (
    <section aria-hidden="true" className={cn("bg-butter pb-16 pt-32 sm:pb-20 sm:pt-40", className)}>
      <div className="mx-auto max-w-7xl space-y-5 px-5 sm:px-8">
        <Skeleton className="h-8 w-36 rounded-full" />
        <Skeleton className="h-14 w-4/5 max-w-2xl sm:h-20" />
        <Skeleton className="h-5 w-3/5 max-w-xl" />
      </div>
    </section>
  );
}

export function SalonGridSkeleton({ count = 6 }: { count?: number }) {
  return (
    <ul aria-hidden="true" className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }, (_, i) => (
        <li key={i} className={cn(STICKER, "p-3")}>
          <Skeleton className="aspect-[4/3] w-full rounded-[1.4rem]" />
          <div className="space-y-3 p-4">
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-3.5 w-1/2" />
          </div>
        </li>
      ))}
    </ul>
  );
}

/** /salons: hero band with a search box, then the salon cards. */
export function SalonsPageSkeleton() {
  return (
    <LoadingRegion label="Loading salons…" className="text-plum">
      <HeroBandSkeleton />
      <div aria-hidden="true" className="mx-auto max-w-7xl px-5 py-14 sm:px-8">
        <SalonGridSkeleton />
      </div>
    </LoadingRegion>
  );
}

/** Home and other marketing pages: a hero and a few feature blocks. */
export function MarketingPageSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <LoadingRegion label={label} className="text-plum">
      <HeroBandSkeleton />
      <div aria-hidden="true" className="mx-auto grid max-w-7xl gap-8 px-5 py-16 sm:grid-cols-3 sm:px-8">
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className={cn(STICKER, "space-y-4 p-6")}>
            <Skeleton className="h-12 w-12 rounded-2xl" />
            <Skeleton className="h-6 w-2/3" />
            <SkeletonText lines={3} />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Legal and policy pages: a title and long-form text. */
export function ProsePageSkeleton({ label = "Loading…", spaced = true }: { label?: string; spaced?: boolean }) {
  return (
    <LoadingRegion label={label} className={cn("text-plum", spaced && "pt-32 sm:pt-40")}>
      <div aria-hidden="true" className="mx-auto max-w-3xl space-y-8 px-5 pb-20 sm:px-8">
        <Skeleton className="h-12 w-3/4" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-4">
            <Skeleton className="h-6 w-1/3" />
            <SkeletonText lines={4} />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Cards for a customer's appointments. */
export function BookingCardsSkeleton({ count = 3 }: { count?: number }) {
  return (
    <div aria-hidden="true" className="space-y-5">
      {Array.from({ length: count }, (_, i) => (
        <div key={i} className={cn(STICKER, "space-y-3 p-5")}>
          <div className="flex items-center justify-between">
            <Skeleton className="h-6 w-24 rounded-full" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-6 w-2/3" />
          <Skeleton className="h-3.5 w-1/2" />
          <div className="flex gap-3 pt-1">
            <Skeleton className="h-10 w-28 rounded-full" />
            <Skeleton className="h-10 w-28 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
}

/** My account: profile card and a list of bookings. */
export function AccountSkeleton() {
  return (
    <LoadingRegion label="Loading your account…" className="text-plum">
      <div aria-hidden="true" className="mx-auto max-w-4xl space-y-8 px-5 pb-20 pt-32 sm:px-8 sm:pt-40">
        <Skeleton className="h-12 w-64" />
        <div className={cn(STICKER, "p-6")}>
          <div className="flex items-center gap-4">
            <Skeleton className="h-16 w-16 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-5 w-40" />
              <Skeleton className="h-3.5 w-52" />
            </div>
          </div>
        </div>
        <BookingCardsSkeleton count={2} />
      </div>
    </LoadingRegion>
  );
}

/** Platform operator screens: a title row and salon-style cards. */
export function PlatformListSkeleton({ label = "Loading…", header = true }: { label?: string; header?: boolean }) {
  return (
    <LoadingRegion label={label} className="text-plum">
      <div aria-hidden="true" className={cn("space-y-8", !header && "mt-10")}>
        {header && (
          <>
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="space-y-3">
                <Skeleton className="h-12 w-56" />
                <Skeleton className="h-4 w-72 max-w-full" />
              </div>
              <Skeleton className="h-11 w-40 rounded-full" />
            </div>
            <Skeleton className="h-12 w-full max-w-md rounded-full" />
          </>
        )}
        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="space-y-3 rounded-[2rem] border-[3px] border-plum bg-white p-5">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="h-3.5 w-1/2" />
              <div className="flex gap-2 pt-1">
                <Skeleton className="h-6 w-20 rounded-full" />
                <Skeleton className="h-6 w-16 rounded-full" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

/** One salon's detail page for the platform operator: a title and a few panels. */
export function PlatformDetailSkeleton() {
  return (
    <LoadingRegion label="Loading salon…" className="text-plum">
      <div aria-hidden="true" className="space-y-8">
        <div className="space-y-3">
          <Skeleton className="h-12 w-72 max-w-full" />
          <Skeleton className="h-4 w-56" />
        </div>
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="space-y-4 rounded-[2rem] border-[3px] border-plum bg-white p-6">
            <Skeleton className="h-6 w-44" />
            <SkeletonText lines={3} />
            <div className="flex gap-3">
              <Skeleton className="h-10 w-32 rounded-full" />
              <Skeleton className="h-10 w-32 rounded-full" />
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}
