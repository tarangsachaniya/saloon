"use client";

import type { ReactNode } from "react";
import { Card } from "@/components/ui";
import { cn } from "@/lib/utils/cn";

/**
 * A `Card` that is genuinely a button.
 *
 * The UI kit's `Card` renders a `<div>`, and `interactive` only styles hover.
 * Rather than bolt `role="button"` + a hand-rolled keydown handler onto a div
 * (worse keyboard and screen-reader behaviour than the real thing), the card is
 * wrapped in a native `<button>`: Enter/Space, focus order and the disabled
 * state all come for free, and the focus ring lives on the focusable element.
 */

export interface SelectableCardProps {
  selected?: boolean;
  disabled?: boolean;
  onClick: () => void;
  /** Announced label when the visible content is not a plain string. */
  ariaLabel?: string;
  children: ReactNode;
  className?: string;
}

export function SelectableCard({
  selected = false,
  disabled = false,
  onClick,
  ariaLabel,
  children,
  className,
}: SelectableCardProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      aria-label={ariaLabel}
      className={cn(
        "w-full rounded-card text-left",
        "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
        "disabled:cursor-not-allowed disabled:opacity-60",
        className,
      )}
    >
      <Card interactive={!disabled} selected={selected} className="h-full">
        {children}
      </Card>
    </button>
  );
}
