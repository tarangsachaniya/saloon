"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { ConfirmDialog } from "@/components/admin/ConfirmDialog";
import { PlusIcon, RefreshIcon } from "@/components/admin/icons";
import { LoadError, PageHeader } from "@/components/admin/PageHeader";
import { ServiceFormDialog } from "@/components/admin/ServiceFormDialog";
import { ToastViewport, useToasts } from "@/components/admin/Toast";
import {
  Badge,
  Button,
  EmptyState,
  Loader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui";
import { deleteService, getAdminServices, updateService } from "@/lib/api";
import { toErrorMessage, useAdminData } from "@/lib/admin/useAdminData";
import type { Service } from "@/lib/booking/types";
import { cn } from "@/lib/utils/cn";
import { formatPrice } from "@/lib/utils/format";
import { formatDuration } from "@/lib/utils/time";
import { getServiceImageUrl } from "@/lib/utils/barberImages";

/**
 * The service catalogue.
 *
 * "Deactivate", not "Delete", is the primary destructive action: the backend
 * refuses to hard-delete anything with appointment history (409), and a salon's
 * services almost always have history. Deactivating hides a service from the
 * booking wizard while leaving every past appointment's price and duration
 * intact — which is what an admin retiring a service actually wants.
 */
export default function ServicesPage() {
  const { toasts, push, dismiss } = useToasts();

  const { data, error, isLoading, isRefreshing, refresh } = useAdminData(
    (signal) => getAdminServices({ signal }),
    [],
  );

  const [editing, setEditing] = useState<Service | null>(null);
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [confirmTarget, setConfirmTarget] = useState<Service | null>(null);
  const [confirmError, setConfirmError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);

  const services = useMemo(() => data ?? [], [data]);
  const activeCount = services.filter((service) => service.isActive).length;

  function openCreate() {
    setEditing(null);
    setIsFormOpen(true);
  }

  function openEdit(service: Service) {
    setEditing(service);
    setIsFormOpen(true);
  }

  async function deactivate() {
    if (!confirmTarget) return;
    setPendingId(confirmTarget.id);
    setConfirmError(null);
    try {
      // Soft delete — the default. `hard: true` is not offered anywhere in the
      // UI because the backend rejects it for anything with history, and a
      // button that usually 409s is worse than no button.
      await deleteService(confirmTarget.id);
      push("success", `${confirmTarget.name} deactivated.`);
      setConfirmTarget(null);
      refresh();
    } catch (cause) {
      setConfirmError(toErrorMessage(cause));
    } finally {
      setPendingId(null);
    }
  }

  async function reactivate(service: Service) {
    setPendingId(service.id);
    try {
      await updateService(service.id, { isActive: true });
      push("success", `${service.name} is bookable again.`);
      refresh();
    } catch (cause) {
      push("danger", toErrorMessage(cause));
    } finally {
      setPendingId(null);
    }
  }

  return (
    <>
      <PageHeader
        title="Services"
        description={
          data
            ? `${activeCount} bookable${
                services.length > activeCount
                  ? `, ${services.length - activeCount} inactive`
                  : ""
              }`
            : "The salon's price list."
        }
        actions={
          <>
            <Button
              variant="outline"
              onClick={refresh}
              isLoading={isRefreshing}
              leftIcon={<RefreshIcon className="h-4 w-4" />}
            >
              Refresh
            </Button>
            <Button onClick={openCreate} leftIcon={<PlusIcon className="h-4 w-4" />}>
              Add service
            </Button>
          </>
        }
      />

      {isLoading && <Loader label="Loading services…" />}

      {error && !data && <LoadError message={error} onRetry={refresh} />}

      {data && services.length === 0 && (
        <EmptyState
          title="No services yet"
          description="Add the first service to open the booking wizard for customers."
          action={<Button onClick={openCreate}>Add service</Button>}
        />
      )}

      {data && services.length > 0 && (
        <>
          {/* Desktop table */}
          <TableScroll className="hidden sm:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Service</TableHeaderCell>
                  <TableHeaderCell>Category</TableHeaderCell>
                  <TableHeaderCell className="text-right">Duration</TableHeaderCell>
                  <TableHeaderCell className="text-right">Price</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {services.map((service) => (
                  <TableRow key={service.id} muted={!service.isActive}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <div className="relative h-10 w-10 shrink-0 overflow-hidden rounded-xl bg-slate-100 ring-1 ring-slate-200">
                          <Image
                            src={getServiceImageUrl(service.category, service.name)}
                            alt=""
                            fill
                            sizes="40px"
                            className="object-cover"
                          />
                        </div>
                        <div>
                          <span className="block font-bold text-primary">{service.name}</span>
                          {service.description && (
                            <span className="block max-w-sm truncate text-xs text-slate-500">
                              {service.description}
                            </span>
                          )}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {service.category ? (
                        <span className="inline-block rounded-md bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-700">
                          {service.category}
                        </span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right tabular-nums">
                      {formatDuration(service.durationMinutes)}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-right font-semibold tabular-nums">
                      {formatPrice(service.price)}
                    </TableCell>
                    <TableCell>
                      <Badge tone={service.isActive ? "success" : "neutral"}>
                        {service.isActive ? "Bookable" : "Inactive"}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <div className="flex justify-end gap-1.5">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openEdit(service)}
                        >
                          Edit
                        </Button>
                        {service.isActive ? (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="text-danger hover:bg-red-50"
                            disabled={pendingId === service.id}
                            onClick={() => {
                              setConfirmError(null);
                              setConfirmTarget(service);
                            }}
                          >
                            Deactivate
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={pendingId === service.id}
                            onClick={() => reactivate(service)}
                          >
                            Reactivate
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>

          {/* Mobile cards */}
          <ul className="flex flex-col gap-3 sm:hidden">
            {services.map((service) => (
              <li
                key={service.id}
                className={cn(
                  "rounded-card border border-slate-200 bg-surface p-4 shadow-card",
                  !service.isActive && "opacity-70",
                )}
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-primary">
                      {service.name}
                    </p>
                    <p className="text-sm text-slate-600">
                      {formatDuration(service.durationMinutes)} ·{" "}
                      {formatPrice(service.price)}
                      {service.category ? ` · ${service.category}` : ""}
                    </p>
                  </div>
                  <Badge tone={service.isActive ? "success" : "neutral"}>
                    {service.isActive ? "Bookable" : "Inactive"}
                  </Badge>
                </div>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openEdit(service)}
                  >
                    Edit
                  </Button>
                  {service.isActive ? (
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-danger hover:bg-red-50"
                      disabled={pendingId === service.id}
                      onClick={() => {
                        setConfirmError(null);
                        setConfirmTarget(service);
                      }}
                    >
                      Deactivate
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pendingId === service.id}
                      onClick={() => reactivate(service)}
                    >
                      Reactivate
                    </Button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {error && data && (
        <p
          role="alert"
          className="mt-4 rounded-lg border border-danger/30 bg-red-50 px-3 py-2 text-sm font-semibold text-danger"
        >
          Couldn&rsquo;t refresh: {error}
        </p>
      )}

      <ServiceFormDialog
        service={editing}
        open={isFormOpen}
        onOpenChange={setIsFormOpen}
        onSaved={(saved, message) => {
          setIsFormOpen(false);
          push("success", `${saved.name} — ${message.toLowerCase()}`);
          refresh();
        }}
      />

      <ConfirmDialog
        open={confirmTarget !== null}
        onOpenChange={(open) => {
          if (!open) {
            setConfirmTarget(null);
            setConfirmError(null);
          }
        }}
        title={`Deactivate ${confirmTarget?.name ?? "this service"}?`}
        description="It disappears from the booking wizard immediately. Past and upcoming appointments keep it, and you can reactivate it at any time."
        confirmLabel="Deactivate"
        cancelLabel="Keep it bookable"
        isPending={pendingId !== null && confirmTarget !== null}
        error={confirmError}
        onConfirm={deactivate}
      />

      <ToastViewport toasts={toasts} onDismiss={dismiss} />
    </>
  );
}
