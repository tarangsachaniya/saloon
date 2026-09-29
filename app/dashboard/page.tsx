"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { cn } from "@/lib/utils/cn";
import { AppointmentTimeline } from "@/components/admin/AppointmentList";
import { CalendarIcon, RefreshIcon } from "@/components/admin/icons";
import { LoadError, PageHeader } from "@/components/admin/PageHeader";
import {
  Badge,
  Button,
  buttonClasses,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  EmptyState,
  Loader,
  StatusPill,
} from "@/components/ui";
import { getAdminAppointments } from "@/lib/api";
import { isRevenueBearing } from "@/lib/admin/transitions";
import { useAdminData } from "@/lib/admin/useAdminData";
import {
  APPOINTMENT_STATUSES,
  type Appointment,
  type AppointmentStatus,
} from "@/lib/booking/types";
import { useAuth } from "@/lib/auth/useAuth";
import { formatPrice } from "@/lib/utils/format";
import { formatTime12h, startOfToday, toDateString } from "@/lib/utils/time";
import { formatAdminDate } from "@/lib/admin/format";

/**
 * The Today screen — the one the front desk leaves open all day.
 *
 * Deliberately answers four questions and no more: how busy is today, what is
 * still to come, what has the chair earned, and what is the running order. Any
 * filtering, editing or rescheduling is one tap away on the diary; putting it
 * here too would turn the glance-able screen into a second diary.
 */

interface DayStats {
  total: number;
  /** Excludes cancellations and no-shows — the bookings that still count. */
  live: number;
  completed: number;
  remaining: number;
  revenue: number;
  byStatus: Map<AppointmentStatus, number>;
}

function summarise(appointments: Appointment[], nowMinutes: number): DayStats {
  const byStatus = new Map<AppointmentStatus, number>();
  let live = 0;
  let completed = 0;
  let remaining = 0;
  let revenue = 0;

  for (const appointment of appointments) {
    byStatus.set(
      appointment.status,
      (byStatus.get(appointment.status) ?? 0) + 1,
    );

    if (!isRevenueBearing(appointment.status)) continue;

    live += 1;
    revenue += Number.isFinite(appointment.price) ? appointment.price : 0;

    if (appointment.status === "COMPLETED") completed += 1;
    else if (appointment.endTime > nowMinutes) remaining += 1;
  }

  return { total: appointments.length, live, completed, remaining, revenue, byStatus };
}

function StatTile({
  label,
  value,
  hint,
  icon,
  tone = "primary",
}: {
  label: string;
  value: string;
  hint?: string;
  icon?: React.ReactNode;
  tone?: "primary" | "secondary" | "accent" | "success";
}) {
  const toneClasses = {
    primary: "border-primary-100 bg-white text-primary",
    secondary: "border-secondary-100 bg-white text-secondary-800",
    accent: "border-amber-100 bg-white text-amber-700",
    success: "border-emerald-100 bg-white text-emerald-800",
  };

  const iconBgClasses = {
    primary: "bg-primary-50 text-primary",
    secondary: "bg-secondary-50 text-secondary",
    accent: "bg-amber-50 text-amber-600",
    success: "bg-emerald-50 text-emerald-600",
  };

  return (
    <Card className={cn("p-5 rounded-2xl shadow-card border transition-all hover:shadow-card-hover", toneClasses[tone])}>
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
          {label}
        </p>
        {icon && (
          <span className={cn("flex h-8 w-8 items-center justify-center rounded-xl", iconBgClasses[tone])}>
            {icon}
          </span>
        )}
      </div>
      <p className="mt-2 text-2xl sm:text-3xl font-extrabold tabular-nums text-primary">
        {value}
      </p>
      {hint && <p className="mt-1 text-xs text-slate-500 font-medium">{hint}</p>}
    </Card>
  );
}

