import { get } from "./client";
import { normalizeAppointment } from "./normalize";
import type { Client } from "@/lib/booking/types";
import type { RequestOptions } from "./client";

/**
 * `GET /api/dashboard/clients?q=` — search the client directory.
 * `q` matches name or phone server-side; omit it for the full list.
 */
export async function getClients(
  q?: string,
  options?: RequestOptions,
): Promise<Client[]> {
  const data = await get<{ success: true; clients: Client[] }>(
    "/dashboard/clients",
    {
      ...options,
      query: { q, ...options?.query },
    },
  );
  return data.clients;
}

/**
 * `GET /api/dashboard/clients/:id` — the client record plus their full
 * appointment history. The backend returns `{client, appointments}` as
 * siblings; this merges them into one object matching `Client.appointments`.
 *
 * The history runs through `normalizeAppointment` (added in M6). Without it
 * these appointments arrive with `price` as a Decimal string and
 * `appointmentDate` as a full ISO datetime — every OTHER appointment reader
 * already normalised, so a client's history was the one place where a visit
 * total would string-concatenate and a date would render "Invalid Date".
 */
export async function getClient(
  id: string,
  options?: RequestOptions,
): Promise<Client> {
  const data = await get<{
    success: true;
    client: Client;
    appointments: Client["appointments"];
  }>(`/dashboard/clients/${encodeURIComponent(id)}`, options);
  return {
    ...data.client,
    appointments: (data.appointments ?? []).map(normalizeAppointment),
  };
}
