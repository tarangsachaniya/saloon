import { cn } from "@/lib/utils/cn";

export type SpinnerSize = "sm" | "md" | "lg";

const SIZES: Record<SpinnerSize, string> = {
  sm: "h-4 w-4 border-2",
  md: "h-6 w-6 border-2",
  lg: "h-9 w-9 border-[3px]",
};

export interface SpinnerProps {
  size?: SpinnerSize;
  className?: string;
  /** Screen-reader label. */
  label?: string;
}

/** Indeterminate loading spinner. Inherits `currentColor`. */
export function Spinner({
  size = "md",
  className,
  label = "Loading",
}: SpinnerProps) {
  return (
    <span
      role="status"
      aria-live="polite"
      className={cn(
        "inline-block animate-spin rounded-full border-current border-r-transparent align-[-0.125em]",
        SIZES[size],
        className,
      )}
    >
      <span className="sr-only">{label}</span>
    </span>
  );
}

export interface LoaderProps {
  /** Message shown beneath the spinner. */
  label?: string;
  className?: string;
}

/** Centred block loader for page/section level loading states. */
export function Loader({ label = "Loading…", className }: LoaderProps) {
  return (
    <div
      className={cn(
        "flex w-full flex-col items-center justify-center gap-3 py-12 text-primary/70",
        className,
      )}
    >
      <Spinner size="lg" label={label} />
      <p className="text-sm font-medium">{label}</p>
    </div>
  );
}
