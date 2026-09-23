import type { ReactNode } from "react";
import { Button, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * Shared chrome for a wizard step: a heading, an optional sub-line and the step
 * body. Keeps the six step components visually identical without each one
 * re-inventing its own header markup.
 */

export interface StepShellProps {
  title: string;
  description?: ReactNode;
  /** Rendered at the top-right of the header (e.g. a count, a "change" link). */
  aside?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function StepShell({
  title,
  description,
  aside,
  children,
  className,
}: StepShellProps) {
  return (
    <section className={cn("flex flex-col gap-4 sm:gap-5", className)}>
      <header className="flex flex-wrap items-start justify-between gap-x-4 gap-y-1">
        <div className="min-w-0">
          <h2 className="text-lg font-extrabold sm:text-xl">{title}</h2>
          {description && (
            <p className="mt-1 text-sm text-slate-600">{description}</p>
          )}
        </div>
        {aside && <div className="shrink-0">{aside}</div>}
      </header>
      {children}
    </section>
  );
}

export interface StepErrorProps {
  message: string;
  onRetry: () => void;
  /** Overrides the default "We couldn't load this" headline. */
  title?: string;
}

/**
 * Failure state for any step whose data fetch threw. Always offers a retry —
 * a dead end here is a lost booking.
 */
export function StepError({ message, onRetry, title }: StepErrorProps) {
  return (
    <EmptyState
      title={title ?? "We couldn't load this"}
      description={message}
      className="border-danger/30 bg-red-50/40"
      action={
        <Button variant="outline" onClick={onRetry}>
          Try again
        </Button>
      }
    />
  );
}
