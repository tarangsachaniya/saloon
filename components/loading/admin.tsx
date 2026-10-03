import { LoadingRegion, Skeleton } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * Placeholders for the salon dashboard. They copy the real screens' shapes
 * (header, cards, table rows) so the page does not jump when data arrives.
 * The `*Skeleton` bodies go under a page's own `PageHeader`; `AdminPageSkeleton`
 * is the whole screen, used by route-level `loading.tsx`.
 */

const CARD = "rounded-card border border-slate-200 bg-surface shadow-card";

export function AdminHeaderSkeleton({ actions = 1 }: { actions?: number }) {
  return (
    <div aria-hidden="true" className="mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="space-y-2.5">
        <Skeleton className="h-7 w-44 sm:h-8" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>
      <div className="flex gap-2">
        {Array.from({ length: actions }, (_, i) => (
          <Skeleton key={i} className="h-10 w-28 rounded-lg" />
        ))}
      </div>
    </div>
  );
}

/** A filter bar: a few inputs side by side. */
export function AdminToolbarSkeleton({ fields = 3 }: { fields?: number }) {
  return (
    <div aria-hidden="true" className={cn(CARD, "mb-5 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-3")}>
      {Array.from({ length: fields }, (_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-3.5 w-16" />
          <Skeleton className="h-10 w-full rounded-lg" />
        </div>
      ))}
    </div>
  );
}

export function AdminCardGridSkeleton({ count = 6, label = "Loading…" }: { count?: number; label?: string }) {
  return (
    <LoadingRegion label={label}>
      <ul aria-hidden="true" className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: count }, (_, i) => (
          <li key={i} className={cn(CARD, "space-y-4 p-5")}>
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-5 w-36" />
                <Skeleton className="h-3.5 w-24" />
              </div>
              <Skeleton className="h-6 w-16 rounded-full" />
            </div>
            <Skeleton className="h-3.5 w-full" />
            <Skeleton className="h-3.5 w-4/5" />
            <div className="flex gap-2 pt-1">
              <Skeleton className="h-9 w-24 rounded-lg" />
              <Skeleton className="h-9 w-24 rounded-lg" />
            </div>
          </li>
        ))}
      </ul>
    </LoadingRegion>
  );
}

/** Rows with an avatar, two lines and a status pill: appointments, clients. */
export function AdminListSkeleton({ rows = 6, label = "Loading…" }: { rows?: number; label?: string }) {
  return (
    <LoadingRegion label={label}>
      <div aria-hidden="true" className={cn(CARD, "divide-y divide-slate-100 overflow-hidden")}>
        {Array.from({ length: rows }, (_, i) => (
          <div key={i} className="flex items-center gap-4 p-4">
            <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-4 w-40 max-w-full" />
              <Skeleton className="h-3.5 w-56 max-w-full" />
            </div>
            <Skeleton className="hidden h-6 w-20 rounded-full sm:block" />
            <Skeleton className="h-9 w-20 rounded-lg" />
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

export function AdminTableSkeleton({ rows = 7, cols = 5, label = "Loading…" }: { rows?: number; cols?: number; label?: string }) {
  return (
    <LoadingRegion label={label}>
      <div aria-hidden="true" className={cn(CARD, "overflow-hidden")}>
        <div className="flex gap-6 border-b border-slate-200 bg-slate-50 px-4 py-3.5">
          {Array.from({ length: cols }, (_, i) => (
            <Skeleton key={i} className="h-3.5 flex-1" />
          ))}
        </div>
        {Array.from({ length: rows }, (_, r) => (
          <div key={r} className="flex items-center gap-6 border-b border-slate-100 px-4 py-4 last:border-b-0">
            {Array.from({ length: cols }, (_, c) => (
              <Skeleton key={c} className={cn("h-4 flex-1", c === 0 && "max-w-[30%]")} />
            ))}
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

/** Stat tiles (today's numbers) followed by a list. */
export function AdminDashboardSkeleton({ label = "Loading…" }: { label?: string }) {
  return (
    <LoadingRegion label={label}>
      <div aria-hidden="true" className="space-y-5">
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className={cn(CARD, "space-y-3 p-4")}>
              <Skeleton className="h-3.5 w-20" />
              <Skeleton className="h-8 w-24" />
            </div>
          ))}
        </div>
        <div className={cn(CARD, "divide-y divide-slate-100 overflow-hidden")}>
          {Array.from({ length: 4 }, (_, i) => (
            <div key={i} className="flex items-center gap-4 p-4">
              <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
              <div className="min-w-0 flex-1 space-y-2">
                <Skeleton className="h-4 w-40 max-w-full" />
                <Skeleton className="h-3.5 w-56 max-w-full" />
              </div>
              <Skeleton className="h-9 w-20 rounded-lg" />
            </div>
          ))}
        </div>
      </div>
    </LoadingRegion>
  );
}

export function AdminFormSkeleton({ sections = 3, label = "Loading…" }: { sections?: number; label?: string }) {
  return (
    <LoadingRegion label={label}>
      <div aria-hidden="true" className="space-y-5">
        {Array.from({ length: sections }, (_, s) => (
          <div key={s} className={cn(CARD, "space-y-4 p-5")}>
            <Skeleton className="h-5 w-40" />
            <Skeleton className="h-3.5 w-72 max-w-full" />
            <div className="grid gap-4 sm:grid-cols-2">
              {Array.from({ length: 4 }, (_, i) => (
                <div key={i} className="space-y-2">
                  <Skeleton className="h-3.5 w-24" />
                  <Skeleton className="h-10 w-full rounded-lg" />
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </LoadingRegion>
  );
}

type Variant = "cards" | "list" | "table" | "dashboard" | "form";

/** The whole dashboard screen (header + body): the route-level fallback. */
export function AdminPageSkeleton({ variant = "list", label = "Loading…" }: { variant?: Variant; label?: string }) {
  return (
    <div className="text-primary">
      <AdminHeaderSkeleton />
      {variant === "cards" && <AdminCardGridSkeleton label={label} />}
      {variant === "list" && (
        <>
          <AdminToolbarSkeleton />
          <AdminListSkeleton label={label} />
        </>
      )}
      {variant === "table" && <AdminTableSkeleton label={label} />}
      {variant === "dashboard" && <AdminDashboardSkeleton label={label} />}
      {variant === "form" && <AdminFormSkeleton label={label} />}
    </div>
  );
}
