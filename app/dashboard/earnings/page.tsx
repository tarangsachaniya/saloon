"use client";

import { useMemo, useState } from "react";

import { formatCommissionRate } from "@/components/admin/CommissionDialog";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { MyEarningsView } from "@/components/admin/MyEarningsView";
import { RefreshIcon } from "@/components/admin/icons";
import { LoadError, PageHeader } from "@/components/admin/PageHeader";
import { ToastViewport, useToasts } from "@/components/admin/Toast";
import { Badge, Button, Card, EmptyState, Input } from "@/components/ui";
import {
  getCommissionHistory,
  getEarningsSummary,
  markCommissionPaid,
  type CommissionRecord,
  type CommissionSource,
  type DateRange,
  type WorkerEarnings,
} from "@/lib/api/commissions";
import { isApiError } from "@/lib/api";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import { useAuth } from "@/lib/auth/useAuth";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { formatDateLong, toDateString } from "@/lib/utils/time";
import { AdminCardGridSkeleton, AdminListSkeleton } from "@/components/loading/admin";

/**
 * Worker earnings (owner only). Totals and history come from the stored
 * commission rows, so a worker's rate changing today never rewrites what was
 * earned yesterday. Online bookings and walk-ins both earn commission.
 * Cards, not a wide table, so it holds on a phone.
 */

const SOURCE_LABEL: Record<CommissionSource, string> = { ONLINE: "Online", WALK_IN: "Walk-in" };

const SOURCE_FILTERS: { id: CommissionSource | "all"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "ONLINE", label: "Online" },
  { id: "WALK_IN", label: "Walk-in" },
];

type Preset = "all" | "today" | "week" | "month" | "custom";

const PRESETS: { id: Preset; label: string }[] = [
  { id: "all", label: "All time" },
  { id: "today", label: "Today" },
  { id: "week", label: "This week" },
  { id: "month", label: "This month" },
  { id: "custom", label: "Custom" },
];

function presetRange(preset: Preset, custom: DateRange): DateRange {
  const now = new Date();
  if (preset === "today") return { from: toDateString(now), to: toDateString(now) };
  if (preset === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - ((now.getDay() + 6) % 7)); // Monday
    const end = new Date(start);
    end.setDate(start.getDate() + 6);
    return { from: toDateString(start), to: toDateString(end) };
  }
  if (preset === "month") {
    return {
      from: toDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
      to: toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
    };
  }
  if (preset === "custom") return custom;
  return {};
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: "warn" | "ok" }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</dt>
      <dd className={cn("mt-0.5 truncate text-sm font-bold text-primary", tone === "warn" && "text-warning", tone === "ok" && "text-success")}>
        {value}
      </dd>
    </div>
  );
}

