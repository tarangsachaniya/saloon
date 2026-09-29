import { get, patch, post } from "./client";
import type { RequestOptions } from "./client";
import type { ThemeId } from "@/lib/themes";

/** Client for `/api/platform/*` (SUPER_ADMIN only). Decimals arrive as strings. */

export type PlanType = "MONTHLY" | "COMMISSION";
export type CommissionType = "PERCENT" | "FLAT";

export type PlanInput =
  | { planType: "MONTHLY"; monthlyFee: number }
  | { planType: "COMMISSION"; commissionType: CommissionType; commissionValue: number };

export interface PlanRow {
  id: string;
  planType: PlanType;
  monthlyFee: string | null;
  commissionType: CommissionType | null;
  commissionValue: string | null;
  effectiveFrom: string;
  summary: string;
  status?: "CURRENT" | "SCHEDULED" | "PAST";
}

export interface PlatformSalonRow {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  address: string | null;
  isActive: boolean;
  theme: ThemeId;
  accentColor: string | null;
  createdAt: string;
  owner: { firstName: string; lastName: string | null; email: string } | null;
  plan: PlanRow | null;
  counts: { appointments: number; barbers: number; services: number };
}

export interface PlatformSalonDetail {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  about: string | null;
  phone: string | null;
  email: string | null;
  address: string | null;
  mapUrl: string | null;
  isActive: boolean;
  theme: ThemeId;
  accentColor: string | null;
  createdAt: string;
  team: { id: string; firstName: string; lastName: string | null; email: string; role: string; enabled: boolean }[];
  counts: { appointments: number; barbers: number; services: number; clients: number };
  plans: PlanRow[];
}

export interface SalonProfileInput {
  name: string;
  slug: string;
  tagline?: string | null;
  about?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  mapUrl?: string | null;
  theme: ThemeId;
  accentColor?: string | null;
}

export interface CreateSalonInput {
  salon: SalonProfileInput;
  owner: { firstName: string; lastName?: string | null; email: string; phoneNumber?: string | null };
  plan: PlanInput;
}

export interface Credentials {
  email: string;
  temporaryPassword: string;
}

export async function listPlatformSalons(options?: RequestOptions) {
  const data = await get<{ salons: PlatformSalonRow[] }>("/platform/salons", options);
  return data.salons;
}

export async function getPlatformSalon(id: string, options?: RequestOptions) {
  const data = await get<{ salon: PlatformSalonDetail }>(`/platform/salons/${encodeURIComponent(id)}`, options);
  return data.salon;
}

export function createPlatformSalon(input: CreateSalonInput) {
  return post<{ salon: { id: string; slug: string; name: string }; credentials: Credentials }>(
    "/platform/salons",
    input,
  );
}

export async function updatePlatformSalon(id: string, input: Partial<SalonProfileInput> & { isActive?: boolean }) {
  const data = await patch<{ salon: PlatformSalonDetail }>(`/platform/salons/${encodeURIComponent(id)}`, input);
  return data.salon;
}

export function changePlatformPlan(id: string, plan: PlanInput, effectiveFrom?: string) {
  return post<{ plan: PlanRow }>(`/platform/salons/${encodeURIComponent(id)}/plan`, { plan, effectiveFrom });
}

export async function resetOwnerPassword(id: string) {
  const data = await post<{ credentials: Credentials }>(
    `/platform/salons/${encodeURIComponent(id)}/owner-password`,
  );
  return data.credentials;
}

/** `{ "salon.slug": "…" }` from a 400 response, for inline field errors. */
export function fieldErrorsOf(error: unknown): Record<string, string> {
  const payload = (error as { payload?: { fieldErrors?: Record<string, string> } })?.payload;
  return payload?.fieldErrors ?? {};
}
