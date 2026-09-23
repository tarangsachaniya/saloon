import { cn } from "@/lib/utils/cn";
import type { AppointmentStatus } from "@/lib/booking/types";

export type BadgeTone =
  | "neutral"
  | "primary"
  | "secondary"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "info";

const TONES: Record<BadgeTone, string> = {
  neutral: "bg-slate-100 text-slate-700 ring-slate-200",
  primary: "bg-primary-50 text-primary-700 ring-primary-200",
  secondary: "bg-secondary-50 text-secondary-700 ring-secondary-200",
  accent: "bg-accent-soft text-accent ring-accent/20",
  success: "bg-emerald-50 text-success ring-emerald-200",
  warning: "bg-amber-50 text-warning ring-amber-200",
  danger: "bg-red-50 text-danger ring-red-200",
  info: "bg-blue-50 text-info ring-blue-200",
};

export interface BadgeProps {
  tone?: BadgeTone;
  className?: string;
  children: React.ReactNode;
}

export function Badge({ tone = "neutral", className, children }: BadgeProps) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 whitespace-nowrap rounded-full px-2.5 py-1",
        "text-xs font-semibold ring-1 ring-inset",
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}

/** Tone + human label for each appointment status. Shared by M6's admin views. */
export const APPOINTMENT_STATUS_META: Record<
  AppointmentStatus,
  { label: string; tone: BadgeTone }
> = {
  PENDING: { label: "Pending", tone: "warning" },
  CONFIRMED: { label: "Confirmed", tone: "info" },
  ARRIVED: { label: "Arrived", tone: "secondary" },
  IN_PROGRESS: { label: "In progress", tone: "primary" },
  COMPLETED: { label: "Completed", tone: "success" },
  CANCELLED: { label: "Cancelled", tone: "neutral" },
  NO_SHOW: { label: "No show", tone: "danger" },
};

export interface StatusPillProps {
  status: AppointmentStatus;
  className?: string;
}

/** Colour-coded pill for an appointment status. */
export function StatusPill({ status, className }: StatusPillProps) {
  const meta = APPOINTMENT_STATUS_META[status] ?? {
    label: status,
    tone: "neutral" as const,
  };
  return (
    <Badge tone={meta.tone} className={className}>
      <span
        aria-hidden
        className="h-1.5 w-1.5 rounded-full bg-current opacity-70"
      />
      {meta.label}
    </Badge>
  );
}
