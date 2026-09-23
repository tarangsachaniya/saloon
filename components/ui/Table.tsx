import type { HTMLAttributes, TdHTMLAttributes, ThHTMLAttributes } from "react";
import { cn } from "@/lib/utils/cn";

/**
 * Plain semantic table parts with the admin look applied.
 *
 * Deliberately NOT a "data grid" component that takes a column config: every
 * admin table here needs its own cell rendering (status pills, action buttons,
 * money alignment), and a config-driven grid would be fought at every call site.
 * These are the styled `<table>` primitives, nothing more.
 *
 * `TableScroll` wraps a table in its own horizontal scroller so a wide table
 * never makes the PAGE scroll sideways on a phone. Tables that would be
 * unreadable when squashed should be hidden under `sm` and paired with a card
 * list instead — see `components/admin/AppointmentList.tsx`.
 */

export function TableScroll({
  className,
  ...props
}: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "w-full overflow-x-auto rounded-card border border-slate-200 bg-surface shadow-card",
        className,
      )}
      {...props}
    />
  );
}

export function Table({
  className,
  ...props
}: HTMLAttributes<HTMLTableElement>) {
  return (
    <table
      className={cn("w-full border-collapse text-left text-sm", className)}
      {...props}
    />
  );
}

export function TableHead({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead
      className={cn("border-b border-slate-200 bg-surface-muted", className)}
      {...props}
    />
  );
}

export function TableBody({
  className,
  ...props
}: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody className={cn("divide-y divide-slate-100", className)} {...props} />;
}

export interface TableRowProps extends HTMLAttributes<HTMLTableRowElement> {
  /** Dims the row — used for cancelled / inactive records. */
  muted?: boolean;
}

export function TableRow({ className, muted, ...props }: TableRowProps) {
  return (
    <tr
      className={cn(
        "transition-colors hover:bg-secondary-50/40",
        muted && "opacity-60",
        className,
      )}
      {...props}
    />
  );
}

export function TableHeaderCell({
  className,
  ...props
}: ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th
      scope="col"
      className={cn(
        "whitespace-nowrap px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500",
        className,
      )}
      {...props}
    />
  );
}

export function TableCell({
  className,
  ...props
}: TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={cn("px-4 py-3 align-middle text-primary", className)} {...props} />
  );
}