export default function EarningsPage() {
  const { user } = useAuth();
  const { toasts, push, dismiss } = useToasts();
  const [preset, setPreset] = useState<Preset>("month");
  const [custom, setCustom] = useState<DateRange>({});
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [payTarget, setPayTarget] = useState<CommissionRecord | null>(null);
  const [payError, setPayError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);
  const [source, setSource] = useState<CommissionSource | "all">("all");

  const range = useMemo(() => presetRange(preset, custom), [preset, custom]);
  const rangeInvalid = !!(range.from && range.to && range.from > range.to);
  const isOwner = user?.role === "OWNER";

  const summary = useAdminData(
    (signal) => (isOwner && !rangeInvalid ? getEarningsSummary(range, { signal }) : Promise.resolve([] as WorkerEarnings[])),
    [isOwner, range.from, range.to, rangeInvalid],
  );
  const history = useAdminData(
    (signal) =>
      selectedId && isOwner && !rangeInvalid
        ? getCommissionHistory(
            { barberId: selectedId, ...range, source: source === "all" ? undefined : source },
            { signal },
          )
        : Promise.resolve([] as CommissionRecord[]),
    [selectedId, isOwner, range.from, range.to, rangeInvalid, source],
  );

  const workers = summary.data ?? [];
  const selected = workers.find((w) => w.id === selectedId) ?? null;

  function refreshAll() {
    summary.refresh();
    history.refresh();
  }

  async function confirmPay() {
    if (!payTarget || paying) return;
    setPaying(true);
    setPayError(null);
    try {
      await markCommissionPaid(payTarget.id);
      push("success", "Commission marked as paid.");
      setPayTarget(null);
      refreshAll();
    } catch (error) {
      setPayError(isApiError(error) && error.status < 500 ? error.message : "We couldn't update that commission. Please try again.");
    } finally {
      setPaying(false);
    }
  }

  if (user && !isOwner && user.barberId) return <MyEarningsView />;
  if (user && !isOwner) {
    return (
      <>
        <PageHeader title="Worker earnings" />
        <EmptyState title="Owner access only" description="Commission and earnings are visible to the salon owner." />
      </>
    );
  }

  return (
    <>
      <PageHeader
        title="Worker earnings"
        description="What each worker has earned from completed online bookings and walk-ins."
        actions={
          <Button variant="outline" onClick={refreshAll} isLoading={summary.isRefreshing} leftIcon={<RefreshIcon className="h-4 w-4" />}>
            Refresh
          </Button>
        }
      />

      <div role="group" aria-label="Date range" className="mb-3 flex flex-wrap gap-2">
        {PRESETS.map((p) => (
          <button
            key={p.id}
            type="button"
            aria-pressed={preset === p.id}
            onClick={() => setPreset(p.id)}
            className={cn(
              "min-h-9 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
              preset === p.id ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-primary ring-slate-200 hover:bg-slate-50",
            )}
          >
            {p.label}
          </button>
        ))}
      </div>

      {preset === "custom" && (
        <div className="mb-4 grid max-w-md gap-3 sm:grid-cols-2">
          <Input label="From" type="date" value={custom.from ?? ""} onChange={(e) => setCustom((c) => ({ ...c, from: e.target.value || undefined }))} />
          <Input
            label="To"
            type="date"
            value={custom.to ?? ""}
            onChange={(e) => setCustom((c) => ({ ...c, to: e.target.value || undefined }))}
            error={rangeInvalid ? "The end date is before the start date." : undefined}
          />
        </div>
      )}

      {summary.isLoading && <AdminCardGridSkeleton count={3} label="Loading earnings…" />}
      {summary.error && !summary.data && <LoadError message={summary.error} onRetry={summary.refresh} />}

      {summary.data && workers.length === 0 && (
        <EmptyState title="No workers yet" description="Add a barber first; their earnings will appear here." />
      )}

      {summary.data && workers.length > 0 && (
        <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {workers.map((w) => (
            <li key={w.id} className="min-w-0">
              <Card className={cn("flex h-full flex-col rounded-2xl p-5", selectedId === w.id && "ring-2 ring-secondary")}>
                <div className="flex items-start justify-between gap-2">
                  <p className="min-w-0 truncate text-base font-bold text-primary">{w.name}</p>
                  {!w.isActive && <Badge tone="neutral">Inactive</Badge>}
                </div>
                <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-3">
                  <Stat label="Completed services" value={String(w.completedServices)} />
                  <Stat label="Commission rate" value={formatCommissionRate(w)} />
                  <Stat label="Online" value={String(w.onlineCount)} />
                  <Stat label="Walk-in" value={String(w.walkInCount)} />
                  <Stat label="Service amount" value={formatPrice(w.totalServiceAmount)} />
                  <Stat label="Total commission" value={formatPrice(w.totalCommission)} />
                  <Stat label="Pending" value={formatPrice(w.pendingCommission)} tone={w.pendingCommission > 0 ? "warn" : undefined} />
                  <Stat label="Paid" value={formatPrice(w.paidCommission)} tone={w.paidCommission > 0 ? "ok" : undefined} />
                </dl>
                <div className="mt-4">
                  <Button size="sm" variant={selectedId === w.id ? "secondary" : "outline"} onClick={() => setSelectedId(selectedId === w.id ? null : w.id)}>
                    {selectedId === w.id ? "Hide history" : "View history"}
                  </Button>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}

      {selected && (
        <section aria-label={`Commission history for ${selected.name}`} className="mt-6">
          <h2 className="mb-3 text-lg font-extrabold">Commission history · {selected.name}</h2>
          <div role="group" aria-label="Booking source" className="mb-3 flex flex-wrap gap-2">
            {SOURCE_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={source === f.id}
                onClick={() => setSource(f.id)}
                className={cn(
                  "min-h-9 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 transition-colors focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
                  source === f.id ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-primary ring-slate-200 hover:bg-slate-50",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
          {history.isLoading && <AdminListSkeleton rows={3} label="Loading commission history…" />}
          {history.error && !history.data && <LoadError message={history.error} onRetry={history.refresh} />}
          {history.data && history.data.length === 0 && (
            <EmptyState
              title="No commission records yet"
              description="Commission will appear after completed appointments in this period."
            />
          )}
          {history.data && history.data.length > 0 && (
            <ul className="space-y-2">
              {history.data.map((c) => (
                <li key={c.id}>
                  <Card className="flex flex-wrap items-center gap-x-6 gap-y-2 rounded-xl p-4">
                    <div className="min-w-[8rem] flex-1">
                      <p className="truncate text-sm font-bold text-primary">{c.serviceName}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateLong(c.date)} · {SOURCE_LABEL[c.source]}
                      </p>
                    </div>
                    <dl className="flex flex-wrap gap-x-6 gap-y-1">
                      <Stat label="Amount" value={formatPrice(c.serviceAmount)} />
                      <Stat
                        label="Rate"
                        value={
                          c.commissionType === "FLAT"
                            ? `${formatPrice(c.flatAmount)} × ${c.serviceCount}`
                            : `${c.commissionPercentage}%`
                        }
                      />
                      <Stat label="Commission" value={formatPrice(c.commissionAmount)} />
                    </dl>
                    <div className="flex items-center gap-2">
                      <Badge tone={c.status === "PAID" ? "success" : "warning"}>{c.status === "PAID" ? "Paid" : "Pending"}</Badge>
                      {c.status === "PENDING" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setPayError(null);
                            setPayTarget(c);
                          }}
                        >
                          Mark as paid
                        </Button>
                      )}
                    </div>
                  </Card>
                </li>
              ))}
              {history.data.length >= 200 && <p className="text-xs text-slate-500">Showing the latest 200 records. Narrow the date range to see others.</p>}
            </ul>
          )}
        </section>
      )}

      {summary.error && summary.data && (
        <p role="alert" className="mt-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm font-semibold text-danger">
          Couldn&rsquo;t refresh: {toErrorMessage(summary.error)}
        </p>
      )}

      <ConfirmDialog
        open={!!payTarget}
        onOpenChange={(open) => !open && !paying && setPayTarget(null)}
        title="Mark commission as paid?"
        description={
          payTarget
            ? `${formatPrice(payTarget.commissionAmount)} for ${payTarget.serviceName} on ${formatDateLong(payTarget.date)} will be recorded as paid. This can't be undone.`
            : ""
        }
        confirmLabel="Mark as paid"
        cancelLabel="Not yet"
        variant="primary"
        isPending={paying}
        error={payError}
        onConfirm={confirmPay}
      />
      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
