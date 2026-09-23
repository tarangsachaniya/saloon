import type { ReactNode } from "react";
import { Button, EmptyState } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * Shared header for an admin screen: title, one line of context, and the
 * screen's primary action(s) on the right. Keeps all six pages aligned without
 * each re-inventing its own heading markup.
 */
export function PageHeader({
  title,
  description,
  actions,
  className,
}: {
  title: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "mb-5 flex flex-wrap items-start justify-between gap-x-4 gap-y-3",
        className,
      )}
    >
      <div className="min-w-0">
        <h1 className="text-xl font-extrabold sm:text-2xl">{title}</h1>
        {description && (
          <p className="mt-1 text-sm text-slate-600">{description}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
      )}
    </header>
  );
}

/**
 * Failure state for a screen whose data fetch threw. Always offers a retry —
 * the admin equivalent of M5's `StepError`; a dead end here means a front desk
 * that cannot see its own diary.
 */
export function LoadError({
  message,
  onRetry,
  title,
}: {
  message: string;
  onRetry: () => void;
  title?: string;
}) {
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

/** Inline form-level error line, styled consistently across every dialog. */
export function FormError({ message }: { message: string | null }) {
  if (!message) return null;
  return (
    <p
      role="alert"
      className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm font-semibold text-danger"
    >
      {message}
    </p>
  );
}
