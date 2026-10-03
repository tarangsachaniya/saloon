import type { CSSProperties, ReactNode } from "react";

import { cn } from "@/lib/utils/cn";

/**
 * Loading placeholders. A `Skeleton` is a decorative block (hidden from
 * assistive tech); wrap a group of them in `LoadingRegion` so screen readers
 * hear one "Loading…" message instead of silence.
 */

export function Skeleton({ className, style }: { className?: string; style?: CSSProperties }) {
  return <div aria-hidden="true" className={cn("skeleton", className)} style={style} />;
}

/** A paragraph of text lines; the last one is shorter, like real text. */
export function SkeletonText({ lines = 3, className }: { lines?: number; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("space-y-2.5", className)}>
      {Array.from({ length: lines }, (_, i) => (
        <Skeleton key={i} className="h-3.5" style={{ width: i === lines - 1 && lines > 1 ? "62%" : "100%" }} />
      ))}
    </div>
  );
}

/** Marks a region as busy and gives it an accessible label. */
export function LoadingRegion({
  label = "Loading…",
  className,
  children,
}: {
  label?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div role="status" aria-busy="true" aria-live="polite" className={className}>
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}
