import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils/cn";
import { Spinner } from "./Spinner";

export type ButtonVariant =
  | "primary"
  | "secondary"
  | "outline"
  | "ghost"
  | "danger";
export type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary:
    "bg-primary text-primary-foreground hover:bg-secondary active:bg-secondary-600 focus-visible:outline-primary",
  secondary:
    "bg-secondary text-secondary-foreground hover:bg-secondary-600 active:bg-secondary-700 focus-visible:outline-secondary",
  outline:
    "border border-primary/25 bg-surface text-primary hover:border-secondary hover:bg-secondary-50 hover:text-secondary-700 active:bg-secondary-100 focus-visible:outline-secondary",
  ghost:
    "bg-transparent text-primary hover:bg-primary-50 active:bg-primary-100 focus-visible:outline-primary",
  danger:
    "bg-danger text-white hover:bg-red-800 active:bg-red-900 focus-visible:outline-danger",
};

const SIZES: Record<ButtonSize, string> = {
  // min-h values keep every control at/above the 44px mobile touch target.
  sm: "min-h-9 gap-1.5 px-3 py-1.5 text-sm",
  md: "min-h-11 gap-2 px-4 py-2.5 text-sm sm:text-base",
  lg: "min-h-12 gap-2 px-6 py-3 text-base",
};

/**
 * The class string behind `<Button>`, exposed so that `next/link` anchors can
 * be styled identically without wrapping a button in a link (which is invalid
 * HTML and breaks keyboard/middle-click behaviour).
 *
 *   <Link href="/book" className={buttonClasses({ size: "lg" })}>Book now</Link>
 */
export function buttonClasses({
  variant = "primary",
  size = "md",
  fullWidth = false,
  className,
}: {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
} = {}): string {
  return cn(
    "inline-flex items-center justify-center rounded-lg font-semibold",
    "transition-colors duration-150",
    "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2",
    "disabled:cursor-not-allowed disabled:opacity-55",
    VARIANTS[variant],
    SIZES[size],
    fullWidth && "w-full",
    className,
  );
}

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  /** Shows a spinner and disables the button. */
  isLoading?: boolean;
  /** Stretch to the container width — the default on mobile wizard steps. */
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  function Button(
    {
      className,
      variant = "primary",
      size = "md",
      isLoading = false,
      fullWidth = false,
      leftIcon,
      rightIcon,
      disabled,
      children,
      type = "button",
      ...props
    },
    ref,
  ) {
    return (
      <button
        ref={ref}
        type={type}
        disabled={disabled || isLoading}
        aria-busy={isLoading || undefined}
        className={buttonClasses({ variant, size, fullWidth, className })}
        {...props}
      >
        {isLoading ? (
          <Spinner size="sm" className="shrink-0" />
        ) : (
          leftIcon && <span className="shrink-0">{leftIcon}</span>
        )}
        {children}
        {!isLoading && rightIcon && <span className="shrink-0">{rightIcon}</span>}
      </button>
    );
  },
);
