"use client";

import { useEffect, useMemo, useState } from "react";
import { ClientDetailDialog } from "@/components/admin/ClientDetailDialog";
import { RefreshIcon, SearchIcon } from "@/components/admin/icons";
import { LoadError, PageHeader } from "@/components/admin/PageHeader";
import {
  Badge,
  Button,
  EmptyState,
  Input,
  Loader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeaderCell,
  TableRow,
  TableScroll,
} from "@/components/ui";
import { getClients } from "@/lib/api";
import { useAdminData } from "@/lib/admin/useAdminData";
import type { Client } from "@/lib/booking/types";
import { formatAdminDate } from "@/lib/admin/format";
import { initials } from "@/lib/utils/format";

/**
 * The client directory — read-only.
 *
 * There is no create/update/delete endpoint for clients: records are born from
 * a booking (`upsertClientByPhone`, keyed on phone number) and nothing else.
 * So this screen offers exactly what the API supports — search by name or
 * phone, and read one client's history — rather than an edit form that would
 * have nowhere to POST.
 *
 * The search runs SERVER-side (`?q=`) rather than filtering a cached list: the
 * backend matches name OR phone, caps at 100 rows, and a salon's directory
 * grows without bound. Filtering the first 100 client-side would quietly stop
 * finding people.
 */

const DEBOUNCE_MS = 300;

export default function ClientsPage() {
  const [query, setQuery] = useState("");
  const [debounced, setDebounced] = useState("");
  const [selected, setSelected] = useState<Client | null>(null);

  // One request per pause in typing, not one per keystroke.
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(query.trim()), DEBOUNCE_MS);
    return () => clearTimeout(timer);
  }, [query]);

  const { data, error, isLoading, isRefreshing, refresh } = useAdminData(
    (signal) => getClients(debounced || undefined, { signal }),
    [debounced],
  );

  const clients = useMemo(() => data ?? [], [data]);
  const isSearching = debounced.length > 0;

  return (
    <>
      <PageHeader
        title="Clients"
        description={
          data
            ? `${clients.length}${clients.length === 100 ? "+" : ""} ${
                clients.length === 1 ? "client" : "clients"
              }${isSearching ? ` matching “${debounced}”` : ""}`
            : "Everyone who has ever booked."
        }
        actions={
          <Button
            variant="outline"
            onClick={refresh}
            isLoading={isRefreshing}
            leftIcon={<RefreshIcon className="h-4 w-4" />}
          >
            Refresh
          </Button>
        }
      />

      <div className="mb-5 max-w-md">
        <Input
          type="search"
          label="Search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Name or phone number"
          leftIcon={<SearchIcon className="h-4 w-4" />}
          hint="Matches part of a name or a phone number."
        />
      </div>

      {isLoading && <Loader label="Loading clients…" />}

      {error && !data && <LoadError message={error} onRetry={refresh} />}

      {data && clients.length === 0 && (
        <EmptyState
          title={isSearching ? "No clients match that search" : "No clients yet"}
          description={
            isSearching
              ? "Try part of a name, or the last few digits of a phone number."
              : "Client records are created automatically when someone books."
          }
          action={
            isSearching && (
              <Button variant="outline" onClick={() => setQuery("")}>
                Clear search
              </Button>
            )
          }
        />
      )}

      {data && clients.length > 0 && (
        <>
          <TableScroll className="hidden sm:block">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeaderCell>Name</TableHeaderCell>
                  <TableHeaderCell>Phone</TableHeaderCell>
                  <TableHeaderCell>Email</TableHeaderCell>
                  <TableHeaderCell className="text-right">Visits</TableHeaderCell>
                  <TableHeaderCell>Last visit</TableHeaderCell>
                  <TableHeaderCell className="text-right">Actions</TableHeaderCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {clients.map((client) => (
                  <TableRow key={client.id}>
                    <TableCell>
                      <div className="flex items-center gap-2.5">
                        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 text-xs font-bold text-primary-700">
                          {initials(client.name)}
                        </span>
                        <span className="font-bold text-primary">{client.name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="whitespace-nowrap tabular-nums text-slate-700">
                      {client.phone}
                    </TableCell>
                    <TableCell className="text-slate-600">
                      {client.email ?? "—"}
                    </TableCell>
                    <TableCell className="text-right tabular-nums">
                      {client.totalVisits}
                    </TableCell>
                    <TableCell className="whitespace-nowrap text-slate-600">
                      {client.lastVisit ? (
                        formatAdminDate(client.lastVisit)
                      ) : (
                        <Badge tone="neutral">Never</Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setSelected(client)}
                      >
                        History
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableScroll>

          <ul className="flex flex-col gap-3 sm:hidden">
            {clients.map((client) => (
              <li
                key={client.id}
                className="rounded-card border border-slate-200 bg-surface p-4 shadow-card"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-base font-semibold text-primary">
                      {client.name}
                    </p>
                    <p className="text-sm tabular-nums text-slate-600">
                      {client.phone}
                    </p>
                    <p className="mt-1 text-xs text-slate-500">
                      {client.totalVisits}{" "}
                      {client.totalVisits === 1 ? "visit" : "visits"} · last{" "}
                      {client.lastVisit
                        ? formatAdminDate(client.lastVisit)
                        : "never"}
                    </p>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setSelected(client)}
                  >
                    History
                  </Button>
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

      <ClientDetailDialog
        clientId={selected?.id ?? null}
        fallback={selected}
        open={selected !== null}
        onOpenChange={(open) => !open && setSelected(null)}
      />
    </>
  );
}