export default function AdminDashboardPage() {
  const { user } = useAuth();

  const today = useMemo(() => startOfToday(), []);
  const todayString = useMemo(() => toDateString(today), [today]);

  /*
   * "Now" as minutes-since-midnight, captured once per load rather than ticking:
   * the remaining-appointments count must not silently change under the admin's
   * eyes, and a re-render every second for a number that moves every 30 minutes
   * would be pure waste. The refresh button re-captures it.
   */
  const [nowStamp, setNowStamp] = useState(() => Date.now());
  const nowMinutes = useMemo(() => {
    const now = new Date(nowStamp);
    return now.getHours() * 60 + now.getMinutes();
  }, [nowStamp]);

  const { data, error, isLoading, isRefreshing, refresh } = useAdminData(
    (signal) => getAdminAppointments({ date: todayString }, { signal }),
    [todayString],
  );

  // Memoised rather than `data ?? []` inline: a fresh array literal on every
  // render would invalidate both `useMemo`s below on every render.
  const appointments = useMemo(() => data ?? [], [data]);
  const stats = useMemo(
    () => summarise(appointments, nowMinutes),
    [appointments, nowMinutes],
  );

  const nextUp = useMemo(
    () =>
      appointments.find(
        (appointment) =>
          isRevenueBearing(appointment.status) &&
          appointment.status !== "COMPLETED" &&
          appointment.endTime > nowMinutes,
      ) ?? null,
    [appointments, nowMinutes],
  );

  function reload() {
    setNowStamp(Date.now());
    refresh();
  }

  const greeting = user?.firstName ? `Hello ${user.firstName}.` : "";

  return (
    <>
      <PageHeader
        title="Today"
        description={`${greeting} ${formatAdminDate(today)}`.trim()}
        actions={
          <>
            <Button
              variant="outline"
              onClick={reload}
              isLoading={isRefreshing}
              leftIcon={<RefreshIcon className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Link
              href="/dashboard/appointments"
              className={buttonClasses({ variant: "primary" })}
            >
              <CalendarIcon className="h-4 w-4" />
              Open diary
            </Link>
          </>
        }
      />

      {isLoading && <Loader label="Loading today's diary…" />}

      {error && !data && <LoadError message={error} onRetry={refresh} />}

      {data && (
        <div className="flex flex-col gap-5">
          <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
            <StatTile
              label="Live Bookings"
              value={String(stats.live)}
              tone="primary"
              hint={
                stats.total === stats.live
                  ? "Booked for today"
                  : `${stats.total - stats.live} cancelled / no-show`
              }
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
            />
            <StatTile
              label="Still to Come"
              value={String(stats.remaining)}
              tone="secondary"
              hint={
                nextUp
                  ? `Next at ${formatTime12h(nextUp.startTime)}`
                  : "All done for today"
              }
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatTile
              label="Completed"
              value={String(stats.completed)}
              tone="success"
              hint={
                stats.live > 0
                  ? `of ${stats.live} scheduled`
                  : "no bookings yet"
              }
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
            <StatTile
              label="Expected Revenue"
              value={formatPrice(stats.revenue)}
              tone="accent"
              hint="excludes cancellations"
              icon={
                <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              }
            />
          </div>

          {/* Quick Management Shortcuts */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <Link
              href="/dashboard/appointments"
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 text-xs font-bold text-primary hover:border-secondary hover:text-secondary-700 transition-all shadow-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary-50 text-primary">📅</span>
              <span>Open Diary</span>
            </Link>
            <Link
              href="/dashboard/barbers"
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 text-xs font-bold text-primary hover:border-secondary hover:text-secondary-700 transition-all shadow-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-secondary-50 text-secondary">✂️</span>
              <span>Manage Barbers</span>
            </Link>
            <Link
              href="/dashboard/services"
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 text-xs font-bold text-primary hover:border-secondary hover:text-secondary-700 transition-all shadow-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-50 text-amber-700">🏷️</span>
              <span>Price List</span>
            </Link>
            <Link
              href="/"
              target="_blank"
              className="flex items-center gap-2.5 rounded-xl border border-slate-200/80 bg-white p-3 text-xs font-bold text-primary hover:border-secondary hover:text-secondary-700 transition-all shadow-sm"
            >
              <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-slate-100 text-slate-700">🌐</span>
              <span>View Live Site ↗</span>
            </Link>
          </div>

          {stats.total > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {APPOINTMENT_STATUSES.filter(
                (status) => (stats.byStatus.get(status) ?? 0) > 0,
              ).map((status) => (
                <span key={status} className="inline-flex items-center gap-1.5">
                  <StatusPill status={status} />
                  <Badge tone="neutral" className="tabular-nums">
                    {stats.byStatus.get(status)}
                  </Badge>
                </span>
              ))}
            </div>
          )}

          <Card>
            <CardHeader className="flex-row items-center justify-between gap-3">
              <CardTitle>Running order</CardTitle>
              {isRefreshing && (
                <span className="text-xs font-semibold text-slate-500">
                  Refreshing…
                </span>
              )}
            </CardHeader>
            <CardContent>
              {appointments.length === 0 ? (
                <EmptyState
                  title="Nothing booked today"
                  description="When bookings come in they will appear here in time order."
                  action={
                    <Link
                      href="/dashboard/appointments"
                      className={buttonClasses({ variant: "outline" })}
                    >
                      Check another day
                    </Link>
                  }
                />
              ) : (
                <AppointmentTimeline appointments={appointments} />
              )}
            </CardContent>
          </Card>

          {/*
            A load failure on a REFRESH keeps the stale day on screen (that is
            the point of `useAdminData`), so the failure has to be said out loud
            here — otherwise the admin is looking at old data believing it fresh.
          */}
          {error && (
            <p
              role="alert"
              className="rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm font-semibold text-danger"
            >
              Couldn&rsquo;t refresh: {error}
            </p>
          )}
        </div>
      )}
    </>
  );
}
