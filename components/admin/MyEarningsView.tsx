"use client";

import { useMemo, useState } from "react";

import { LoadError, PageHeader } from "@/components/admin/PageHeader";
import { Badge, Card, EmptyState, Loader } from "@/components/ui";
import { getMyEarnings, type DateRange } from "@/lib/api/commissions";
import { useAdminData } from "@/lib/admin/useAdminData";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { formatDateLong, toDateString } from "@/lib/utils/time";
import { formatCommissionRate } from "./CommissionDialog";

/** A signed-in worker's own commission: online bookings and walk-ins. Read-only. */

type Preset = "month" | "all";

function rangeOf(preset: Preset): DateRange {
  if (preset === "all") return {};
  const now = new Date();
  return {
    from: toDateString(new Date(now.getFullYear(), now.getMonth(), 1)),
    to: toDateString(new Date(now.getFullYear(), now.getMonth() + 1, 0)),
  };
}

export function MyEarningsView() {
  const [preset, setPreset] = useState<Preset>("month");
  const range = useMemo(() => rangeOf(preset), [preset]);
  const { data, error, isLoading, refresh } = useAdminData(
    (signal) => getMyEarnings(range, { signal }),
    [range.from, range.to],
  );

  return (
    <>
      <PageHeader title="My earnings" description="Commission on your completed online bookings and walk-ins." />
      <div role="group" aria-label="Date range" className="mb-4 flex gap-2">
        {(["month", "all"] as const).map((p) => (
          <button
            key={p}
            type="button"
            aria-pressed={preset === p}
            onClick={() => setPreset(p)}
            className={cn(
              "min-h-9 rounded-full px-3.5 py-1.5 text-sm font-semibold ring-1 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-secondary",
              preset === p ? "bg-primary text-primary-foreground ring-primary" : "bg-surface text-primary ring-slate-200",
            )}
          >
            {p === "month" ? "This month" : "All time"}
          </button>
        ))}
      </div>

      {isLoading && <Loader label="Loading your earnings…" />}
      {error && !data && <LoadError message={error} onRetry={refresh} />}

      {data && (
        <>
          <Card className="mb-5 grid grid-cols-2 gap-4 rounded-2xl p-5 sm:grid-cols-4">
            {[
              ["Rate", formatCommissionRate(data.worker)],
              ["Owed to you", formatPrice(data.worker.pendingCommission)],
              ["Paid", formatPrice(data.worker.paidCommission)],
              ["Visits", `${data.worker.onlineCount} online · ${data.worker.walkInCount} walk-in`],
            ].map(([label, value]) => (
              <div key={label} className="min-w-0">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
                <p className="mt-0.5 text-sm font-bold text-primary">{value}</p>
              </div>
            ))}
          </Card>

          {data.commissions.length === 0 ? (
            <EmptyState title="Nothing yet" description="Commission appears here once your visits are completed." />
          ) : (
            <ul className="space-y-2">
              {data.commissions.map((c) => (
                <li key={c.id}>
                  <Card className="flex flex-wrap items-center justify-between gap-3 rounded-xl p-4">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-bold text-primary">{c.serviceName}</p>
                      <p className="text-xs text-slate-500">
                        {formatDateLong(c.date)} · {c.source === "WALK_IN" ? "Walk-in" : "Online"} · {formatPrice(c.serviceAmount)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-extrabold text-primary">{formatPrice(c.commissionAmount)}</span>
                      <Badge tone={c.status === "PAID" ? "success" : "warning"}>{c.status === "PAID" ? "Paid" : "Owed"}</Badge>
                    </div>
                  </Card>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </>
  );
}
