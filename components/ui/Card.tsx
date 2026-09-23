import type { HTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils/cn";

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  /** Adds hover elevation — use for clickable service/barber tiles. */
  interactive?: boolean;
  /** Renders the selected state (booking wizard selections). */
  selected?: boolean;
}

export function Card({
  className,
  interactive = false,
  selected = false,
  ...props
}: CardProps) {
  return (
    <div
      className={cn(
        "rounded-card border bg-surface shadow-card",
        "transition-all duration-150",
        selected
          ? "border-secondary ring-2 ring-secondary/30"
          : "border-slate-200",
        interactive &&
          "cursor-pointer hover:-translate-y-0.5 hover:border-secondary hover:shadow-card-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        className,
      )}
      {...props}
    />
  );
}

export function CardHeader({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("flex flex-col gap-1 p-4 sm:p-5", className)}
      {...props}
    />
  );
}

export function CardTitle({
  className,
  children,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) {
  return (
    <h3
      className={cn(
        "text-base font-bold leading-tight text-primary sm:text-lg",
        className,
      )}
      {...props}
    >
      {children}
    </h3>
  );
}

export function CardDescription({
  className,
  ...props
}: HTMLAttributes<HTMLParagraphElement>) {
  return (
    <p className={cn("text-sm text-slate-600", className)} {...props} />
  );
}

export function CardContent({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("p-4 pt-0 sm:p-5 sm:pt-0", className)} {...props} />;
}

export function CardFooter({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-wrap items-center gap-3 border-t border-slate-100 p-4 sm:p-5",
        className,
      )}
      {...props}
    />
  );
}

export interface EmptyStateProps {
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  icon?: ReactNode;
  className?: string;
}

/** Consistent "nothing here" block for lists (no services, no slots, etc.). */
export function EmptyState({
  title,
  description,
  action,
  icon,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-2 rounded-card border border-dashed border-slate-300 bg-surface-muted px-6 py-10 text-center",
        className,
      )}
    >
      {icon && <div className="text-slate-400">{icon}</div>}
      <p className="text-base font-semibold text-primary">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-slate-600">{description}</p>
      )}
      {action && <div className="mt-2">{action}</div>}
    </div>
  );
}
